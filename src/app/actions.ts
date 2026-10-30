"use server";

import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canCancel, createBooking, getSettings } from "@/lib/booking";
import { prisma } from "@/lib/db";
import { setFlash } from "@/lib/flash";
import { baseUsername, deletedAccount } from "@/lib/people";
import {
  forgetPendingEmail,
  getCurrentUser,
  pendingEmail,
  rememberPendingEmail,
  requireUser,
  requireVerifiedUser,
} from "@/lib/session";
import { appUrl, supabaseAdmin, supabaseServer } from "@/lib/supabase";
import { clearFailures, clientIp, isThrottled, recordFailure } from "@/lib/throttle";
import { isValidDay } from "@/lib/time";

// `values` echoes the submitted fields (never the password) so the form can
// be refilled after an error; `notice` is a success message shown in place.
export type FormState = { error?: string; notice?: string; values?: Record<string, string> } | undefined;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROOM_RE = /^[A-Za-z0-9 /-]{1,10}$/;
const MIN_PASSWORD = 8;
const TOO_MANY_EMAILS = "Sono state inviate troppe email in poco tempo. Riprova più tardi (può volerci fino a un'ora); se il problema continua, contatta l'amministratore.";

// Registration codes are compared without case, spaces or dashes.
const normalizeCode = (code: string) => code.replace(/[\s-]/g, "").toUpperCase();

// Where the links in Supabase's emails land (see src/app/auth/conferma).
const confirmUrl = (next?: string) => `${appUrl()}/auth/conferma${next ? `?next=${encodeURIComponent(next)}` : ""}`;

// Accepts either the email address or the username (surname.name).
async function emailFor(identifier: string) {
  if (identifier.includes("@")) return identifier;
  const user = await prisma.user.findUnique({ where: { username: identifier }, select: { email: true } });
  return user?.email ?? null;
}

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const identifier = String(formData.get("identifier") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const email = await emailFor(identifier);
  const attempt = { kind: "LOGIN" as const, ip: await clientIp(), account: email ?? identifier };
  const wrong = async (): Promise<FormState> => {
    await recordFailure(attempt);
    return { error: "Credenziali non corrette.", values: { identifier } };
  };

  if (await isThrottled(attempt)) {
    return { error: "Troppi tentativi non riusciti. Riprova tra un quarto d'ora.", values: { identifier } };
  }
  if (!email) return wrong();

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error?.code === "email_not_confirmed") {
    await rememberPendingEmail(email);
    redirect("/verifica-email");
  }
  if (error?.code === "invalid_credentials") return wrong();
  if (error || !data.user) {
    console.error("Accesso non riuscito", error);
    return { error: "Accesso non riuscito. Riprova tra qualche minuto.", values: { identifier } };
  }

  // An Auth account without a resident profile (e.g. created by hand in the
  // Supabase dashboard) cannot use the app.
  if (!(await prisma.user.findUnique({ where: { authId: data.user.id }, select: { id: true } }))) {
    await supabase.auth.signOut();
    return { error: "Questo account non è registrato nella lavanderia. Contatta l'amministratore.", values: { identifier } };
  }
  await clearFailures(attempt);
  redirect("/prenota");
}

