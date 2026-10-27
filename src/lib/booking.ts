import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { addDays, dayOf, slotsForDay, today, type Slot } from "./time";

export async function getSettings() {
  return (
    (await prisma.settings.findUnique({ where: { id: 1 } })) ??
    (await prisma.settings.create({ data: { id: 1 } }))
  );
}

// A shift can be booked until `minHoursBefore` hours before it starts.
export function isTooLate(slot: Slot, settings: { minHoursBefore: number }, now = new Date()): boolean {
  return slot.start.getTime() - now.getTime() < settings.minHoursBefore * 3_600_000;
}

export type BookingResult =
  | "prenotata"
  | "occupato"
  | "limite"
  | "passato"
  | "troppo-tardi"
  | "troppo-avanti"
  | "turno-non-valido"
  | "macchina";

export async function createBooking(userId: number, machineId: number, start: Date): Promise<BookingResult> {
  if (!Number.isInteger(machineId) || Number.isNaN(start.getTime())) return "turno-non-valido";

  const settings = await getSettings();
  const machine = await prisma.machine.findUnique({ where: { id: machineId } });
  if (!machine || !machine.active) return "macchina";

  // The requested start must be one of the slots of the current schedule.
  const day = dayOf(start);
  const slot = slotsForDay(day, settings).find((s) => s.start.getTime() === start.getTime());
  if (!slot) return "turno-non-valido";

  const now = new Date();
  if (slot.end <= now) return "passato";
  if (isTooLate(slot, settings, now)) return "troppo-tardi";
  if (day > addDays(today(), settings.maxDaysAhead - 1)) return "troppo-avanti";

  try {
    return await prisma.$transaction(async (tx): Promise<BookingResult> => {
      const active = await tx.booking.count({ where: { userId, end: { gt: now } } });
      if (active >= settings.maxActiveBookings) return "limite";

      const clash = await tx.booking.findFirst({
        where: { machineId, start: { lt: slot.end }, end: { gt: slot.start } },
      });
      if (clash) return "occupato";

      await tx.booking.create({ data: { machineId, userId, start: slot.start, end: slot.end } });
      return "prenotata";
    });
  } catch (e) {
    // Unique (machineId, start) caught a booking made at the same moment.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return "occupato";
    throw e;
  }
}
