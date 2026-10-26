"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { createBooking, getSettings } from "@/lib/booking";
import { prisma } from "@/lib/db";
import { createSession, destroySession, requireUser } from "@/lib/session";
import { isValidDay } from "@/lib/time";

export type FormState = { error?: string } | undefined;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "Email o password non corretti." };
  }
  await createSession(user.id);
  redirect("/prenota");
}

export async function register(_: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const apartment = String(formData.get("apartment") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const code = String(formData.get("code") ?? "").trim();

  if (name.length < 2 || name.length > 60) return { error: "Inserisci un nome valido." };
  if (apartment.length > 20) return { error: "Interno troppo lungo." };
  if (!EMAIL_RE.test(email)) return { error: "Inserisci un indirizzo email valido." };
  if (password.length < 8) return { error: "La password deve avere almeno 8 caratteri." };

  const settings = await getSettings();
  if (settings.registrationCode && code !== settings.registrationCode) {
    return { error: "Codice di registrazione non corretto. Chiedilo all'amministratore." };
  }
  if (await prisma.user.findUnique({ where: { email } })) {
    return { error: "Esiste già un account con questa email." };
  }

  const user = await prisma.user.create({
    data: { name, apartment: apartment || null, email, passwordHash: await bcrypt.hash(password, 10) },
  });
  await createSession(user.id);
  redirect("/prenota");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function book(formData: FormData) {
  const user = await requireUser();
  const machineId = Number(formData.get("machineId"));
  const start = new Date(String(formData.get("start")));
  const day = String(formData.get("day"));

  const result = await createBooking(user.id, machineId, start);
  const dayParam = isValidDay(day) ? `giorno=${day}&` : "";
  redirect(`/prenota?${dayParam}esito=${result}`);
}

// Owners can cancel their own upcoming bookings; admins can cancel any.
export async function cancel(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("bookingId"));
  const back = String(formData.get("back"));
  const day = String(formData.get("day"));

  const target =
    back === "admin" && user.role === "ADMIN"
      ? "/admin"
      : back === "mie"
        ? "/mie-prenotazioni"
        : `/prenota${isValidDay(day) ? `?giorno=${day}` : ""}`;
  const go = (esito: string) => redirect(`${target}${target.includes("?") ? "&" : "?"}esito=${esito}`);

  const booking = Number.isInteger(id) ? await prisma.booking.findUnique({ where: { id } }) : null;
  if (!booking || (booking.userId !== user.id && user.role !== "ADMIN")) return go("non-trovata");
  if (booking.end <= new Date()) return go("gia-conclusa");

  await prisma.booking.delete({ where: { id } });
  go("annullata");
}
