"use server";

import { randomInt } from "node:crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { setFlash } from "@/lib/flash";
import { MACHINE_TYPES, NOTICE_LEVELS } from "@/lib/messages";
import { DEFAULT_RULES } from "@/lib/rules";
import { requireAdmin } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { addDays, isValidDay } from "@/lib/time";

async function done(esito = "salvato"): Promise<never> {
  await setFlash(esito);
  redirect("/admin");
}

function int(formData: FormData, key: string, min: number, max: number): number | null {
  const n = Number(formData.get(key));
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

export async function saveSettings(formData: FormData) {
  await requireAdmin();
  const slotMinutes = int(formData, "slotMinutes", 15, 240);
  const openHour = int(formData, "openHour", 0, 23);
  const closeHour = int(formData, "closeHour", 1, 24);
  const maxActiveBookings = int(formData, "maxActiveBookings", 1, 50);
  const maxDaysAhead = int(formData, "maxDaysAhead", 1, 60);
  const minHoursBefore = int(formData, "minHoursBefore", 0, 720);
  const registrationCode = String(formData.get("registrationCode") ?? "").trim();
  const openDays = formData.getAll("openDays").map(String);
  const closedWeekdays = ["0", "1", "2", "3", "4", "5", "6"].filter((d) => !openDays.includes(d)).join("");

  if (
    slotMinutes === null ||
    openHour === null ||
    closeHour === null ||
    maxActiveBookings === null ||
    maxDaysAhead === null ||
    minHoursBefore === null ||
    minHoursBefore >= maxDaysAhead * 24 || // nothing would ever be bookable
    (closeHour - openHour) * 60 < slotMinutes ||
    closedWeekdays.length === 7
  ) {
    return done("dati-non-validi");
  }

  const data = {
    slotMinutes,
    openHour,
    closeHour,
    closedWeekdays,
    maxActiveBookings,
    maxDaysAhead,
    minHoursBefore,
    registrationCode: registrationCode || null,
  };
  await prisma.settings.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
  return done();
}

// 8 random characters without look-alikes (0/O, 1/I/L), e.g. "K7QM-3XPA":
// about 39 bits, far beyond what the rate limit lets anyone try.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export async function generateRegistrationCode() {
  await requireAdmin();
  const chars = Array.from({ length: 8 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]);
  const registrationCode = `${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
  await prisma.settings.upsert({ where: { id: 1 }, update: { registrationCode }, create: { id: 1, registrationCode } });
  return done("codice-generato");
}

function machineFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type"));
  const sortOrder = int(formData, "sortOrder", 0, 999) ?? 0;
  if (name.length < 1 || name.length > 40 || !(type in MACHINE_TYPES)) return null;
  return { name, type, sortOrder };
}

export async function addMachine(formData: FormData) {
  await requireAdmin();
  const data = machineFields(formData);
  if (!data) return done("dati-non-validi");
  await prisma.machine.create({ data });
  return done();
}

export async function updateMachine(formData: FormData) {
  await requireAdmin();
  const id = int(formData, "id", 1, Number.MAX_SAFE_INTEGER);
  const data = machineFields(formData);
  if (id === null || !data) return done("dati-non-validi");
  await prisma.machine.update({ where: { id }, data });
  return done();
}

export async function toggleMachine(formData: FormData) {
  await requireAdmin();
  const id = int(formData, "id", 1, Number.MAX_SAFE_INTEGER);
  const machine = id === null ? null : await prisma.machine.findUnique({ where: { id } });
  if (!machine) return done("dati-non-validi");
  await prisma.machine.update({ where: { id: machine.id }, data: { active: !machine.active } });
  return done();
}

export async function deleteMachine(formData: FormData) {
  await requireAdmin();
  const id = int(formData, "id", 1, Number.MAX_SAFE_INTEGER);
  if (id === null) return done("dati-non-validi");
  // A machine with bookings, past ones included, is part of the history:
  // it can only be disabled. The database enforces this too.
  if (await prisma.booking.count({ where: { machineId: id } })) return done("macchina-con-storico");
  await prisma.machine.deleteMany({ where: { id } });
  return done();
}

export async function saveRules(formData: FormData) {
  await requireAdmin();
  const text = String(formData.get("rulesText") ?? "").replace(/\r\n/g, "\n").trim();
  if (text.length > 5000) return done("dati-non-validi");
  // Store null while the text matches the default, so it follows future updates.
  const rulesText = text && text !== DEFAULT_RULES ? text : null;
  await prisma.settings.upsert({ where: { id: 1 }, update: { rulesText }, create: { id: 1, rulesText } });
  return done();
}

// Rejects well-formed but impossible dates such as 2026-02-31.
const isRealDay = (day: string) => isValidDay(day) && addDays(day, 0) === day;

export async function addNotice(formData: FormData) {
  await requireAdmin();
  const message = String(formData.get("message") ?? "").replace(/\r\n/g, "\n").trim();
  const level = String(formData.get("level"));
  const startDay = String(formData.get("startDay"));
  const endDay = String(formData.get("endDay"));
  if (
    message.length < 1 ||
    message.length > 500 ||
    !(level in NOTICE_LEVELS) ||
    !isRealDay(startDay) ||
    !isRealDay(endDay) ||
    endDay < startDay
  ) {
    return done("dati-non-validi");
  }
  await prisma.notice.create({ data: { message, level, startDay, endDay } });
  return done("avviso-pubblicato");
}

export async function deleteNotice(formData: FormData) {
  await requireAdmin();
  const id = int(formData, "id", 1, Number.MAX_SAFE_INTEGER);
  if (id === null) return done("dati-non-validi");
  await prisma.notice.deleteMany({ where: { id } });
  return done("avviso-rimosso");
}

// For residents who cannot receive the verification email.
export async function markVerified(formData: FormData) {
  await requireAdmin();
  const id = int(formData, "id", 1, Number.MAX_SAFE_INTEGER);
  const user = id === null ? null : await prisma.user.findUnique({ where: { id } });
  if (!user) return done("dati-non-validi");
  // Supabase must know too, otherwise it keeps refusing the login.
  const { error } = await supabaseAdmin().auth.admin.updateUserById(user.authId, { email_confirm: true });
  if (error) {
    console.error("Conferma email non riuscita", error);
    return done("operazione-fallita");
  }
  await prisma.user.updateMany({ where: { id: user.id, emailVerifiedAt: null }, data: { emailVerifiedAt: new Date() } });
  return done();
}

export async function setRole(formData: FormData) {
  const admin = await requireAdmin();
  const id = int(formData, "id", 1, Number.MAX_SAFE_INTEGER);
  const role = String(formData.get("role"));
  if (id === null || (role !== "USER" && role !== "ADMIN")) return done("dati-non-validi");
  if (id === admin.id) return done("se-stesso");
  await prisma.user.update({ where: { id }, data: { role } });
  return done();
}
