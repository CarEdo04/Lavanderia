import type { ReactNode } from "react";
import { formatDay } from "@/lib/time";

type Notice = { id: number; message: string; level: string; startDay: string; endDay: string };

const longDate = (day: string) => formatDay(day, { weekday: "short", day: "numeric", month: "long" });

export function noticePeriod(n: Pick<Notice, "startDay" | "endDay">) {
  return n.startDay === n.endDay ? longDate(n.startDay) : `dal ${longDate(n.startDay)} al ${longDate(n.endDay)}`;
}

export function NoticeBox({ notice, children }: { notice: Notice; children?: ReactNode }) {
  const warning = notice.level === "WARNING";
  return (
    <div
      role={warning ? "alert" : "status"}
      className={`flex flex-wrap items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
        warning ? "border-amber-300 bg-amber-50 text-amber-950" : "border-sky-200 bg-sky-50 text-sky-950"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide opacity-75">
          {warning ? "Attenzione" : "Avviso"} · {noticePeriod(notice)}
        </p>
        <p className="whitespace-pre-line break-words">{notice.message}</p>
      </div>
      {children}
    </div>
  );
}

export function Notices({ notices }: { notices: Notice[] }) {
  if (notices.length === 0) return null;
  return (
    <div className="mb-4 space-y-2">
      {notices.map((n) => (
        <NoticeBox key={n.id} notice={n} />
      ))}
    </div>
  );
}
