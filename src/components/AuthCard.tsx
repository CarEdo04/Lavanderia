import type { ReactNode } from "react";

// The card the account pages sit in: a blue band with the title, then the
// form. Edge to edge on phones.
export function AuthCard({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-md sm:py-6">
      <div className="-mx-4 -mt-6 overflow-hidden bg-white sm:mx-0 sm:mt-0 sm:rounded-3xl sm:border sm:border-line sm:shadow-sm">
        <div className="relative overflow-hidden bg-brand px-6 pt-10 pb-7 text-white">
          <svg aria-hidden viewBox="0 0 360 360" fill="none" className="absolute -top-12 -right-28 size-[340px]">
            <circle cx="180" cy="180" r="170" stroke="rgba(255,255,255,0.16)" strokeWidth="2" />
            <circle cx="180" cy="180" r="128" stroke="rgba(255,255,255,0.2)" strokeWidth="18" />
            <circle cx="180" cy="180" r="84" stroke="rgba(255,255,255,0.14)" strokeWidth="2" strokeDasharray="4 10" />
          </svg>
          <h1 className="relative text-3xl font-bold tracking-tight">{title}</h1>
          {intro && <div className="relative mt-1.5 max-w-xs text-white/90">{intro}</div>}
        </div>
        <div className="px-5 py-6 sm:px-6">{children}</div>
      </div>
    </div>
  );
}
