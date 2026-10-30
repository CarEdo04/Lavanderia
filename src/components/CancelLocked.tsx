import { LockIcon } from "./Icons";

// Takes the place of "Annulla" once a resident's shift is inside the notice
// window: it opens a card explaining that only an admin can cancel it now.
// `id` must be unique on the page.
export function CancelLocked({
  id,
  hours,
  className,
  label = "Annulla",
}: {
  id: string;
  hours: number;
  className: string;
  label?: string;
}) {
  return (
    <>
      <button type="button" popoverTarget={id} className={`inline-flex items-center justify-center gap-1 ${className}`}>
        <LockIcon className="size-[1.1em] flex-none" />
        {label}
      </button>
      <div
        id={id}
        popover="auto"
        // m-auto + fixed inset-0 centre it; Tailwind's reset removes the browser's own centring.
        className="fixed inset-0 m-auto h-fit w-80 max-w-[calc(100vw-2rem)] rounded-3xl border border-line bg-white p-5 text-left text-sm font-normal text-ink normal-case shadow-xl backdrop:bg-ink/30"
      >
        <p className="text-lg font-bold tracking-tight">Non puoi più annullarlo da qui</p>
        <p className="mt-2 leading-snug text-ink-2">
          Mancano meno di {hours} ore all&apos;inizio del turno, quindi nessun altro potrebbe più prenotarlo. Se non
          puoi usarlo, contatta l&apos;amministratore: può annullarlo per te.
        </p>
        <button
          type="button"
          popoverTarget={id}
          popoverTargetAction="hide"
          className="mt-4 h-11 w-full rounded-xl border border-line font-medium hover:bg-ground"
        >
          Chiudi
        </button>
      </div>
    </>
  );
}