export async function register(_: FormState, formData: FormData): Promise<FormState> {
  const values = {
    firstName: String(formData.get("firstName") ?? "").trim(),
    lastName: String(formData.get("lastName") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    room: String(formData.get("room") ?? "").trim(),
  };
  const password = String(formData.get("password") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  const acceptedRules = formData.get("rules") === "si";
  const fail = (error: string): FormState => ({ error, values });
  const taken = "Esiste già un account con questa email.";

  if (values.firstName.length < 1 || values.firstName.length > 40) return fail("Inserisci il tuo nome.");
  if (values.lastName.length < 1 || values.lastName.length > 40) return fail("Inserisci il tuo cognome.");
  if (!EMAIL_RE.test(values.email)) return fail("Inserisci un indirizzo email valido.");
  if (password.length < MIN_PASSWORD) return fail(`La password deve avere almeno ${MIN_PASSWORD} caratteri.`);
  if (!ROOM_RE.test(values.room)) return fail("Inserisci il numero della tua stanza.");
  if (!acceptedRules) return fail("Per registrarti devi accettare il regolamento.");

  const settings = await getSettings();
  if (settings.registrationCode) {
    const attempt = { kind: "CODE" as const, ip: await clientIp() };
    if (await isThrottled(attempt)) {
      return fail("Troppi codici di registrazione errati. Riprova tra un'ora o chiedi il codice all'amministratore.");
    }
    if (normalizeCode(code) !== normalizeCode(settings.registrationCode)) {
      await recordFailure(attempt);
      return fail("Codice di registrazione non corretto. Chiedilo all'amministratore.");
    }
  }
  if (await prisma.user.findUnique({ where: { email: values.email } })) return fail(taken);

  // The User row is created by a trigger on auth.users, in the same transaction
  // as the Supabase account, from this validated row (see PendingSignup in
  // prisma/schema.prisma): the two can't end up one without the other.
  const token = randomBytes(32).toString("hex");
  await prisma.pendingSignup.create({
    data: {
      token,
      email: values.email,
      firstName: values.firstName,
      lastName: values.lastName,
      room: values.room,
      rulesAcceptedAt: new Date(),
    },
  });

  // Supabase stores the password and sends the confirmation email.
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email: values.email,
    password,
    options: { emailRedirectTo: confirmUrl(), data: { signup_token: token } },
  });
  // The trigger has used the row if the account was created; otherwise it's no longer needed.
  await prisma.pendingSignup.deleteMany({ where: { token } });
  if (error?.code === "weak_password") return fail("Password troppo debole: scegline una più lunga o meno comune.");
  if (error?.code === "user_already_exists" || error?.code === "email_exists") return fail(taken);
  // Supabase limits emails per address and per project (very low with its
  // built-in email service), so the wait can last up to an hour.
  if (error?.code === "over_email_send_rate_limit" || error?.status === 429) return fail(TOO_MANY_EMAILS);
  // Supabase refuses addresses it considers undeliverable, and its built-in
  // email service only sends to the project's team until custom SMTP is set.
  if (error?.code === "email_address_invalid") {
    return fail("Questo indirizzo email non è accettato. Usa un indirizzo reale a cui puoi ricevere posta.");
  }
  if (error?.code === "email_address_not_authorized") {
    return fail("Per ora non possiamo inviare email a questo indirizzo. Contatta l'amministratore.");
  }
  if (error?.code === "signup_disabled" || error?.code === "email_provider_disabled") {
    return fail("Le registrazioni sono chiuse al momento. Contatta l'amministratore.");
  }
  if (error) {
    console.error("Registrazione non riuscita", error);
    return fail("Registrazione non riuscita. Riprova più tardi.");
  }
  // With email confirmation on, Supabase answers an existing address with a
  // user that has no identities instead of an error.
  if (!data.user || data.user.identities?.length === 0) return fail(taken);
  // Supabase reuses an unconfirmed account left without a profile by older
  // versions of the app, and then the trigger doesn't run.
  if (!(await prisma.user.findUnique({ where: { authId: data.user.id }, select: { id: true } }))) {
    console.error("Account Supabase senza profilo", data.user.id);
    return fail("Questa email ha un account incompleto. Contatta l'amministratore per eliminarlo, poi riprova.");
  }

  // No session means Supabase is waiting for the email to be confirmed.
  if (data.session) redirect("/prenota");
  await rememberPendingEmail(values.email);
  redirect("/verifica-email");
}

export async function resendVerification() {
  const user = await getCurrentUser();
  if (user?.emailVerifiedAt) redirect("/prenota");
  const email = user?.email ?? (await pendingEmail());
  if (!email) redirect("/login");

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: confirmUrl() } });
  if (error?.code === "over_email_send_rate_limit" || error?.status === 429) await setFlash("attendi");
  else if (error) {
    console.error("Invio email di verifica non riuscito", error);
    await setFlash("invio-fallito");
  } else await setFlash("email-inviata");
  redirect("/verifica-email");
}

export async function logout() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  await forgetPendingEmail();
  redirect("/login");
}

// Always answers the same way, so the form does not reveal who has an account.
export async function requestPasswordReset(_: FormState, formData: FormData): Promise<FormState> {
  const identifier = String(formData.get("identifier") ?? "").trim().toLowerCase();
  const email = await emailFor(identifier);
  if (email) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: confirmUrl("/nuova-password") });
    if (error?.code === "over_email_send_rate_limit" || error?.status === 429) {
      return { error: TOO_MANY_EMAILS, values: { identifier } };
    }
    if (error) console.error("Invio email di recupero non riuscito", error);
  }
  return {
    notice: "Se l'account esiste, ti abbiamo inviato un'email con il link per scegliere una nuova password.",
    values: { identifier },
  };
}

