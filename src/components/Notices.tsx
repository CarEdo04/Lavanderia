import type { ReactNode } from "react";
import { AlertIcon, InfoIcon } from "./Icons";
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
      className={`flex flex-wrap items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
        warning ? "border-warn-line bg-warn text-warn-ink" : "border-brand-line bg-brand-soft text-brand-ink"
      }`}
    >
      {warning ? (
        <AlertIcon className="mt-0.5 size-5 flex-none text-warn-strong" />
      ) : (
        <InfoIcon className="mt-0.5 size-5 flex-none text-brand" />
      )}
      <div className="min-w-0 flex-1">
        <p className={`eyebrow mb-0.5 text-[11px] ${warning ? "text-warn-strong" : "text-brand"}`}>
          {warning ? "Attenzione" : "Avviso"} · {noticePeriod(notice)}
        </p>
        <p className="leading-snug break-words whitespace-pre-line">{notice.message}</p>
      </div>
      {children}
    </div>
  );
}

export function Notices({ notices }: { notices: Notice[] }) {
  if (notices.length === 0) return null;
  return (
    <div className="mb-5 space-y-2">
      {notices.map((n) => (
        <NoticeBox key={n.id} notice={n} />
      ))}
    </div>
  );
}
