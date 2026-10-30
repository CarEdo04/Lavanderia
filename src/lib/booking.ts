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

// Residents can cancel only while the shift could still be booked by someone
// else; inside the notice window only an admin can. Nobody can cancel a shift
// that has started, so it stays in the history.
export function canCancel(
  booking: Slot,
  user: { role: string },
  settings: { minHoursBefore: number },
  now = new Date(),
): boolean {
  if (booking.start <= now) return false;
  return user.role === "ADMIN" || !isTooLate(booking, settings, now);
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

// `byAdmin` skips the notice window: admins can still fill a shift that
// residents can no longer book.
export async function createBooking(
  userId: number,
  machineId: number,
  start: Date,
  { byAdmin = false } = {},
): Promise<BookingResult> {
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
  if (!byAdmin && isTooLate(slot, settings, now)) return "troppo-tardi";
  if (day > addDays(today(), settings.maxDaysAhead - 1)) return "troppo-avanti";

  // Serializable, so two requests from the same person at the same moment
  // cannot both pass the active-bookings limit. Postgres aborts one of them
  // (P2034) and it is retried against the committed state.
  for (let attempt = 1; ; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx): Promise<BookingResult> => {
          const active = await tx.booking.count({ where: { userId, end: { gt: now } } });
          if (active >= settings.maxActiveBookings) return "limite";

          const clash = await tx.booking.findFirst({
            where: { machineId, start: { lt: slot.end }, end: { gt: slot.start } },
          });
          if (clash) return "occupato";

          await tx.booking.create({ data: { machineId, userId, start: slot.start, end: slot.end } });
          return "prenotata";
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (e) {
      if (!(e instanceof Prisma.PrismaClientKnownRequestError)) throw e;
      // Unique (machineId, start) caught a booking made at the same moment.
      if (e.code === "P2002") return "occupato";
      if (e.code === "P2034" && attempt < 3) continue;
      throw e;
    }
  }
}
