"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { createBooking, getSettings } from "@/lib/booking";
import { prisma } from "@/lib/db";
import { createSession, destroySession, requireUser, requireVerifiedUser } from "@/lib/session";
import { isValidDay } from "@/lib/time";
import { sendVerificationEmail } from "@/lib/verification";

// `values` echoes the submitted fields (never the password) so the form can
// be refilled after an error.
export type FormState = { error?: string; values?: Record<string, string> } | undefined;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-z0-9._-]{3,30}$/;
const ROOM_RE = /^[A-Za-z0-9 /-]{1,10}$/;
const RESEND_AFTER_MS = 60_000;

// Log in with either the email address or the optional username.
export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const identifier = String(formData.get("identifier") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await prisma.user.findUnique({
    where: identifier.includes("@") ? { email: identifier } : { username: identifier },
  });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "Credenziali non corrette.", values: { identifier } };
  }
  await createSession(user.id);
  redirect("/prenota");
}

export async function register(_: FormState, formData: FormData): Promise<FormState> {
  const values = {
    firstName: String(formData.get("firstName") ?? "").trim(),
    lastName: String(formData.get("lastName") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    username: String(formData.get("username") ?? "").trim().toLowerCase(),
    room: String(formData.get("room") ?? "").trim(),
  };
  const password = String(formData.get("password") ?? "");
  const code = String(formData.get("code") ?? "").trim();
  const acceptedRules = formData.get("rules") === "si";
  const fail = (error: string): FormState => ({ error, values });

  if (values.firstName.length < 1 || values.firstName.length > 40) return fail("Inserisci il tuo nome.");
  if (values.lastName.length < 1 || values.lastName.length > 40) return fail("Inserisci il tuo cognome.");
  if (!EMAIL_RE.test(values.email)) return fail("Inserisci un indirizzo email valido.");
  if (values.username && !USERNAME_RE.test(values.username)) {
    return fail("Lo username deve avere 3–30 caratteri tra lettere, numeri, punto, trattino e trattino basso.");
  }
  if (password.length < 8) return fail("La password deve avere almeno 8 caratteri.");
  if (!ROOM_RE.test(values.room)) return fail("Inserisci il numero della tua stanza.");
  if (!acceptedRules) return fail("Per registrarti devi accettare il regolamento.");

  const settings = await getSettings();
  if (settings.registrationCode && code !== settings.registrationCode) {
    return fail("Codice di registrazione non corretto. Chiedilo all'amministratore.");
  }
  if (await prisma.user.findUnique({ where: { email: values.email } })) {
    return fail("Esiste già un account con questa email.");
  }
  if (values.username && (await prisma.user.findUnique({ where: { username: values.username } }))) {
    return fail("Questo username è già in uso.");
  }

  const user = await prisma.user.create({
    data: {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      username: values.username || null,
      room: values.room,
      passwordHash: await bcrypt.hash(password, 10),
      rulesAcceptedAt: new Date(),
    },
  });
  try {
    await sendVerificationEmail(user);
  } catch (e) {
    // The account exists; the user can ask for a new email from /verifica-email.
    console.error("Invio email di verifica non riuscito", e);
  }
  await createSession(user.id);
  redirect("/verifica-email");
}

export async function resendVerification() {
  const user = await requireUser();
  if (user.emailVerifiedAt) redirect("/prenota");

  const { verificationSentAt } = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (verificationSentAt && Date.now() - verificationSentAt.getTime() < RESEND_AFTER_MS) {
    redirect("/verifica-email?esito=attendi");
  }
  try {
    await sendVerificationEmail(user);
  } catch (e) {
    console.error("Invio email di verifica non riuscito", e);
    redirect("/verifica-email?esito=invio-fallito");
  }
  redirect("/verifica-email?esito=email-inviata");
}

export async function logout() {
  await destroySession();
  redirect("/login");
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
