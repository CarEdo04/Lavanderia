import Link from "next/link";
import { book, cancel } from "../actions";
import { Flash } from "@/components/Flash";
import { Notices } from "@/components/Notices";
import { SubmitButton } from "@/components/SubmitButton";
import { getSettings, isTooLate } from "@/lib/booking";
import { prisma } from "@/lib/db";
import { fullName } from "@/lib/people";
import { requireVerifiedUser } from "@/lib/session";
import {
  addDays,
  formatDay,
  formatDuration,
  formatTime,
  localToUtc,
  mondayOf,
  slotsForDay,
  today,
  type Slot,
} from "@/lib/time";

export const metadata = { title: "Prenota · Lavanderia" };

const shortDate = (day: string) => formatDay(day, { day: "2-digit", month: "2-digit" });

function formatWindow(days: number) {
  if (days % 7 !== 0) return days === 1 ? "1 giorno" : `${days} giorni`;
  return days === 7 ? "1 settimana" : `${days / 7} settimane`;
}

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ settimana?: string; macchina?: string; esito?: string }>;
}) {
  const user = await requireVerifiedUser();
  const { settimana, macchina, esito } = await searchParams;
  const settings = await getSettings();
  const isAdmin = user.role === "ADMIN";
  const now = new Date();
  const first = today();
  const lastDay = addDays(first, Math.max(1, settings.maxDaysAhead) - 1);

  const openDays = (monday: string) =>
    Array.from({ length: 7 }, (_, i) => addDays(monday, i))
      .map((day) => ({ day, slots: slotsForDay(day, settings) }))
      .filter((d) => d.slots.length > 0);

  // Weeks that overlap the booking window; open on the first one that still
  // has a bookable shift.
  const weeks: string[] = [];
  for (let w = mondayOf(first); w <= mondayOf(lastDay); w = addDays(w, 7)) weeks.push(w);
  const hasBookable = (monday: string) =>
    openDays(monday).some(({ day, slots }) => day <= lastDay && slots.some((s) => !isTooLate(s, settings, now)));
  const week = settimana && weeks.includes(settimana) ? settimana : (weeks.find(hasBookable) ?? weeks[0]);
  const prevWeek = weeks[weeks.indexOf(week) - 1];
  const nextWeek = weeks[weeks.indexOf(week) + 1];

  const days = openDays(week);
  const rowLabels = days.reduce<Slot[]>((longest, d) => (d.slots.length > longest.length ? d.slots : longest), []);

  const machines = await prisma.machine.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  const machine = machines.find((m) => String(m.id) === macchina) ?? machines[0];
  const machineParam = machines.length > 1 && machine ? `&macchina=${machine.id}` : "";

  const [bookings, activeCount, notices] = await Promise.all([
    machine
      ? prisma.booking.findMany({
          where: { machineId: machine.id, start: { lt: localToUtc(addDays(week, 7), 0) }, end: { gt: localToUtc(week, 0) } },
          include: { user: { select: { firstName: true, lastName: true, room: true } } },
        })
      : [],
    prisma.booking.count({ where: { userId: user.id, end: { gt: now } } }),
    // Notices overlapping this week that have not ended yet.
    prisma.notice.findMany({
      where: { startDay: { lte: addDays(week, 6) }, endDay: { gte: week > first ? week : first } },
      orderBy: [{ level: "desc" }, { startDay: "asc" }, { id: "asc" }],
    }),
  ]);
  const atLimit = activeCount >= settings.maxActiveBookings;

  function cell(day: string, slot: Slot) {
    const b = bookings.find((b) => b.start < slot.end && b.end > slot.start);
    const past = slot.end <= now;

    if (b && b.userId === user.id) {
      return (
        <form
          action={cancel}
          className="flex min-h-11 flex-wrap items-center justify-between gap-x-2 rounded-md bg-emerald-50 px-2 py-1.5 ring-1 ring-emerald-200"
        >
          <span className="font-medium text-emerald-800">Tuo turno</span>
          {!past && (
            <>
              <input type="hidden" name="bookingId" value={b.id} />
              <input type="hidden" name="machineId" value={b.machineId} />
              <input type="hidden" name="week" value={week} />
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
      );
    }
    if (b) {
      return (
        <div className="flex min-h-11 flex-col justify-center rounded-md bg-slate-100 px-2 py-1.5 text-slate-600">
          {isAdmin ? (
            <>
              <span className="truncate font-medium text-slate-800" title={fullName(b.user)}>
                {fullName(b.user)}
              </span>
              {b.user.room && <span className="text-xs">stanza {b.user.room}</span>}
            </>
          ) : (
            "Occupato"
          )}
        </div>
      );
    }
    if (past || day > lastDay) {
      return (
        <div
          className="flex min-h-11 items-center px-2 text-slate-300"
          title={past ? undefined : "Non ancora prenotabile"}
        >
          —
        </div>
      );
    }
    if (isTooLate(slot, settings, now)) {
      return (
        <div
          className="flex min-h-11 items-center px-2 text-xs text-slate-400"
          title={`Le prenotazioni chiudono ${settings.minHoursBefore} ore prima del turno`}
        >
          Chiuso
        </div>
      );
    }
    return (
      <form action={book}>
        <input type="hidden" name="machineId" value={machine!.id} />
        <input type="hidden" name="start" value={slot.start.toISOString()} />
        <input type="hidden" name="week" value={week} />
        <SubmitButton
          className={`min-h-11 w-full rounded-md border px-2 py-1.5 font-medium ${
            atLimit
              ? "border-slate-200 text-slate-400"
              : "border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-400 hover:bg-sky-100"
          }`}
        >
          Libero
        </SubmitButton>
      </form>
    );
  }

  const navLink = "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-sky-300";

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Prenota un turno</h1>
      <p className="text-sm text-slate-600">
        Turni da {formatDuration(settings.slotMinutes)} · prenotazioni attive {activeCount}/{settings.maxActiveBookings}
      </p>
      <p className="mb-4 text-sm text-slate-600">
        Si prenota almeno {settings.minHoursBefore} ore prima del turno e fino a {formatWindow(settings.maxDaysAhead)}{" "}
        in anticipo.
      </p>

      <Flash code={esito} />

      {machines.length > 1 && (
        <nav aria-label="Scegli la macchina" className="mb-4 flex flex-wrap gap-2">
          {machines.map((m) => (
            <Link
              key={m.id}
              href={`/prenota?settimana=${week}&macchina=${m.id}`}
              aria-current={m.id === machine?.id ? "page" : undefined}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                m.id === machine?.id ? "border-sky-600 bg-sky-600 text-white" : "border-slate-200 bg-white text-slate-700"
              }`}
            >
              {m.name}
            </Link>
          ))}
        </nav>
      )}

      <div className="mb-4 flex items-center justify-between gap-2">
        {prevWeek ? (
          <Link href={`/prenota?settimana=${prevWeek}${machineParam}`} className={navLink}>
            ‹ <span className="hidden sm:inline">Settimana precedente</span>
          </Link>
        ) : (
          <span />
        )}
        <h2 className="text-center font-semibold text-slate-900">
          Settimana {shortDate(week)} – {shortDate(addDays(week, 6))}
        </h2>
        {nextWeek ? (
          <Link href={`/prenota?settimana=${nextWeek}${machineParam}`} className={navLink}>
            <span className="hidden sm:inline">Settimana successiva</span> ›
          </Link>
        ) : (
          <span />
        )}
      </div>

      <Notices notices={notices} />

      {!machine ? (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-slate-600">
          La lavanderia non è disponibile al momento.
        </p>
      ) : days.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-slate-600">Nessun turno in questa settimana.</p>
      ) : (
        <>
          {/* Phones: one card per day */}
          <div className="space-y-3 sm:hidden">
            {days.map(({ day, slots }) => (
              <section key={day} className="rounded-xl border border-slate-200 bg-white">
                <h3 className="border-b border-slate-100 px-4 py-2 font-semibold capitalize text-slate-900">
                  {formatDay(day, { weekday: "long", day: "numeric", month: "long" })}
                  {day === first && <span className="ml-2 text-sm font-normal normal-case text-sky-700">oggi</span>}
                </h3>
                <ul className="divide-y divide-slate-100">
                  {slots.map((slot) => (
                    <li key={slot.start.toISOString()} className="flex items-center gap-3 px-3 py-1.5 text-sm">
                      <span className="w-24 shrink-0 tabular-nums text-slate-600">
                        {formatTime(slot.start)}–{formatTime(slot.end)}
                      </span>
                      <div className="min-w-0 flex-1">{cell(day, slot)}</div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          {/* Larger screens: the whole week as one grid */}
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white sm:block">
            <table className="w-full min-w-[640px] table-fixed border-collapse text-sm">
              <caption className="sr-only">
                Turni della settimana dal {shortDate(week)} al {shortDate(addDays(week, 6))}
              </caption>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th scope="col" className="sticky left-0 z-10 w-28 bg-slate-50 px-3 py-2 text-left font-medium text-slate-500">
                    Orario
                  </th>
                  {days.map(({ day }) => (
                    <th
                      key={day}
                      scope="col"
                      aria-current={day === first ? "date" : undefined}
                      className={`px-2 py-2 text-left capitalize ${day === first ? "text-sky-700" : "text-slate-900"}`}
                    >
                      <div className="font-semibold">{formatDay(day, { weekday: "long" })}</div>
                      <div className="text-xs font-normal text-slate-500">
                        {formatDay(day, { day: "numeric", month: "short" })}
                        {day === first && " · oggi"}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rowLabels.map((label, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    <th
                      scope="row"
                      className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-1.5 text-left font-normal tabular-nums text-slate-600"
                    >
                      {formatTime(label.start)}–{formatTime(label.end)}
                    </th>
                    {days.map(({ day, slots }) => (
                      <td key={day} className="px-1.5 py-1.5 align-top">
                        {slots[i] && cell(day, slots[i])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
