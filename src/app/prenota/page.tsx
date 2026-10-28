import Link from "next/link";
import { book, cancel } from "../actions";
import { Flash } from "@/components/Flash";
import { Notices } from "@/components/Notices";
import { ScrollHere } from "@/components/ScrollHere";
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
  const inWindow = (day: string) => day >= first && day <= lastDay;

  // Every calendar week with an open day in the booking window, one under the
  // other. Days outside the window stay in the grid so the weeks line up.
  const weeks: { monday: string; days: { day: string; slots: Slot[] }[] }[] = [];
  for (let monday = mondayOf(first); monday <= lastDay; monday = addDays(monday, 7)) {
    const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
      .map((day) => ({ day, slots: slotsForDay(day, settings) }))
      .filter((d) => d.slots.length > 0);
    if (days.some((d) => inWindow(d.day))) weeks.push({ monday, days });
  }
  // The week an action came from shows its outcome; otherwise it goes on top.
  const flashWeek = weeks.some((w) => w.monday === settimana) ? settimana : undefined;

  const machines = await prisma.machine.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  const machine = machines.find((m) => String(m.id) === macchina) ?? machines[0];
  const rangeStart = localToUtc(mondayOf(first), 0);
  const rangeEnd = localToUtc(addDays(mondayOf(lastDay), 7), 0);

  const [bookings, activeCount, notices] = await Promise.all([
    machine
      ? prisma.booking.findMany({
          where: { machineId: machine.id, start: { lt: rangeEnd }, end: { gt: rangeStart } },
          include: { user: { select: { firstName: true, lastName: true, room: true } } },
        })
      : [],
    prisma.booking.count({ where: { userId: user.id, end: { gt: now } } }),
    prisma.notice.findMany({
      where: { startDay: { lte: lastDay }, endDay: { gte: first } },
      orderBy: [{ level: "desc" }, { startDay: "asc" }, { id: "asc" }],
    }),
  ]);
  const atLimit = activeCount >= settings.maxActiveBookings;

  // Notices still running in the given week.
  const noticesFor = (monday: string) => {
    const from = monday > first ? monday : first;
    return notices.filter((n) => n.startDay <= addDays(monday, 6) && n.endDay >= from);
  };

  function cell(week: string, day: string, slot: Slot) {
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
          confirm={`Confermi la prenotazione di ${formatDay(day, { weekday: "long", day: "numeric", month: "long" })}, ${formatTime(slot.start)}–${formatTime(slot.end)}?`}
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

  function weekSection({ monday, days }: (typeof weeks)[number]) {
    const rowLabels = days.reduce<Slot[]>((longest, d) => (d.slots.length > longest.length ? d.slots : longest), []);
    const range = `${shortDate(monday)} – ${shortDate(addDays(monday, 6))}`;
    return (
      <section key={monday} id={`settimana-${monday}`} aria-labelledby={`titolo-${monday}`} className="scroll-mt-4">
        <h2 id={`titolo-${monday}`} className="mb-3 font-semibold text-slate-900">
          Settimana {range}
        </h2>
        {flashWeek === monday && (
          <>
            <ScrollHere />
            <Flash code={esito} />
          </>
        )}
        <Notices notices={noticesFor(monday)} />

        {/* Phones: one card per day, only the days that can still be seen */}
        <div className="space-y-3 sm:hidden">
          {days
            .filter(({ day }) => inWindow(day))
            .map(({ day, slots }) => (
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
                      <div className="min-w-0 flex-1">{cell(monday, day, slot)}</div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
        </div>

        {/* Larger screens: the whole week as one grid, so the weeks line up */}
        <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white sm:block">
          <table className="w-full min-w-[640px] table-fixed border-collapse text-sm">
            <caption className="sr-only">Turni della settimana {range}</caption>
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
                    className={`px-2 py-2 text-left capitalize ${
                      day === first ? "text-sky-700" : inWindow(day) ? "text-slate-900" : "text-slate-400"
                    }`}
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
                      {slots[i] && cell(monday, day, slots[i])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );
  }

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

      {!flashWeek && <Flash code={esito} />}

      {machines.length > 1 && (
        <nav aria-label="Scegli la macchina" className="mb-4 flex flex-wrap gap-2">
          {machines.map((m) => (
            <Link
              key={m.id}
              href={`/prenota?macchina=${m.id}`}
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

      {!machine ? (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-slate-600">
          La lavanderia non è disponibile al momento.
        </p>
      ) : weeks.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-slate-600">Nessun turno prenotabile.</p>
      ) : (
        <div className="space-y-8">{weeks.map(weekSection)}</div>
      )}
    </div>
  );
}
