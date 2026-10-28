import Link from "next/link";
import { cancel } from "../actions";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { prisma } from "@/lib/db";
import { requireVerifiedUser } from "@/lib/session";
import { dayOf, formatDay, formatTime } from "@/lib/time";

export const metadata = { title: "Le mie prenotazioni · Lavanderia" };

export default async function MyBookingsPage({ searchParams }: { searchParams: Promise<{ esito?: string }> }) {
  const user = await requireVerifiedUser();
  const { esito } = await searchParams;
  const now = new Date();

  const [upcoming, past] = await Promise.all([
    prisma.booking.findMany({
      where: { userId: user.id, end: { gt: now } },
      include: { machine: true },
      orderBy: { start: "asc" },
    }),
    prisma.booking.findMany({
      where: { userId: user.id, end: { lte: now } },
      include: { machine: true },
      orderBy: { start: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900">Le mie prenotazioni</h1>
      <p className="mb-4 text-sm text-slate-600">
        Accedi con la tua email{user.username && (
          <>
            {" "}
            o con lo username <strong className="font-medium text-slate-800">{user.username}</strong>
          </>
        )}
        .
      </p>
      <Flash code={esito} />

      {upcoming.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-slate-600">
          Non hai prenotazioni in programma.{" "}
          <Link href="/prenota" className="font-medium text-sky-700 hover:underline">
            Prenota un turno
          </Link>
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {upcoming.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <div className="font-medium capitalize text-slate-900">
                  {formatDay(dayOf(b.start), { weekday: "long", day: "numeric", month: "long" })}
                </div>
                <div className="text-sm text-slate-600">
                  {formatTime(b.start)}–{formatTime(b.end)} · {b.machine.name}
                  {b.start <= now && <span className="ml-2 font-medium text-emerald-700">in corso</span>}
                </div>
              </div>
              <form action={cancel}>
                <input type="hidden" name="bookingId" value={b.id} />
                <input type="hidden" name="back" value="mie" />
                <SubmitButton
                  confirm="Vuoi annullare questa prenotazione?"
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:border-red-300 hover:text-red-700"
                >
                  Annulla
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}

      {past.length > 0 && (
        <>
          <h2 className="mb-2 mt-8 text-sm font-semibold uppercase tracking-wide text-slate-500">Storico recente</h2>
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white text-sm text-slate-500">
            {past.map((b) => (
              <li key={b.id} className="px-4 py-2">
                <span className="capitalize">{formatDay(dayOf(b.start))}</span> · {formatTime(b.start)}–
                {formatTime(b.end)} · {b.machine.name}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
