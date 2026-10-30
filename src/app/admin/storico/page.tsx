import Link from "next/link";
import { prisma } from "@/lib/db";
import { fullName } from "@/lib/people";
import { requireAdmin } from "@/lib/session";
import { dayOf, formatDay, formatTime, localToUtc, today } from "@/lib/time";

export const metadata = { title: "Storico prenotazioni · Lavanderia" };

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

// "2026-10" → "2026-11" (n = 1) or "2026-09" (n = -1).
function addMonths(month: string, n: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

const monthLabel = (month: string) => formatDay(`${month}-01`, { month: "long", year: "numeric" });

// Every booking of one month, past and upcoming, with who made it.
export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ mese?: string }> }) {
  await requireAdmin();
  const { mese } = await searchParams;
  const current = today().slice(0, 7);
  const month = mese && MONTH_RE.test(mese) ? mese : current;
  const now = new Date();

  const [bookings, first, last] = await Promise.all([
    prisma.booking.findMany({
      where: { start: { gte: localToUtc(`${month}-01`, 0), lt: localToUtc(`${addMonths(month, 1)}-01`, 0) } },
      include: { machine: true, user: true },
      orderBy: [{ start: "asc" }, { machineId: "asc" }],
    }),
    prisma.booking.findFirst({ orderBy: { start: "asc" }, select: { start: true } }),
    prisma.booking.findFirst({ orderBy: { start: "desc" }, select: { start: true } }),
  ]);
  // Navigate between the first booked month and the last one (or this month).
  const firstMonth = first ? dayOf(first.start).slice(0, 7) : current;
  const lastBooked = last ? dayOf(last.start).slice(0, 7) : current;
  const lastMonth = lastBooked > current ? lastBooked : current;
  const prev = month > firstMonth ? addMonths(month, -1) : null;
  const next = month < lastMonth ? addMonths(month, 1) : null;

  const navLink = "flex min-h-11 items-center gap-1 rounded-xl border border-line bg-white px-3.5 text-sm font-medium text-ink hover:border-brand-line";
  const th = "py-2 pr-3 font-medium";

  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin" className="text-sm font-medium text-brand hover:underline">
          ‹ Gestione
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Storico delle prenotazioni</h1>
        <p className="text-sm text-ink-2">
          Tutti i turni prenotati, anche quelli passati. Le prenotazioni annullate prima dell&apos;inizio del turno non
          compaiono.
        </p>
      </div>

      <div className="flex items-center justify-between gap-2">
        {prev ? (
          <Link href={`/admin/storico?mese=${prev}`} className={navLink}>
            ‹ <span className="capitalize">{monthLabel(prev)}</span>
          </Link>
        ) : (
          <span />
        )}
        <h2 className="text-center font-semibold capitalize text-ink">
          {monthLabel(month)} · {bookings.length} {bookings.length === 1 ? "turno" : "turni"}
        </h2>
        {next ? (
          <Link href={`/admin/storico?mese=${next}`} className={navLink}>
            <span className="capitalize">{monthLabel(next)}</span> ›
          </Link>
        ) : (
          <span />
        )}
      </div>

      <section className="rounded-2xl border border-line bg-white p-4 sm:p-5">
        {bookings.length === 0 ? (
          <p className="text-sm text-ink-2">Nessuna prenotazione in questo mese.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-2">
                  <th className={th}>Giorno</th>
                  <th className={th}>Orario</th>
                  <th className={th}>Macchina</th>
                  <th className={th}>Nome e cognome</th>
                  <th className={th}>Username</th>
                  <th className={th}>Email</th>
                  <th className={th}>Stanza</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b border-line-soft last:border-0">
                    <td className="whitespace-nowrap py-2 pr-3 capitalize">
                      {formatDay(dayOf(b.start))}
                      {b.start > now && <span className="ml-2 text-xs normal-case text-brand">in programma</span>}
                    </td>
                    <td className="whitespace-nowrap py-2 pr-3 font-mono">
                      {formatTime(b.start)}–{formatTime(b.end)}
                    </td>
                    <td className="py-2 pr-3">{b.machine.name}</td>
                    <td className="py-2 pr-3">{fullName(b.user)}</td>
                    <td className="py-2 pr-3">{b.user.username ?? "—"}</td>
                    <td className="py-2 pr-3">{b.user.email}</td>
                    <td className="py-2 pr-3">{b.user.room ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