// Checks the "password" and "confirm" fields and saves the new password;
// returns the error to show, if any.
async function saveNewPassword(formData: FormData): Promise<string | null> {
  const password = String(formData.get("password") ?? "");
  if (password.length < MIN_PASSWORD) return `La password deve avere almeno ${MIN_PASSWORD} caratteri.`;
  if (password !== formData.get("confirm")) return "Le due password non coincidono.";

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.updateUser({ password });
  if (error?.code === "same_password") return "Scegli una password diversa da quella attuale.";
  if (error?.code === "weak_password") return "Password troppo debole: scegline una più lunga o meno comune.";
  if (error) {
    console.error("Cambio password non riuscito", error);
    return "Non è stato possibile cambiare la password. Riprova più tardi.";
  }
  return null;
}

// Reached from the password-reset email, which signs the user in.
export async function updatePassword(_: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const error = await saveNewPassword(formData);
  if (error) return { error };
  await setFlash("password-aggiornata");
  redirect("/prenota");
}

// The account page asks for the current password before changing the password
// or deleting the account. Wrong guesses count like failed logins.
async function checkPassword(email: string, password: string): Promise<string | null> {
  const attempt = { kind: "LOGIN" as const, ip: await clientIp(), account: email };
  if (await isThrottled(attempt)) return "Troppi tentativi non riusciti. Riprova tra un quarto d'ora.";
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error?.code === "invalid_credentials") {
    await recordFailure(attempt);
    return "La password attuale non è corretta.";
  }
  if (error) {
    console.error("Verifica password non riuscita", error);
    return "Operazione non riuscita. Riprova tra qualche minuto.";
  }
  await clearFailures(attempt);
  return null;
}

export async function updateProfile(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireVerifiedUser();
  const values = {
    firstName: String(formData.get("firstName") ?? "").trim(),
    lastName: String(formData.get("lastName") ?? "").trim(),
    room: String(formData.get("room") ?? "").trim(),
  };
  const fail = (error: string): FormState => ({ error, values });
  // Admins needn't live in the building: the first one is created without surname or room.
  const optional = user.role === "ADMIN";
  if (values.firstName.length < 1 || values.firstName.length > 40) return fail("Inserisci il tuo nome.");
  if ((!optional && values.lastName.length < 1) || values.lastName.length > 40) return fail("Inserisci il tuo cognome.");
  if (!(optional && !values.room) && !ROOM_RE.test(values.room)) return fail("Inserisci il numero della tua stanza.");

  // The username follows the name (surname.name), picked by the same database
  // function as at sign-up; it only changes if the name really does.
  let username = user.username;
  if (username && baseUsername(values) !== baseUsername(user)) {
    const [row] = await prisma.$queryRaw<{ username: string }[]>`
      SELECT private.available_username(${values.firstName}, ${values.lastName}) AS username`;
    username = row.username;
  }
  try {
    await prisma.user.update({ where: { id: user.id }, data: { ...values, room: values.room || null, username } });
  } catch (e) {
    // Someone with the same name took that username at the same moment.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return fail("Non è stato possibile salvare. Riprova.");
    }
    throw e;
  }
  revalidatePath("/", "layout");
  return {
    notice:
      username === user.username ? "Dati salvati." : `Dati salvati. Il tuo nuovo username per accedere è ${username}.`,
    values,
  };
}

// Supabase sends a confirmation link to the new address (and, with "secure
// email change", one to the old address too); the address changes once it
// has been opened. getCurrentUser then copies it to the User row.
export async function changeEmail(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireVerifiedUser();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const values = { email };
  const taken = "Esiste già un account con questa email.";
  if (!EMAIL_RE.test(email)) return { error: "Inserisci un indirizzo email valido.", values };
  if (email === user.email) return { error: "È già il tuo indirizzo email.", values };
  if (await prisma.user.findUnique({ where: { email } })) return { error: taken, values };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: confirmUrl("/account") });
  if (error?.code === "email_exists" || error?.code === "user_already_exists") return { error: taken, values };
  if (error?.code === "over_email_send_rate_limit" || error?.status === 429) return { error: TOO_MANY_EMAILS, values };
  if (error?.code === "email_address_invalid") {
    return { error: "Questo indirizzo email non è accettato. Usa un indirizzo reale a cui puoi ricevere posta.", values };
  }
  if (error?.code === "email_address_not_authorized") {
    return { error: "Per ora non possiamo inviare email a questo indirizzo. Contatta l'amministratore.", values };
  }
  if (error) {
    console.error("Cambio email non riuscito", error);
    return { error: "Non è stato possibile cambiare l'email. Riprova più tardi.", values };
  }
  revalidatePath("/account");
  return {
    notice: `Ti abbiamo inviato un link a ${email}: aprilo per confermare il nuovo indirizzo. Se ne ricevi uno anche all'indirizzo attuale, apri anche quello.`,
  };
}

