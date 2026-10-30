import Link from "next/link";
import { cancel } from "../actions";
import {
  addMachine,
  addNotice,
  deleteMachine,
  deleteNotice,
  markVerified,
  saveRules,
  saveSettings,
  setRole,
  toggleMachine,
  updateMachine,
} from "./actions";
import { Flash } from "@/components/Flash";
import { NoticeBox } from "@/components/Notices";
import { SubmitButton } from "@/components/SubmitButton";
import { getSettings } from "@/lib/booking";
import { prisma } from "@/lib/db";
import { MACHINE_TYPES, NOTICE_LEVELS } from "@/lib/messages";
import { fullName } from "@/lib/people";
import { rulesText } from "@/lib/rules";
import { requireAdmin } from "@/lib/session";
import { WEEKDAYS, addDays, dayOf, formatDate, formatDay, formatDuration, formatTime, today } from "@/lib/time";

export const metadata = { title: "Gestione · Lavanderia" };

const card = "rounded-2xl border border-line bg-white p-4 sm:p-6";
const h2 = "mb-3 text-lg font-semibold";
const field = "rounded-lg border-[1.5px] border-line bg-white px-2.5 py-2 text-sm text-ink focus:border-brand focus:outline-none";
const primary = "rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong";
const secondary = "rounded-xl border border-line bg-white px-3.5 py-2 text-sm font-medium text-ink hover:bg-ground";
const danger = "rounded-xl border border-red-200 px-3.5 py-2 text-sm font-medium text-red-700 hover:bg-red-50";

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
  const first = today();

  const [settings, machines, bookings, users, notices] = await Promise.all([
    getSettings(),
    prisma.machine.findMany({
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      include: { _count: { select: { bookings: true } } },
    }),
    prisma.booking.findMany({
      where: { end: { gt: now } },
      include: { machine: true, user: true },
      orderBy: { start: "asc" },
      take: 100,
    }),
    prisma.user.findMany({ orderBy: [{ lastName: "asc" }, { firstName: "asc" }] }),
    // Expired notices drop off the list but stay in the database.
    prisma.notice.findMany({ where: { endDay: { gte: first } }, orderBy: [{ startDay: "asc" }, { id: "asc" }] }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Gestione</h1>
      <Flash code={esito} />

      <section className={card}>
        <h2 className={h2}>Avvisi</h2>
        <p className="mb-3 text-sm text-ink-2">
          Compaiono in cima alla pagina Prenota fino alla fine del periodo indicato.
        </p>
        {notices.length > 0 && (
          <div className="mb-4 space-y-2">
            {notices.map((n) => (
              <NoticeBox key={n.id} notice={n}>
                <form action={deleteNotice}>
                  <input type="hidden" name="id" value={n.id} />
                  <SubmitButton className={`${danger} bg-white`} confirm="Rimuovere questo avviso?" confirmLabel="Rimuovi" danger>
                    Rimuovi
                  </SubmitButton>
                </form>
              </NoticeBox>
            ))}
          </div>
        )}
        <form action={addNotice} className="grid gap-3 border-t border-line pt-4 sm:grid-cols-3">
          <label className="text-sm text-ink sm:col-span-3">
            Messaggio
            <textarea
              name="message"
              required
              rows={3}
              maxLength={500}
              placeholder="Es. Lavatrice guasta: il tecnico passa giovedì, turni sospesi fino ad allora."
              className={`${field} mt-1 block w-full`}
            />
          </label>
          <label className="text-sm text-ink">
            Tipo
            <select name="level" defaultValue="INFO" className={`${field} mt-1 block w-full`}>
              {Object.entries(NOTICE_LEVELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-ink">
            Dal
            <input name="startDay" type="date" required defaultValue={first} className={`${field} mt-1 block w-full`} />
          </label>
          <label className="text-sm text-ink">
            Al
            <input name="endDay" type="date" required defaultValue={addDays(first, 6)} className={`${field} mt-1 block w-full`} />
          </label>
          <div className="sm:col-span-3">
            <SubmitButton className={primary}>Pubblica avviso</SubmitButton>
          </div>
        </form>
      </section>

      <section className={card}>
        <h2 className={h2}>Regole di prenotazione</h2>
        <form action={saveSettings} className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm text-ink">
            Durata turno
            <select name="slotMinutes" defaultValue={settings.slotMinutes} className={`${field} mt-1 block w-full`}>
              {[30, 45, 60, 90, 120, 150, 180, 240].map((m) => (
                <option key={m} value={m}>
                  {formatDuration(m)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-ink">
            Apertura (ora)
            <input name="openHour" type="number" min={0} max={23} defaultValue={settings.openHour} className={`${field} mt-1 block w-full`} />
          </label>
          <label className="text-sm text-ink">
            Chiusura (ora)
            <input name="closeHour" type="number" min={1} max={24} defaultValue={settings.closeHour} className={`${field} mt-1 block w-full`} />
          </label>
          <label className="text-sm text-ink">
            Prenotazioni attive per persona
            <input name="maxActiveBookings" type="number" min={1} max={50} defaultValue={settings.maxActiveBookings} className={`${field} mt-1 block w-full`} />
          </label>
          <label className="text-sm text-ink">
            Giorni prenotabili in anticipo
            <input name="maxDaysAhead" type="number" min={1} max={60} defaultValue={settings.maxDaysAhead} className={`${field} mt-1 block w-full`} />
          </label>
          <label className="text-sm text-ink">
            Ore minime di anticipo
            <input name="minHoursBefore" type="number" min={0} max={720} defaultValue={settings.minHoursBefore} className={`${field} mt-1 block w-full`} />
          </label>
          <label className="text-sm text-ink">
            Codice di registrazione
            <input name="registrationCode" defaultValue={settings.registrationCode ?? ""} placeholder="vuoto = registrazione libera" className={`${field} mt-1 block w-full`} />
          </label>
          <fieldset className="text-sm text-ink sm:col-span-3">
            <legend>Giorni di apertura</legend>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <label key={d} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    name="openDays"
                    value={d}
                    defaultChecked={!settings.closedWeekdays.includes(String(d))}
                    className="h-4 w-4 accent-brand"
                  />
                  {WEEKDAYS[d]}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="sm:col-span-3">
            <SubmitButton className={primary}>Salva regole</SubmitButton>
          </div>
        </form>
      </section>

      <section className={card}>
        <h2 className={h2}>Regolamento</h2>
        <p className="mb-2 text-sm text-ink-2">
          Chi si registra deve accettarlo. Lascia vuoto per usare il testo predefinito. Righe vuote separano i paragrafi.
        </p>
        <form action={saveRules} className="space-y-3">
          <textarea
            name="rulesText"
            rows={10}
            maxLength={5000}
            defaultValue={rulesText(settings)}
            aria-label="Testo del regolamento"
            className={`${field} block w-full leading-relaxed`}
          />
          <SubmitButton className={primary}>Salva regolamento</SubmitButton>
        </form>
      </section>

      <section className={card}>
        <h2 className={h2}>Macchine</h2>
        <ul className="divide-y divide-line-soft">
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
              {/* Machines with bookings stay, so their history is kept: they can only be disabled. */}
              {m._count.bookings === 0 ? (
                <form action={deleteMachine}>
                  <input type="hidden" name="id" value={m.id} />
                  <SubmitButton className={danger} confirm={`Eliminare "${m.name}"?`} confirmLabel="Elimina" danger>
                    Elimina
                  </SubmitButton>
                </form>
              ) : (
                <span className="text-xs text-ink-2">{m._count.bookings} prenotazioni nello storico</span>
              )}
              {!m.active && <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Fuori servizio</span>}
            </li>
          ))}
        </ul>
        <form action={addMachine} className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <input name="name" required maxLength={40} placeholder="Nome nuova macchina" className={`${field} w-48`} aria-label="Nome nuova macchina" />
          <TypeSelect />
          <input name="sortOrder" type="number" min={0} max={999} defaultValue={machines.length + 1} className={`${field} w-16`} aria-label="Ordine" />
          <SubmitButton className={primary}>Aggiungi</SubmitButton>
        </form>
      </section>

      <section className={card}>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-ink">Prossime prenotazioni</h2>
          <Link href="/admin/storico" className="text-sm font-medium text-brand hover:underline">
            Storico delle prenotazioni ›
          </Link>
        </div>
        {bookings.length === 0 ? (
          <p className="text-sm text-ink-2">Nessuna prenotazione in programma.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-2">
                  <th className="py-2 pr-3 font-medium">Giorno</th>
                  <th className="py-2 pr-3 font-medium">Orario</th>
                  <th className="py-2 pr-3 font-medium">Macchina</th>
                  <th className="py-2 pr-3 font-medium">Utente</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b border-line-soft last:border-0">
                    <td className="py-2 pr-3 capitalize">{formatDay(dayOf(b.start))}</td>
                    <td className="py-2 pr-3 font-mono">
                      {formatTime(b.start)}–{formatTime(b.end)}
                    </td>
                    <td className="py-2 pr-3">{b.machine.name}</td>
                    <td className="py-2 pr-3">
                      {fullName(b.user)}
                      {b.user.room && <span className="text-ink-2"> (stanza {b.user.room})</span>}
                    </td>
                    <td className="py-2 text-right">
                      {b.start <= now ? (
                        <span className="text-xs font-medium text-emerald-700">in corso</span>
                      ) : (
                        <form action={cancel}>
                          <input type="hidden" name="bookingId" value={b.id} />
                          <input type="hidden" name="back" value="admin" />
                          <SubmitButton className={danger} confirm={`Annullare la prenotazione di ${fullName(b.user)}?`} confirmLabel="Annulla prenotazione" danger>
                            Annulla
                          </SubmitButton>
                        </form>
                      )}
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink-2">
                <th className="py-2 pr-3 font-medium">Nome</th>
                <th className="py-2 pr-3 font-medium">Cognome</th>
                <th className="py-2 pr-3 font-medium">Username</th>
                <th className="py-2 pr-3 font-medium">Email</th>
                <th className="py-2 pr-3 font-medium">Stanza</th>
                <th className="py-2 pr-3 font-medium">Regolamento</th>
                <th className="py-2 pr-3 font-medium">Registrato il</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-line-soft align-top last:border-0">
                  <td className="py-2 pr-3 font-medium text-ink">
                    {u.firstName}
                    {u.role === "ADMIN" && <span className="ml-2 rounded bg-brand-soft px-2 py-0.5 text-xs font-normal text-brand-ink">Admin</span>}
                  </td>
                  <td className="py-2 pr-3">{u.lastName || <span className="text-muted">—</span>}</td>
                  <td className="py-2 pr-3">{u.username ?? <span className="text-muted">—</span>}</td>
                  <td className="py-2 pr-3">
                    <div>{u.email}</div>
                    {u.emailVerifiedAt ? (
                      <span className="text-xs text-emerald-700">verificata</span>
                    ) : (
                      <span className="text-xs text-amber-700">da verificare</span>
                    )}
                  </td>
                  <td className="py-2 pr-3">{u.room ?? <span className="text-muted">—</span>}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {u.rulesAcceptedAt ? (
                      `accettato il ${formatDate(u.rulesAcceptedAt)}`
                    ) : (
                      <span className="text-muted">non accettato</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap font-mono">{formatDate(u.createdAt)}</td>
                  <td className="py-2">
                    <div className="flex justify-end gap-2">
                      {!u.emailVerifiedAt && (
                        <form action={markVerified}>
                          <input type="hidden" name="id" value={u.id} />
                          <SubmitButton className={secondary}>Conferma email</SubmitButton>
                        </form>
                      )}
                      {u.id !== admin.id && (
                        <form action={setRole}>
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="role" value={u.role === "ADMIN" ? "USER" : "ADMIN"} />
                          <SubmitButton className={`${secondary} whitespace-nowrap`}>
                            {u.role === "ADMIN" ? "Rimuovi admin" : "Rendi admin"}
                          </SubmitButton>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
