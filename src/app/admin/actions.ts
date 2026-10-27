"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { MACHINE_TYPES, NOTICE_LEVELS } from "@/lib/messages";
import { DEFAULT_RULES } from "@/lib/rules";
import { requireAdmin } from "@/lib/session";
import { addDays, isValidDay } from "@/lib/time";

const done = (esito = "salvato"): never => redirect(`/admin?esito=${esito}`);

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
  done();
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
  done();
}

export async function updateMachine(formData: FormData) {
  await requireAdmin();
  const id = int(formData, "id", 1, Number.MAX_SAFE_INTEGER);
  const data = machineFields(formData);
  if (id === null || !data) return done("dati-non-validi");
  await prisma.machine.update({ where: { id }, data });
  done();
}

export async function toggleMachine(formData: FormData) {
  await requireAdmin();
  const id = int(formData, "id", 1, Number.MAX_SAFE_INTEGER);
  const machine = id === null ? null : await prisma.machine.findUnique({ where: { id } });
  if (!machine) return done("dati-non-validi");
  await prisma.machine.update({ where: { id: machine.id }, data: { active: !machine.active } });
  done();
}

export async function deleteMachine(formData: FormData) {
  await requireAdmin();
  const id = int(formData, "id", 1, Number.MAX_SAFE_INTEGER);
  if (id === null) return done("dati-non-validi");
  await prisma.machine.deleteMany({ where: { id } }); // bookings cascade
  done();
}

export async function saveRules(formData: FormData) {
  await requireAdmin();
  const text = String(formData.get("rulesText") ?? "").replace(/\r\n/g, "\n").trim();
  if (text.length > 5000) return done("dati-non-validi");
  // Store null while the text matches the default, so it follows future updates.
  const rulesText = text && text !== DEFAULT_RULES ? text : null;
  await prisma.settings.upsert({ where: { id: 1 }, update: { rulesText }, create: { id: 1, rulesText } });
  done();
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
  done("avviso-pubblicato");
}

export async function deleteNotice(formData: FormData) {
  await requireAdmin();
  const id = int(formData, "id", 1, Number.MAX_SAFE_INTEGER);
  if (id === null) return done("dati-non-validi");
  await prisma.notice.deleteMany({ where: { id } });
  done("avviso-rimosso");
}

// For residents who cannot receive the verification email.
export async function markVerified(formData: FormData) {
  await requireAdmin();
  const id = int(formData, "id", 1, Number.MAX_SAFE_INTEGER);
  if (id === null) return done("dati-non-validi");
  await prisma.user.updateMany({ where: { id, emailVerifiedAt: null }, data: { emailVerifiedAt: new Date() } });
  done();
}

export async function setRole(formData: FormData) {
  const admin = await requireAdmin();
  const id = int(formData, "id", 1, Number.MAX_SAFE_INTEGER);
  const role = String(formData.get("role"));
  if (id === null || (role !== "USER" && role !== "ADMIN")) return done("dati-non-validi");
  if (id === admin.id) return done("se-stesso");
  await prisma.user.update({ where: { id }, data: { role } });
  done();
}
