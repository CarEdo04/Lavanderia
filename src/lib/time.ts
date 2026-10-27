// All slot math happens in the laundry's local time zone, independent of
// where the server runs. Days are passed around as "YYYY-MM-DD" strings.
export const TZ = "Europe/Rome";

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDay(day: unknown): day is string {
  return typeof day === "string" && DAY_RE.test(day);
}

// Offset in ms between wall-clock time in `tz` and UTC at the given instant.
function tzOffset(date: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

// Converts a local wall-clock time (day + minutes since midnight) to a UTC Date.
export function localToUtc(day: string, minutes: number): Date {
  const [y, m, d] = day.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, 0, minutes);
  const first = tzOffset(new Date(guess), TZ);
  let ts = guess - first;
  const second = tzOffset(new Date(ts), TZ);
  if (second !== first) ts = guess - second; // crossed a DST change
  return new Date(ts);
}

export function dayOf(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(date);
}

export function today(): string {
  return dayOf(new Date());
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function formatDay(day: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Intl.DateTimeFormat("it-IT", { ...opts, timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("it-IT", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("it-IT", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(date);
}

// 0 = Sunday … 6 = Saturday, like Date#getDay.
export function weekday(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function mondayOf(day: string): string {
  return addDays(day, -((weekday(day) + 6) % 7));
}

export const WEEKDAYS =["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];

export function formatDuration(minutes: number): string {
  if (minutes % 60 !== 0) return `${minutes} minuti`;
  return minutes === 60 ? "1 ora" : `${minutes / 60} ore`;
}

export type Slot = { start: Date; end: Date };

// Returns no slots on closed weekdays.
export function slotsForDay(
  day: string,
  rules: { slotMinutes: number; openHour: number; closeHour: number; closedWeekdays?: string },
): Slot[] {
  if (rules.closedWeekdays?.includes(String(weekday(day)))) return [];
  const slots: Slot[] = [];
  for (let m = rules.openHour * 60; m + rules.slotMinutes <= rules.closeHour * 60; m += rules.slotMinutes) {
    slots.push({ start: localToUtc(day, m), end: localToUtc(day, m + rules.slotMinutes) });
  }
  return slots;
}
