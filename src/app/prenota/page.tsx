import Link from "next/link";
import type { ReactNode } from "react";
import { book, cancel } from "../actions";
import { CancelLocked } from "@/components/CancelLocked";
import { Flash } from "@/components/Flash";
import { ClockIcon, LockIcon, PlusIcon, TicketIcon, UndoIcon, WasherIcon } from "@/components/Icons";
import { Notices } from "@/components/Notices";
import { ScrollHere } from "@/components/ScrollHere";
import { SubmitButton } from "@/components/SubmitButton";
import { canCancel, getSettings, isTooLate } from "@/lib/booking";
import { prisma } from "@/lib/db";
import { fullName, initials } from "@/lib/people";
import { requireVerifiedUser } from "@/lib/session";
import {
  addDays,
  dayOf,
  daysUntil,
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

const LONG = { weekday: "long", day: "numeric", month: "long" } as const;
const shortDate = (day: string) => formatDay(day, { day: "numeric", month: "short" });
const timeRange = (slot: Slot) => `${formatTime(slot.start)} – ${formatTime(slot.end)}`;

function formatWindow(days: number) {
  if (days % 7 !== 0) return days === 1 ? "1 giorno" : `${days} giorni`;
  return days === 7 ? "1 settimana" : `${days / 7} settimane`;
}

// "2 – 8 nov", or "26 ott – 1 nov" across two months.
function weekLabel(monday: string) {
  const sunday = addDays(monday, 6);
  const from = monday.slice(5, 7) === sunday.slice(5, 7) ? formatDay(monday, { day: "numeric" }) : shortDate(monday);
  return `${from} – ${shortDate(sunday)}`;
}

type Kind = "free" | "mine" | "taken" | "closed" | "past" | "later";

const STATUS: Record<Kind, string> = {
  free: "Libero",
  mine: "Il tuo turno",
  taken: "Occupato",
  closed: "Prenotazioni chiuse",
  past: "Concluso",
  later: "Non ancora prenotabile",
};

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ giorno?: string; settimana?: string; macchina?: string; esito?: string }>;
}) {
  const user = await requireVerifiedUser();
  const { giorno, settimana, macchina, esito } = await searchParams;
  const settings = await getSettings();
  const isAdmin = user.role === "ADMIN";
  const now = new Date();
  const first = today();
  const lastDay = addDays(first, Math.max(1, settings.maxDaysAhead) - 1);

  // Every open day from today to the end of the booking window.
  const days: { day: string; slots: Slot[] }[] = [];
  for (let day = first; day <= lastDay; day = addDays(day, 1)) {
    const slots = slotsForDay(day, settings);
    if (slots.length > 0) days.push({ day, slots });
  }
  const weeks = [...new Set(days.map((d) => mondayOf(d.day)))];

  const machines = await prisma.machine.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  const machine = machines.find((m) => String(m.id) === macchina) ?? machines[0];
  const rangeStart = localToUtc(mondayOf(first), 0);
  const rangeEnd = localToUtc(addDays(mondayOf(lastDay), 7), 0);

  const [bookings, mine, notices, residents] = await Promise.all([
    machine
      ? prisma.booking.findMany({
          where: { machineId: machine.id, start: { lt: rangeEnd }, end: { gt: rangeStart } },
          // Residents only see who booked by name; the contact details are for admins.
          include: {
            user: {
              select: { firstName: true, lastName: true, username: isAdmin, email: isAdmin, room: isAdmin },
            },
          },
        })
      : [],
    prisma.booking.findMany({
      where: { userId: user.id, end: { gt: now } },
      include: { machine: true },
      orderBy: { start: "asc" },
    }),
    prisma.notice.findMany({
      where: { startDay: { lte: lastDay }, endDay: { gte: first } },
      orderBy: [{ level: "desc" }, { startDay: "asc" }, { id: "asc" }],
    }),
    // Admins can book for someone else, picked from this list.
    isAdmin
      ? prisma.user.findMany({
          where: { username: { not: null } },
          select: { username: true, firstName: true, lastName: true, room: true },
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        })
      : [],
  ]);
  // Admins can book for others, so their own limit doesn't grey out the grid.
  const atLimit = !isAdmin && mine.length >= settings.maxActiveBookings;
  const next = mine[0];
  const hours = settings.minHoursBefore;

  // `late`: inside the notice window, where only admins can still book.
  function stateOf(day: string, slot: Slot) {
    const booking = bookings.find((b) => b.start < slot.end && b.end > slot.start);
    const late = isTooLate(slot, settings, now);
    const kind: Kind = booking
      ? booking.userId === user.id
        ? "mine"
        : "taken"
      : slot.end <= now
        ? "past"
        : day > lastDay
          ? "later"
          : late && !isAdmin
            ? "closed"
            : "free";
    return { kind, booking, late };
  }
  const freeCount = (d: (typeof days)[number]) => d.slots.filter((s) => stateOf(d.day, s).kind === "free").length;

  // Phones show one day: the one asked for, else the first with a free shift
  // in the chosen week (or in the whole window).
  const week = settimana && weeks.includes(settimana) ? settimana : undefined;
  const pool = week ? days.filter((d) => mondayOf(d.day) === week) : days;
  const selected = days.find((d) => d.day === giorno) ?? pool.find((d) => freeCount(d) > 0) ?? pool[0];
  // Larger screens show that day's whole week. Days outside the window stay
  // in the grid so the weeks line up.
  const shownWeek = selected ? mondayOf(selected.day) : undefined;
  const weekDays = shownWeek
    ? Array.from({ length: 7 }, (_, i) => addDays(shownWeek, i))
        .map((day) => ({ day, slots: slotsForDay(day, settings) }))
        .filter((d) => d.slots.length > 0)
    : [];
  const rowLabels = weekDays.reduce<Slot[]>((longest, d) => (d.slots.length > longest.length ? d.slots : longest), []);

  const link = (params: Record<string, string>) => {
    const query = new URLSearchParams(params);
    if (machine && machines.length > 1) query.set("macchina", String(machine.id));
    return `/prenota?${query}`;
  };

  function bookButton(day: string, slot: Slot, late: boolean, className: string, label: ReactNode) {
    return (
      <form action={book}>
        <input type="hidden" name="machineId" value={machine!.id} />
        <input type="hidden" name="start" value={slot.start.toISOString()} />
        <input type="hidden" name="day" value={day} />
        <SubmitButton
          // At the limit the server explains why it can't be booked.
          confirm={atLimit ? undefined : "Confermi il turno?"}
          confirmLabel="Conferma prenotazione"
          details={
            <>
              <div className="rounded-2xl border-[1.5px] border-brand bg-brand-soft px-4 py-3.5">
                <p className="text-xl font-bold first-letter:uppercase">{formatDay(day, LONG)}</p>
                <p className="mt-0.5 font-mono text-lg font-medium text-brand">{timeRange(slot)}</p>
                <p className="mt-2 text-sm text-ink-2">
                  {machine!.name} · turno da {formatDuration(settings.slotMinutes)}
                </p>
              </div>
              {isAdmin && (
                <label className="mt-4 block text-sm font-semibold text-ink">
                  Per chi <span className="font-normal text-ink-2">(username; vuoto = per te)</span>
                  <input
                    name="per"
                    list="residenti"
                    autoComplete="off"
                    autoCapitalize="none"
                    placeholder="cognome.nome"
                    className="mt-1.5 block h-12 w-full rounded-xl border-[1.5px] border-line bg-white px-3.5 font-mono text-base font-normal text-ink focus:border-brand focus:outline-none"
                  />
                </label>
              )}
              <ul className="mt-4 space-y-2.5 text-sm leading-snug text-ink-2">
                {isAdmin && late && (
                  <li className="flex gap-2.5">
                    <LockIcon className="mt-px size-[18px] flex-none text-brand" />
                    <span>
                      Mancano meno di {hours} ore: i residenti non possono più prenotarlo né annullarlo, tu sì.
                    </span>
                  </li>
                )}
                <li className="flex gap-2.5">
                  <ClockIcon className="mt-px size-[18px] flex-none text-brand" />
                  <span>
                    Libera la lavanderia entro le <strong className="text-ink">{formatTime(slot.end)}</strong>, anche se
                    il bucato non è finito.
                  </span>
                </li>
                {!isAdmin && (
                  <li className="flex gap-2.5">
                    <TicketIcon className="mt-px size-[18px] flex-none text-brand" />
                    <span>
                      Dopo questa avrai{" "}
                      <strong className="text-ink">
                        {mine.length + 1} di {settings.maxActiveBookings}
                      </strong>{" "}
                      prenotazioni attive.
                    </span>
                  </li>
                )}
                {!isAdmin && (
                  <li className="flex gap-2.5">
                    <UndoIcon className="mt-px size-[18px] flex-none text-brand" />
                    <span>
                      {hours > 0
                        ? `Puoi annullarla fino a ${hours} ore prima dell'inizio; dopo, solo l'amministratore può farlo.`
                        : "Puoi annullarla fino all'inizio del turno."}
                    </span>
                  </li>
                )}
              </ul>
            </>
          }
          pendingText="…"
          className={className}
        >
          {label}
        </SubmitButton>
      </form>
    );
  }

  // `day` is where the page goes back to afterwards.
  function cancelButton(b: { id: number; start: Date; end: Date }, day: string, className: string, label: string) {
    return (
      <form action={cancel}>
        <input type="hidden" name="bookingId" value={b.id} />
        {machine && <input type="hidden" name="machineId" value={machine.id} />}
        <input type="hidden" name="day" value={day} />
        <input type="hidden" name="back" value="prenota" />
        <SubmitButton
          confirm="Vuoi annullare questo turno?"
          confirmLabel="Annulla turno"
          danger
          details={
            <p className="text-ink-2 first-letter:uppercase">
              {formatDay(dayOf(b.start), LONG)}, {timeRange(b)}. Il turno tornerà
              libero per gli altri.
            </p>
          }
          pendingText="…"
          className={className}
        >
          {label}
        </SubmitButton>
      </form>
    );
  }

  // "Annulla" while the user may still cancel, else the card that sends them to an admin.
  // Each booking can be drawn more than once (phone, grid, next shift), hence the view in the id.
  function cancelControl(
    b: { id: number; start: Date; end: Date },
    day: string,
    view: "phone" | "grid" | "next",
    className: string,
    label: string,
  ) {
    return canCancel(b, user, settings, now) ? (
      cancelButton(b, day, className, label)
    ) : (
      <CancelLocked id={`annulla-${b.id}-${view}`} hours={hours} className={className} label={label} />
    );
  }

  function booker(
    b: NonNullable<ReturnType<typeof stateOf>["booking"]>,
    day: string,
    slot: Slot,
    view: "phone" | "grid",
    className: string,
  ) {
    // The full name: on one line on phones, first name over surname in the narrow grid cells.
    const name =
      view === "grid" ? (
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate font-medium">{b.user.firstName}</span>
          <span className="truncate">{b.user.lastName}</span>
        </span>
      ) : (
        <span className="truncate font-medium">{fullName(b.user)}</span>
      );
    // Residents only see the name.
    if (!isAdmin) {
      return (
        <div className={className} title={fullName(b.user)}>
          <span className="sr-only">Prenotato da </span>
          {name}
        </div>
      );
    }

    const cardId = `prenotazione-${b.id}-${view}`;
    return (
      <>
        <button
          type="button"
          popoverTarget={cardId}
          title="Dettagli della prenotazione"
          className={`${className} hover:bg-taken-strong`}
        >
          {name}
        </button>
        <div
          id={cardId}
          popover="auto"
          // m-auto + fixed inset-0 centre it; Tailwind's reset removes the browser's own centring.
          className="fixed inset-0 m-auto h-fit w-72 max-w-[calc(100vw-2rem)] rounded-3xl border border-line bg-white p-5 text-sm text-ink shadow-xl backdrop:bg-ink/30"
        >
          <p className="eyebrow mb-3 text-[11px] text-ink-2">
            {formatDay(day, LONG)} · {timeRange(slot)}
          </p>
          <div className="flex items-center gap-3">
            <span aria-hidden className="grid size-11 flex-none place-items-center rounded-full bg-taken-strong font-bold">
              {initials(b.user)}
            </span>
            <div className="min-w-0">
              <p className="text-base font-semibold">{fullName(b.user)}</p>
              {b.user.username && <p className="truncate font-mono text-[13px] text-ink-2">{b.user.username}</p>}
            </div>
          </div>
          <a href={`mailto:${b.user.email}`} className="mt-3 block font-medium break-all text-brand hover:underline">
            {b.user.email}
          </a>
          {b.user.room && <p className="mt-1 text-ink-2">Stanza {b.user.room}</p>}
          {slot.start > now &&
            cancelButton(
              b,
              day,
              "mt-4 h-11 w-full rounded-xl border border-red-200 font-medium text-red-700 hover:bg-red-50",
              "Annulla prenotazione",
            )}
          <button
            type="button"
            popoverTarget={cardId}
            popoverTargetAction="hide"
            className="mt-2 h-11 w-full rounded-xl border border-line font-medium hover:bg-ground"
          >
            Chiudi
          </button>
        </div>
      </>
    );
  }

  function phoneRow(day: string, slot: Slot) {
    const { kind, booking: b, late } = stateOf(day, slot);
    const grey = kind === "closed" || kind === "past" || kind === "later";
    return (
      <li
        key={slot.start.toISOString()}
        className={`flex min-h-[76px] items-center gap-3 py-2 pr-3 pl-4 ${grey ? "hatch" : kind === "mine" ? "bg-brand-soft" : ""}`}
      >
        <div className="min-w-0 flex-1">
          <p className={`font-mono text-base font-medium ${grey ? "text-muted" : ""}`}>{timeRange(slot)}</p>
          <p className={`mt-0.5 text-[13px] font-semibold ${kind === "free" || kind === "mine" ? "text-brand" : "text-muted"}`}>
            {kind === "mine" && slot.start <= now
              ? "Il tuo turno · in corso"
              : kind === "free" && late
                ? "Libero · solo admin"
                : STATUS[kind]}
          </p>
        </div>
        {kind === "free" &&
          bookButton(
            day,
            slot,
            late,
            `inline-flex h-12 items-center gap-1.5 rounded-xl border-[1.5px] px-4 text-[15px] font-semibold ${
              atLimit ? "border-line text-muted" : "border-brand bg-white text-brand hover:bg-brand-soft"
            }`,
            <>
              <PlusIcon />
              Prenota
            </>,
          )}
        {kind === "mine" &&
          slot.start > now &&
          cancelControl(
            b!,
            day,
            "phone",
            "h-11 rounded-xl border border-brand-line bg-white px-3.5 text-sm font-medium text-ink hover:border-red-300 hover:text-red-700",
            "Annulla",
          )}
        {kind === "taken" &&
          booker(
            b!,
            day,
            slot,
            "phone",
            "flex h-11 max-w-[55%] items-center rounded-full border border-line bg-taken px-3.5 text-sm text-ink",
          )}
        {kind === "closed" && (
          <span title={`Le prenotazioni chiudono ${settings.minHoursBefore} ore prima del turno`}>
            <LockIcon className="size-5 text-muted" />
          </span>
        )}
      </li>
    );
  }

  function gridCell(day: string, slot: Slot) {
    const { kind, booking: b, late } = stateOf(day, slot);
    const box = "flex h-[52px] w-full items-center rounded-xl text-sm";
    switch (kind) {
      case "free":
        return bookButton(
          day,
          slot,
          late,
          `${box} justify-center gap-1 border-[1.5px] font-semibold ${
            atLimit
              ? "border-line text-muted"
              : "border-brand-line bg-white text-brand hover:border-brand hover:bg-brand-soft"
          }`,
          // Only admins get here inside the notice window.
          late ? (
            <>
              <LockIcon className="size-4" />
              Libero<span className="sr-only">, solo admin</span>
            </>
          ) : (
            "Libero"
          ),
        );
      case "mine":
        return (
          <div className={`${box} flex-col items-start justify-center bg-brand px-2.5 text-white`}>
            <span className="font-semibold">Tuo turno</span>
            {slot.start > now ? (
              cancelControl(b!, day, "grid", "text-xs text-white/90 underline hover:text-white", "Annulla")
            ) : (
              <span className="text-xs text-white/90">in corso</span>
            )}
          </div>
        );
      case "taken":
        return booker(b!, day, slot, "grid", `${box} bg-taken px-2.5 text-left text-[13px] text-ink`);
      case "closed":
        return (
          <div
            className={`${box} hatch justify-center font-medium text-muted`}
            title={`Le prenotazioni chiudono ${settings.minHoursBefore} ore prima del turno`}
          >
            Chiuso
          </div>
        );
      default:
        return (
          <div className={`${box} hatch justify-center text-muted`} title={STATUS[kind]}>
            <span aria-hidden>—</span>
            <span className="sr-only">{STATUS[kind]}</span>
          </div>
        );
    }
  }

  const nextDay = next && dayOf(next.start);
  const max = settings.maxActiveBookings;

  return (
    <div>
      <p className="eyebrow mb-1 text-ink-2">{formatDay(first, { weekday: "long", day: "numeric", month: "long" })}</p>
      <h1 className="text-3xl font-bold tracking-tight">
        <span className="sm:hidden">Ciao, {user.firstName}</span>
        <span className="max-sm:hidden">Prenota un turno</span>
      </h1>
      <p className="mt-1 mb-5 text-sm text-ink-2">
        Turni da {formatDuration(settings.slotMinutes)}. Si prenota e si annulla almeno {hours} ore prima del turno, e si
        prenota fino a {formatWindow(settings.maxDaysAhead)} in anticipo.
      </p>

      <Flash code={esito} />

      {isAdmin && (
        <datalist id="residenti">
          {residents.map((r) => (
            <option key={r.username} value={r.username!}>
              {fullName(r)}
              {r.room ? ` · stanza ${r.room}` : ""}
            </option>
          ))}
        </datalist>
      )}

      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        <aside className="flex flex-col gap-4 xl:order-last xl:w-80 xl:flex-none">
          {next ? (
            <section aria-labelledby="prossimo-turno" className="rounded-[20px] bg-brand px-5 pt-[18px] pb-4 text-white">
              <div className="flex items-center justify-between gap-3">
                <h2 id="prossimo-turno" className="eyebrow">
                  Il tuo prossimo turno
                </h2>
                <span className="rounded-full bg-white/20 px-2.5 py-1 text-[13px] font-semibold">
                  {next.start <= now ? "in corso" : daysUntil(nextDay!)}
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold tracking-tight first-letter:uppercase">{formatDay(nextDay!, LONG)}</p>
              <p className="font-mono text-xl font-medium">{timeRange(next)}</p>
              <div aria-hidden className="relative -mx-5 my-4 border-t-[1.5px] border-dashed border-white/45">
                <span className="absolute -top-3 -left-[11px] size-[22px] rounded-full bg-ground" />
                <span className="absolute -top-3 -right-[11px] size-[22px] rounded-full bg-ground" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-[15px]">
                  <WasherIcon className="size-[18px] flex-none" />
                  <span className="truncate">{next.machine.name}</span>
                </span>
                {next.start > now &&
                  cancelControl(
                    next,
                    selected?.day ?? first,
                    "next",
                    "h-11 rounded-xl border-[1.5px] border-white/70 px-4 text-[15px] font-semibold text-white hover:bg-white/10",
                    "Annulla turno",
                  )}
              </div>
            </section>
          ) : (
            <section className="rounded-[20px] border-[1.5px] border-dashed border-ink-2/40 px-5 py-4">
              <h2 className="eyebrow text-ink-2">Il tuo prossimo turno</h2>
              <p className="mt-2 text-ink-2">Nessun turno in programma: scegline uno libero dal calendario.</p>
            </section>
          )}

          <div className="flex items-center justify-between gap-3 xl:rounded-2xl xl:border xl:border-line xl:bg-white xl:p-4">
            <span className="text-sm whitespace-nowrap text-ink-2">Prenotazioni attive</span>
            <span className="flex items-center gap-2.5">
              {max <= 10 && (
                <span aria-hidden className="flex gap-1">
                  {Array.from({ length: max }, (_, i) => (
                    <span key={i} className={`h-2 w-[22px] rounded ${i < mine.length ? "bg-brand" : "bg-line"}`} />
                  ))}
                </span>
              )}
              <span className="font-mono text-sm font-medium whitespace-nowrap">
                {mine.length} di {max}
              </span>
            </span>
          </div>

          <section aria-labelledby="legenda" className="hidden rounded-2xl border border-line bg-white p-4 xl:block">
            <h2 id="legenda" className="mb-3 text-[15px] font-semibold">
              Legenda
            </h2>
            <ul className="space-y-2.5 text-sm text-ink-2">
              <li className="flex items-center gap-2.5">
                <span aria-hidden className="h-[18px] w-7 rounded-md border-[1.5px] border-brand-line" />
                Libero: clicca per prenotare
              </li>
              <li className="flex items-center gap-2.5">
                <span aria-hidden className="h-[18px] w-7 rounded-md bg-brand" />
                Il tuo turno
              </li>
              <li className="flex items-center gap-2.5">
                <span aria-hidden className="h-[18px] w-7 rounded-md bg-taken-strong" />
                {isAdmin ? "Occupato: clicca per i dettagli" : "Occupato, con il nome di chi ha prenotato"}
              </li>
              {isAdmin && (
                <li className="flex items-center gap-2.5">
                  <span aria-hidden className="grid h-[18px] w-7 place-items-center rounded-md border-[1.5px] border-brand-line">
                    <LockIcon className="size-3 text-brand" />
                  </span>
                  Dentro il preavviso: prenotabile solo dagli admin
                </li>
              )}
              <li className="flex items-center gap-2.5">
                <span aria-hidden className="hatch h-[18px] w-7 rounded-md border border-line" />
                Chiuso o concluso
              </li>
            </ul>
          </section>
        </aside>

        <div className="min-w-0 flex-1">
          <Notices notices={notices} />

          {machines.length > 1 && (
            <nav aria-label="Scegli la macchina" className="mb-5 flex flex-wrap gap-1 rounded-[14px] bg-taken-strong p-1">
              {machines.map((m) => (
                <Link
                  key={m.id}
                  href={`/prenota?${new URLSearchParams({ macchina: String(m.id), ...(selected ? { giorno: selected.day } : {}) })}`}
                  scroll={false}
                  aria-current={m.id === machine?.id ? "page" : undefined}
                  className={`flex min-h-10 flex-1 items-center justify-center rounded-[10px] px-3 text-sm font-medium ${
                    m.id === machine?.id ? "bg-white text-ink shadow-sm" : "text-ink-2 hover:text-ink"
                  }`}
                >
                  {m.name}
                </Link>
              ))}
            </nav>
          )}

          {!machine ? (
            <p className="rounded-2xl border border-line bg-white p-6 text-ink-2">La lavanderia non è disponibile al momento.</p>
          ) : !selected ? (
            <p className="rounded-2xl border border-line bg-white p-6 text-ink-2">Nessun turno prenotabile.</p>
          ) : (
            <>
              {/* Phones: a row of days, then the chosen day's shifts */}
              <div className="sm:hidden">
                <div className="mb-2.5 flex items-baseline justify-between gap-3">
                  <h2 className="text-[17px] font-semibold">Scegli il giorno</h2>
                  <span className="text-[13px] text-ink-2">fino al {formatDay(lastDay, { day: "numeric", month: "long" })}</span>
                </div>
                <nav aria-label="Giorni" className="-mx-4">
                  <div className="relative flex gap-2 overflow-x-auto px-4 pt-0.5 pb-1.5 [scrollbar-width:none]">
                    {days.map((d) => {
                      const free = freeCount(d);
                      const open = d.slots.some((s) => !isTooLate(s, settings, now));
                      const meta = free > 0 ? (free === 1 ? "1 libero" : `${free} liberi`) : open ? "pieno" : "chiuso";
                      const current = d.day === selected.day;
                      return (
                        <Link
                          key={d.day}
                          href={link({ giorno: d.day })}
                          scroll={false}
                          aria-current={current ? "true" : undefined}
                          aria-label={`${formatDay(d.day, LONG)}, ${meta}`}
                          className={`flex w-16 flex-none flex-col items-center gap-0.5 rounded-[14px] border-[1.5px] pt-2.5 pb-[9px] ${
                            current
                              ? "border-brand bg-brand text-white"
                              : free > 0
                                ? "border-line bg-white text-ink"
                                : "border-transparent bg-taken-strong text-ink-2"
                          }`}
                        >
                          {current && <ScrollHere />}
                          <span className="eyebrow text-[11px]">{d.day === first ? "oggi" : formatDay(d.day, { weekday: "short" })}</span>
                          <span className="text-[22px] leading-tight font-bold">{formatDay(d.day, { day: "numeric" })}</span>
                          <span
                            className={`text-[11px] font-semibold ${current ? "text-white" : free > 0 ? "text-brand" : "text-ink-2"}`}
                          >
                            {meta}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </nav>

                <section aria-labelledby="giorno-scelto" className="mt-5">
                  <div className="mb-2.5 flex items-baseline justify-between gap-3">
                    <h2 id="giorno-scelto" className="text-[19px] font-bold tracking-tight first-letter:uppercase">
                      {formatDay(selected.day, LONG)}
                    </h2>
                    {machines.length > 1 && <span className="text-[13px] text-ink-2">{machine.name}</span>}
                  </div>
                  <ul className="divide-y divide-line-soft overflow-hidden rounded-[18px] border border-line bg-white">
                    {selected.slots.map((slot) => phoneRow(selected.day, slot))}
                  </ul>
                </section>
              </div>

              {/* Larger screens: one week at a time as a grid */}
              <div className="max-sm:hidden">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">Settimana</h2>
                  <nav aria-label="Settimane" className="flex flex-wrap gap-1 rounded-[14px] bg-taken-strong p-1">
                    {weeks.map((w) => (
                      <Link
                        key={w}
                        href={link({ settimana: w })}
                        scroll={false}
                        aria-current={w === shownWeek ? "page" : undefined}
                        className={`flex min-h-10 items-center rounded-[10px] px-3.5 font-mono text-[13px] font-medium ${
                          w === shownWeek ? "bg-white text-ink shadow-sm" : "text-ink-2 hover:text-ink"
                        }`}
                      >
                        {weekLabel(w)}
                      </Link>
                    ))}
                  </nav>
                </div>
                <div className="overflow-x-auto rounded-[18px] border border-line bg-white">
                  <table className="w-full min-w-[860px] table-fixed border-collapse text-sm">
                    <caption className="sr-only">Turni della settimana {weekLabel(shownWeek!)}</caption>
                    <thead>
                      <tr className="border-b border-line-soft bg-ground/50">
                        <th scope="col" className="w-36 py-3 pr-2 pl-4 text-left align-bottom text-[13px] font-normal text-ink-2">
                          Orario
                        </th>
                        {weekDays.map(({ day }) => (
                          <th
                            key={day}
                            scope="col"
                            aria-current={day === first ? "date" : undefined}
                            className={`px-2 py-3 text-left ${day === first ? "text-brand" : day >= first && day <= lastDay ? "" : "text-muted"}`}
                          >
                            <div className={`eyebrow text-[11px] font-normal ${day === first ? "" : "text-ink-2"}`}>
                              {day === first ? "oggi" : formatDay(day, { weekday: "short" })}
                            </div>
                            <div className="text-xl font-bold">
                              {formatDay(day, { day: "numeric" })}{" "}
                              <span className="text-[13px] font-medium text-ink-2">{formatDay(day, { month: "short" })}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rowLabels.map((label, i) => (
                        <tr key={i}>
                          <th scope="row" className="py-1 pr-2 pl-4 text-left font-mono text-[13px] font-normal whitespace-nowrap">
                            {timeRange(label)}
                          </th>
                          {weekDays.map(({ day, slots }) => (
                            <td key={day} className="px-[3px] py-1">
                              {slots[i] && gridCell(day, slots[i])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="h-2" />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
