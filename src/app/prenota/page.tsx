import Link from "next/link";
import { book, cancel } from "../actions";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { getSettings } from "@/lib/booking";
import { prisma } from "@/lib/db";
import { MACHINE_TYPES } from "@/lib/messages";
import { requireUser } from "@/lib/session";
import { addDays, formatDay, formatDuration, formatTime, slotsForDay, today } from "@/lib/time";

export const metadata = { title: "Prenota · Lavanderia" };

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ giorno?: string; esito?: string }>;
}) {
  const user = await requireUser();
  const { giorno, esito } = await searchParams;
  const settings = await getSettings();
  const isAdmin = user.role === "ADMIN";

  const first = today();
  const now = new Date();
  // Bookable days: within the booking window, open, and not already over.
  const days = Array.from({ length: Math.max(1, settings.maxDaysAhead) }, (_, i) => addDays(first, i)).filter(
    (d) => (slotsForDay(d, settings).at(-1)?.end ?? now) > now,
  );
  const day = giorno && days.includes(giorno) ? giorno : (days[0] ?? first);
  const slots = slotsForDay(day, settings);

  const [machines, bookings, activeCount] = await Promise.all([
    prisma.machine.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    slots.length
      ? prisma.booking.findMany({
          where: { start: { lt: slots[slots.length - 1].end }, end: { gt: slots[0].start } },
          include: { user: { select: { name: true, apartment: true } } },
        })
      : [],
    prisma.booking.count({ where: { userId: user.id, end: { gt: now } } }),
  ]);
  const atLimit = activeCount >= settings.maxActiveBookings;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Prenota un turno</h1>
          <p className="text-sm text-slate-600">
            Turni da {formatDuration(settings.slotMinutes)} · prenotazioni attive {activeCount}/{settings.maxActiveBookings}
          </p>
        </div>
      </div>

      <Flash code={esito} />

      <nav aria-label="Scegli il giorno" className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {days.map((d) => {
          const selected = d === day;
          return (
            <Link
              key={d}
              href={`/prenota?giorno=${d}`}
              aria-current={selected ? "date" : undefined}
              className={`shrink-0 rounded-lg border px-3 py-2 text-center text-sm capitalize ${
                selected
                  ? "border-sky-600 bg-sky-600 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-sky-300"
              }`}
            >
              {d === first ? "Oggi" : formatDay(d)}
            </Link>
          );
        })}
      </nav>

      {machines.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-slate-600">
          Nessuna macchina disponibile al momento.
        </p>
      ) : slots.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-slate-600">Nessun turno prenotabile nei prossimi giorni.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Turni del {formatDay(day, { weekday: "long", day: "numeric", month: "long" })}</caption>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th scope="col" className="sticky left-0 z-10 w-28 bg-slate-50 px-3 py-2 text-left font-medium text-slate-500">
                  Orario
                </th>
                {machines.map((m) => (
                  <th key={m.id} scope="col" className="min-w-28 px-2 py-2 text-left">
                    <div className="font-semibold text-slate-900">{m.name}</div>
                    <div className="text-xs font-normal text-slate-500">{MACHINE_TYPES[m.type] ?? m.type}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => {
                const past = slot.end <= now;
                return (
                  <tr key={slot.start.toISOString()} className="border-b border-slate-100 last:border-0">
                    <th scope="row" className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-1.5 text-left font-normal tabular-nums text-slate-600">
                      {formatTime(slot.start)}–{formatTime(slot.end)}
                    </th>
                    {machines.map((m) => {
                      const b = bookings.find(
                        (b) => b.machineId === m.id && b.start < slot.end && b.end > slot.start,
                      );
                      return (
                        <td key={m.id} className="px-2 py-1.5">
                          {b && b.userId === user.id ? (
                            <form action={cancel} className="flex items-center justify-between gap-2 rounded-md bg-emerald-50 px-2 py-1.5 ring-1 ring-emerald-200">
                              <span className="font-medium text-emerald-800">Tuo turno</span>
                              {!past && (
                                <>
                                  <input type="hidden" name="bookingId" value={b.id} />
                                  <input type="hidden" name="day" value={day} />
                                  <input type="hidden" name="back" value="prenota" />
                                  <SubmitButton
                                    confirm="Vuoi annullare questa prenotazione?"
                                    pendingText="…"
                                    className="text-xs text-emerald-800 underline hover:text-red-700"
                                  >
                                    Annulla
                                  </SubmitButton>
                                </>
                              )}
                            </form>
                          ) : b ? (
                            <div
                              className="truncate rounded-md bg-slate-100 px-2 py-1.5 text-slate-500"
                              title={isAdmin ? b.user.name : undefined}
                            >
                              {isAdmin ? `${b.user.name}${b.user.apartment ? ` (${b.user.apartment})` : ""}` : "Occupato"}
                            </div>
                          ) : past ? (
                            <div className="px-2 py-1.5 text-slate-300">—</div>
                          ) : (
                            <form action={book}>
                              <input type="hidden" name="machineId" value={m.id} />
                              <input type="hidden" name="start" value={slot.start.toISOString()} />
                              <input type="hidden" name="day" value={day} />
                              <SubmitButton
                                className={`w-full rounded-md border px-2 py-1.5 font-medium ${
                                  atLimit
                                    ? "border-slate-200 text-slate-400"
                                    : "border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-400 hover:bg-sky-100"
                                }`}
                              >
                                Libero
                              </SubmitButton>
                            </form>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
