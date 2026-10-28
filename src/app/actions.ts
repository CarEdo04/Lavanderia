"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { createBooking, getSettings } from "@/lib/booking";
import { prisma } from "@/lib/db";
import {
  forgetPendingEmail,
  getCurrentUser,
  pendingEmail,
  rememberPendingEmail,
  requireUser,
  requireVerifiedUser,
} from "@/lib/session";
import { appUrl, supabaseAdmin, supabaseServer } from "@/lib/supabase";
import { availableUsername } from "@/lib/usernames";
import { isValidDay } from "@/lib/time";

// `values` echoes the submitted fields (never the password) so the form can
// be refilled after an error; `notice` is a success message shown in place.
export type FormState = { error?: string; notice?: string; values?: Record<string, string> } | undefined;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROOM_RE = /^[A-Za-z0-9 /-]{1,10}$/;
const MIN_PASSWORD = 8;
const TOO_MANY_EMAILS = "Sono state inviate troppe email in poco tempo. Riprova più tardi (può volerci fino a un'ora); se il problema continua, contatta l'amministratore.";

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
  const wrong: FormState = { error: "Credenziali non corrette.", values: { identifier } };

  const email = await emailFor(identifier);
  if (!email) return wrong;

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error?.code === "email_not_confirmed") {
    await rememberPendingEmail(email);
    redirect("/verifica-email");
  }
  if (error?.code === "invalid_credentials") return wrong;
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
  if (settings.registrationCode && code !== settings.registrationCode) {
    return fail("Codice di registrazione non corretto. Chiedilo all'amministratore.");
  }
  if (await prisma.user.findUnique({ where: { email: values.email } })) return fail(taken);

  // Supabase stores the password and sends the confirmation email.
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email: values.email,
    password,
    options: { emailRedirectTo: confirmUrl() },
  });
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

  // The username is always surname.name (plus a number for homonyms). If a
  // homonym registers at the same moment, pick the next free one.
  for (let attempt = 1; ; attempt++) {
    try {
      await prisma.user.create({
        data: {
          authId: data.user.id,
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          username: await availableUsername(prisma, values),
          room: values.room,
          rulesAcceptedAt: new Date(),
          emailVerifiedAt: data.user.email_confirmed_at ? new Date(data.user.email_confirmed_at) : null,
        },
      });
      break;
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2002") throw e;
      const target = String(e.meta?.target ?? "");
      if (target.includes("username") && attempt < 3) continue;
      // Someone registered this email a moment ago: undo the Auth account.
      await supabaseAdmin().auth.admin.deleteUser(data.user.id);
      return fail(taken);
    }
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
  if (error?.code === "over_email_send_rate_limit" || error?.status === 429) redirect("/verifica-email?esito=attendi");
  if (error) {
    console.error("Invio email di verifica non riuscito", error);
    redirect("/verifica-email?esito=invio-fallito");
  }
  redirect("/verifica-email?esito=email-inviata");
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

// Reached from the password-reset email (which signs the user in), or by a
// signed-in user who wants to change their password.
export async function updatePassword(_: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const password = String(formData.get("password") ?? "");
  if (password.length < MIN_PASSWORD) return { error: `La password deve avere almeno ${MIN_PASSWORD} caratteri.` };
  if (password !== formData.get("confirm")) return { error: "Le due password non coincidono." };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.updateUser({ password });
  if (error?.code === "same_password") return { error: "Scegli una password diversa da quella attuale." };
  if (error?.code === "weak_password") return { error: "Password troppo debole: scegline una più lunga o meno comune." };
  if (error) {
    console.error("Cambio password non riuscito", error);
    return { error: "Non è stato possibile cambiare la password. Riprova più tardi." };
  }
  redirect("/prenota?esito=password-aggiornata");
}

// Query string that brings the user back to the same week and machine.
function bookingPageParams(formData: FormData) {
  const params = new URLSearchParams();
  const week = formData.get("week");
  const machineId = Number(formData.get("machineId"));
  if (isValidDay(week)) params.set("settimana", week);
  if (Number.isInteger(machineId) && machineId > 0) params.set("macchina", String(machineId));
  return params;
}

export async function book(formData: FormData) {
  const user = await requireVerifiedUser();
  const machineId = Number(formData.get("machineId"));
  const start = new Date(String(formData.get("start")));

  const result = await createBooking(user.id, machineId, start);
  const params = bookingPageParams(formData);
  params.set("esito", result);
  redirect(`/prenota?${params}`);
}

// Owners can cancel their own upcoming bookings; admins can cancel any.
export async function cancel(formData: FormData) {
  const user = await requireVerifiedUser();
  const id = Number(formData.get("bookingId"));
  const back = String(formData.get("back"));

  const target =
    back === "admin" && user.role === "ADMIN" ? "/admin" : back === "mie" ? "/mie-prenotazioni" : "/prenota";
  const params = target === "/prenota" ? bookingPageParams(formData) : new URLSearchParams();
  const go = (esito: string) => {
    params.set("esito", esito);
    redirect(`${target}?${params}`);
  };

  const booking = Number.isInteger(id) ? await prisma.booking.findUnique({ where: { id } }) : null;
  if (!booking || (booking.userId !== user.id && user.role !== "ADMIN")) return go("non-trovata");
  if (booking.end <= new Date()) return go("gia-conclusa");

  await prisma.booking.delete({ where: { id } });
  go("annullata");
}
