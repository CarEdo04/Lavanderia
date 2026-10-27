"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { MACHINE_TYPES } from "@/lib/messages";
import { requireAdmin } from "@/lib/session";

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
  const registrationCode = String(formData.get("registrationCode") ?? "").trim();
  const openDays = formData.getAll("openDays").map(String);
  const closedWeekdays = ["0", "1", "2", "3", "4", "5", "6"].filter((d) => !openDays.includes(d)).join("");

  if (
    slotMinutes === null ||
    openHour === null ||
    closeHour === null ||
    maxActiveBookings === null ||
    maxDaysAhead === null ||
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

export async function setRole(formData: FormData) {
  const admin = await requireAdmin();
  const id = int(formData, "id", 1, Number.MAX_SAFE_INTEGER);
  const role = String(formData.get("role"));
  if (id === null || (role !== "USER" && role !== "ADMIN")) return done("dati-non-validi");
  if (id === admin.id) return done("se-stesso");
  await prisma.user.update({ where: { id }, data: { role } });
  done();
}