export async function changePassword(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireVerifiedUser();
  const wrong = await checkPassword(user.email, String(formData.get("current") ?? ""));
  if (wrong) return { error: wrong };
  const error = await saveNewPassword(formData);
  return error ? { error } : { notice: "Password aggiornata." };
}

// Future bookings are cancelled. An account with past bookings keeps its row
// for the laundry's history, without the personal details; one without any
// is deleted outright.
export async function deleteAccount(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const wrong = await checkPassword(user.email, String(formData.get("password") ?? ""));
  if (wrong) return { error: wrong };
  if (user.role === "ADMIN" && (await prisma.user.count({ where: { role: "ADMIN" } })) <= 1) {
    return {
      error: "Sei l'unico amministratore: nomina un altro admin dalla pagina Gestione prima di eliminare il tuo account.",
    };
  }

  const { error } = await supabaseAdmin().auth.admin.deleteUser(user.authId);
  if (error) {
    console.error("Eliminazione account non riuscita", error);
    return { error: "Non è stato possibile eliminare l'account. Riprova più tardi." };
  }
  await prisma.$transaction(async (tx) => {
    await tx.booking.deleteMany({ where: { userId: user.id, start: { gt: new Date() } } });
    if (await tx.booking.count({ where: { userId: user.id } })) {
      await tx.user.update({ where: { id: user.id }, data: deletedAccount(user.id) });
    } else {
      await tx.user.delete({ where: { id: user.id } });
    }
  });

  // The Auth account is gone; this just clears the session cookies.
  await (await supabaseServer()).auth.signOut({ scope: "local" });
  await forgetPendingEmail();
  await setFlash("account-eliminato");
  redirect("/login");
}

// Query string that brings the user back to the same day (and its week) and machine.
function bookingPageParams(formData: FormData) {
  const params = new URLSearchParams();
  const day = formData.get("day");
  const machineId = Number(formData.get("machineId"));
  if (isValidDay(day)) params.set("giorno", day);
  if (Number.isInteger(machineId) && machineId > 0) params.set("macchina", String(machineId));
  return params;
}

// Admins can also book for a resident (by username) and inside the notice window.
export async function book(formData: FormData) {
  const user = await requireVerifiedUser();
  const isAdmin = user.role === "ADMIN";
  const machineId = Number(formData.get("machineId"));
  const start = new Date(String(formData.get("start")));
  const params = bookingPageParams(formData);
  const go = async (esito: string) => {
    await setFlash(esito);
    redirect(params.size ? `/prenota?${params}` : "/prenota");
  };

  let userId = user.id;
  const forUsername = isAdmin ? String(formData.get("per") ?? "").trim().toLowerCase() : "";
  if (forUsername) {
    const target = await prisma.user.findUnique({ where: { username: forUsername }, select: { id: true } });
    if (!target) return go("utente-non-trovato");
    userId = target.id;
  }

  const result = await createBooking(userId, machineId, start, { byAdmin: isAdmin });
  await go(result === "limite" && userId !== user.id ? "limite-utente" : result);
}

// Owners can cancel their own bookings until the notice window starts; admins
// can cancel any booking until the shift starts (see canCancel).
export async function cancel(formData: FormData) {
  const user = await requireVerifiedUser();
  const id = Number(formData.get("bookingId"));
  const back = String(formData.get("back"));

  const target =
    back === "admin" && user.role === "ADMIN" ? "/admin" : back === "mie" ? "/mie-prenotazioni" : "/prenota";
  const params = target === "/prenota" ? bookingPageParams(formData) : new URLSearchParams();
  const go = async (esito: string) => {
    await setFlash(esito);
    redirect(params.size ? `${target}?${params}` : target);
  };

  const booking = Number.isInteger(id) ? await prisma.booking.findUnique({ where: { id } }) : null;
  if (!booking || (booking.userId !== user.id && user.role !== "ADMIN")) return go("non-trovata");
  // Once a shift has started it stays in the history.
  if (booking.start <= new Date()) return go("gia-iniziata");
  if (!canCancel(booking, user, await getSettings())) return go("contatta-admin");

  await prisma.booking.delete({ where: { id } });
  await go("annullata");
}
