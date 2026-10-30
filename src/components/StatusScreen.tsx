import type { ReactNode } from "react";
import { WasherIcon } from "./Icons";

export const primaryAction =
  "flex h-[52px] items-center justify-center rounded-2xl bg-brand px-6 font-semibold text-white hover:bg-brand-strong";
export const secondaryAction =
  "flex h-[50px] items-center justify-center rounded-2xl border border-line bg-white px-6 font-medium text-ink hover:bg-ground";

// Full-page message for the error and "page not found" screens. No hooks, so
// the client error boundaries can use it too.
export function StatusScreen({
  eyebrow,
  title,
  children,
  actions,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-10 text-center sm:py-16">
      <span aria-hidden className="grid size-20 place-items-center rounded-full border-[1.5px] border-dashed border-brand-line bg-white text-brand">
        <WasherIcon className="size-10" />
      </span>
      <p className="eyebrow mt-6 text-ink-2">{eyebrow}</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">{title}</h1>
      <div className="mt-3 leading-relaxed text-ink-2">{children}</div>
      <div className="mt-7 flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">{actions}</div>
    </div>
  );
}
