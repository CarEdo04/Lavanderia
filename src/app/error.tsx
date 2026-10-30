"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { StatusScreen, primaryAction, secondaryAction } from "@/components/StatusScreen";

// Shown in place of a page whose data couldn't be loaded (usually the database
// not answering for a moment). The header and tab bar stay usable.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <StatusScreen
      eyebrow="Errore"
      title="Qualcosa è andato storto"
      actions={
        <>
          <button
            type="button"
            disabled={pending}
            // The page is rendered on the server: refresh it, then leave the error state.
            onClick={() =>
              startTransition(() => {
                router.refresh();
                reset();
              })
            }
            className={`${primaryAction} disabled:cursor-wait disabled:opacity-60`}
          >
            {pending ? "Attendere…" : "Riprova"}
          </button>
          <Link href="/" className={secondaryAction}>
            Torna all&apos;inizio
          </Link>
        </>
      }
    >
      <p>
        Non siamo riusciti a caricare la pagina. Di solito è un problema momentaneo: riprova tra qualche secondo. Se
        continua, avvisa l&apos;amministratore.
      </p>
      {error.digest && <p className="mt-3 font-mono text-xs text-muted">Codice errore: {error.digest}</p>}
    </StatusScreen>
  );
}
