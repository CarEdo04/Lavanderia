import Link from "next/link";
import { cancel } from "../actions";
import { Flash } from "@/components/Flash";
import { PlusIcon } from "@/components/Icons";
import { SubmitButton } from "@/components/SubmitButton";
import { getSettings } from "@/lib/booking";
import { prisma } from "@/lib/db";
import { requireVerifiedUser } from "@/lib/session";
import { dayOf, daysUntil, formatDay, formatTime } from "@/lib/time";

export const metadata = { title: "I miei turni · Lavanderia" };

export default async function MyBookingsPage({ searchParams }: { searchParams: Promise<{ esito?: string }> }) {
  const user = await requireVerifiedUser();
  const { esito } = await searchParams;
  const now = new Date();

  const [upcoming, past, settings] = await Promise.all([
    prisma.booking.findMany({
      where: { userId: user.id, end: { gt: now } },
      include: { machine: true },
      orderBy: { start: "asc" },
    }),
    prisma.booking.findMany({
      where: { userId: user.id, end: { lte: now } },
      include: { machine: true },
      orderBy: { start: "desc" },
    }),
    getSettings(),
  ]);

  // The history by month, newest first.
  const months: { month: string; bookings: typeof past }[] = [];
  for (const b of past) {
    const month = dayOf(b.start).slice(0, 7);
    if (months.at(-1)?.month !== month) months.push({ month, bookings: [] });
    months.at(-1)!.bookings.push(b);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight">I miei turni</h1>
      <p className="mt-1 mb-5 text-sm text-ink-2">
        Accedi con la tua email{user.username && (
          <>
            {" "}
            o con lo username <strong className="font-mono font-medium text-ink">{user.username}</strong>
          </>
        )}
        .
      </p>
      <Flash code={esito} />

      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="text-[17px] font-semibold">In programma</h2>
        <span className="font-mono text-[13px] text-ink-2">
          {upcoming.length} di {settings.maxActiveBookings}
        </span>
      </div>
      {upcoming.length === 0 ? (
        <p className="rounded-[18px] border-[1.5px] border-dashed border-ink-2/40 px-5 py-4 text-ink-2">
          Non hai turni in programma.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {upcoming.map((b) => {
            const day = dayOf(b.start);
            return (
              <li key={b.id} className="flex overflow-hidden rounded-[18px] border border-line bg-white">
                <div className="flex w-[74px] flex-none flex-col items-center justify-center gap-0.5 bg-brand py-3 text-white">
                  <span className="eyebrow text-[11px]">{formatDay(day, { weekday: "short" })}</span>
                  <span className="text-[26px] leading-none font-bold">{formatDay(day, { day: "numeric" })}</span>
                  <span className="text-xs">{formatDay(day, { month: "short" })}</span>
                </div>
                <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 border-l-[1.5px] border-dashed border-line py-3.5 pr-3 pl-4">
                  <div className="min-w-0">
                    <p className="font-mono text-[17px] font-medium">
                      {formatTime(b.start)} – {formatTime(b.end)}
                    </p>
                    <p className="mt-0.5 text-sm text-ink-2">
                      {b.machine.name} ·{" "}
                      {b.start <= now ? (
                        <span className="font-semibold text-brand">in corso</span>
                      ) : (
                        daysUntil(day)
                      )}
                    </p>
                  </div>
                  {/* A shift that has started stays in the history. */}
                  {b.start > now && (
                    <form action={cancel}>
                      <input type="hidden" name="bookingId" value={b.id} />
                      <input type="hidden" name="back" value="mie" />
                      <SubmitButton
                        confirm="Vuoi annullare questo turno?"
                        confirmLabel="Annulla turno"
                        danger
                        details={
                          <p className="text-ink-2 first-letter:uppercase">
                            {formatDay(day, { weekday: "long", day: "numeric", month: "long" })}, {formatTime(b.start)} – {formatTime(b.end)}. Il turno tornerà libero per gli altri.
                          </p>
                        }
                        className="h-11 rounded-xl border border-line px-3.5 text-sm font-medium hover:border-red-300 hover:text-red-700"
                      >
                        Annulla
                      </SubmitButton>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {upcoming.length < settings.maxActiveBookings && (
        <Link
          href="/prenota"
          className="mt-3 flex h-[52px] items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-ink-2/50 font-semibold text-brand hover:border-brand hover:bg-brand-soft"
        >
          <PlusIcon />
          {upcoming.length === 0 ? "Prenota un turno" : "Prenota un altro turno"}
        </Link>
      )}

      {past.length > 0 && (
        <>
          <div className="mt-8 mb-2.5 flex items-baseline justify-between gap-3">
            <h2 className="text-[17px] font-semibold">Storico</h2>
            <span className="text-[13px] text-ink-2">
              {past.length} {past.length === 1 ? "turno" : "turni"}
            </span>
          </div>
          <div className="overflow-hidden rounded-[18px] border border-line bg-white">
            {months.map(({ month, bookings }) => (
              <section key={month} aria-label={formatDay(`${month}-01`, { month: "long", year: "numeric" })}>
                <h3 className="eyebrow bg-ground/60 px-4 pt-2.5 pb-1.5 text-[11px] text-ink-2">
                  {formatDay(`${month}-01`, { month: "long", year: "numeric" })}
                </h3>
                <ul>
                  {bookings.map((b) => (
                    <li
                      key={b.id}
                      className="flex flex-wrap justify-between gap-x-3 border-t border-line-soft px-4 py-2.5 text-sm text-ink-2"
                    >
                      <span className="text-ink first-letter:uppercase">
                        {formatDay(dayOf(b.start), { weekday: "long", day: "numeric" })}
                        <span className="text-ink-2 normal-case"> · {b.machine.name}</span>
                      </span>
                      <span className="font-mono">
                        {formatTime(b.start)} – {formatTime(b.end)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
