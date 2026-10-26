import { cancel } from "../actions";
import { addMachine, deleteMachine, saveSettings, setRole, toggleMachine, updateMachine } from "./actions";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { getSettings } from "@/lib/booking";
import { prisma } from "@/lib/db";
import { MACHINE_TYPES } from "@/lib/messages";
import { requireAdmin } from "@/lib/session";
import { dayOf, formatDay, formatTime } from "@/lib/time";

export const metadata = { title: "Gestione · Lavanderia" };

const card = "rounded-xl border border-slate-200 bg-white p-4 sm:p-5";
const h2 = "mb-3 text-lg font-semibold text-slate-900";
const field = "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900";
const primary = "rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700";
const secondary = "rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50";
const danger = "rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50";

function TypeSelect({ value }: { value?: string }) {
  return (
    <select name="type" defaultValue={value ?? "WASHER"} className={field} aria-label="Tipo">
      {Object.entries(MACHINE_TYPES).map(([k, label]) => (
        <option key={k} value={k}>
          {label}
        </option>
      ))}
    </select>
  );
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ esito?: string }> }) {
  const admin = await requireAdmin();
  const { esito } = await searchParams;
  const now = new Date();

  const [settings, machines, bookings, users] = await Promise.all([
    getSettings(),
    prisma.machine.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      include: { _count: { select: { bookings: { where: { end: { gt: now } } } } } },
    }),
    prisma.booking.findMany({
      where: { end: { gt: now } },
      include: { machine: true, user: true },
      orderBy: { start: "asc" },
      take: 100,
    }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Gestione</h1>
      <Flash code={esito} />

      <section className={card}>
        <h2 className={h2}>Regole di prenotazione</h2>
        <form action={saveSettings} className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm text-slate-700">
            Durata turno
            <select name="slotMinutes" defaultValue={settings.slotMinutes} className={`${field} mt-1 block w-full`}>
              {[30, 45, 60, 90, 120, 150, 180].map((m) => (
                <option key={m} value={m}>
                  {m} minuti
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-700">
            Apertura (ora)
            <input name="openHour" type="number" min={0} max={23} defaultValue={settings.openHour} className={`${field} mt-1 block w-full`} />
          </label>
          <label className="text-sm text-slate-700">
            Chiusura (ora)
            <input name="closeHour" type="number" min={1} max={24} defaultValue={settings.closeHour} className={`${field} mt-1 block w-full`} />
          </label>
          <label className="text-sm text-slate-700">
            Prenotazioni attive per persona
            <input name="maxActiveBookings" type="number" min={1} max={50} defaultValue={settings.maxActiveBookings} className={`${field} mt-1 block w-full`} />
          </label>
          <label className="text-sm text-slate-700">
            Giorni prenotabili in anticipo
            <input name="maxDaysAhead" type="number" min={1} max={60} defaultValue={settings.maxDaysAhead} className={`${field} mt-1 block w-full`} />
          </label>
          <label className="text-sm text-slate-700">
            Codice di registrazione
            <input name="registrationCode" defaultValue={settings.registrationCode ?? ""} placeholder="vuoto = registrazione libera" className={`${field} mt-1 block w-full`} />
          </label>
          <div className="sm:col-span-3">
            <SubmitButton className={primary}>Salva regole</SubmitButton>
          </div>
        </form>
      </section>

      <section className={card}>
        <h2 className={h2}>Macchine</h2>
        <ul className="divide-y divide-slate-100">
          {machines.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-2 py-3">
              <form action={updateMachine} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={m.id} />
                <input name="name" defaultValue={m.name} required maxLength={40} className={`${field} w-40`} aria-label="Nome" />
                <TypeSelect value={m.type} />
                <input name="sortOrder" type="number" min={0} max={999} defaultValue={m.sortOrder} className={`${field} w-16`} aria-label="Ordine" title="Ordine di visualizzazione" />
                <SubmitButton className={secondary}>Salva</SubmitButton>
              </form>
              <form action={toggleMachine}>
                <input type="hidden" name="id" value={m.id} />
                <SubmitButton className={secondary}>{m.active ? "Disattiva" : "Riattiva"}</SubmitButton>
              </form>
              <form action={deleteMachine}>
                <input type="hidden" name="id" value={m.id} />
                <SubmitButton
                  className={danger}
                  confirm={`Eliminare "${m.name}"? Verranno cancellate anche tutte le sue prenotazioni (${m._count.bookings} future).`}
                >
                  Elimina
                </SubmitButton>
              </form>
              {!m.active && <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Fuori servizio</span>}
            </li>
          ))}
        </ul>
        <form action={addMachine} className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
          <input name="name" required maxLength={40} placeholder="Nome nuova macchina" className={`${field} w-48`} aria-label="Nome nuova macchina" />
          <TypeSelect />
          <input name="sortOrder" type="number" min={0} max={999} defaultValue={machines.length + 1} className={`${field} w-16`} aria-label="Ordine" />
          <SubmitButton className={primary}>Aggiungi</SubmitButton>
        </form>
      </section>

      <section className={card}>
        <h2 className={h2}>Prossime prenotazioni</h2>
        {bookings.length === 0 ? (
          <p className="text-sm text-slate-600">Nessuna prenotazione in programma.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 pr-3 font-medium">Giorno</th>
                  <th className="py-2 pr-3 font-medium">Orario</th>
                  <th className="py-2 pr-3 font-medium">Macchina</th>
                  <th className="py-2 pr-3 font-medium">Utente</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-3 capitalize">{formatDay(dayOf(b.start))}</td>
                    <td className="py-2 pr-3 tabular-nums">
                      {formatTime(b.start)}–{formatTime(b.end)}
                    </td>
                    <td className="py-2 pr-3">{b.machine.name}</td>
                    <td className="py-2 pr-3">
                      {b.user.name}
                      {b.user.apartment && <span className="text-slate-500"> ({b.user.apartment})</span>}
                    </td>
                    <td className="py-2 text-right">
                      <form action={cancel}>
                        <input type="hidden" name="bookingId" value={b.id} />
                        <input type="hidden" name="back" value="admin" />
                        <SubmitButton className={danger} confirm={`Annullare la prenotazione di ${b.user.name}?`}>
                          Annulla
                        </SubmitButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={card}>
        <h2 className={h2}>Utenti ({users.length})</h2>
        <ul className="divide-y divide-slate-100 text-sm">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div>
                <span className="font-medium text-slate-900">{u.name}</span>
                {u.apartment && <span className="text-slate-500"> · int. {u.apartment}</span>}
                <span className="text-slate-500"> · {u.email}</span>
                {u.role === "ADMIN" && <span className="ml-2 rounded bg-sky-100 px-2 py-0.5 text-xs text-sky-800">Admin</span>}
              </div>
              {u.id !== admin.id && (
                <form action={setRole}>
                  <input type="hidden" name="id" value={u.id} />
                  <input type="hidden" name="role" value={u.role === "ADMIN" ? "USER" : "ADMIN"} />
                  <SubmitButton className={secondary}>{u.role === "ADMIN" ? "Rimuovi admin" : "Rendi admin"}</SubmitButton>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
