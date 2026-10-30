"use client";

import { fontVariables } from "./fonts";
import { StatusScreen, primaryAction } from "@/components/StatusScreen";
import "./globals.css";

// Replaces the whole page, header included, when the layout itself fails:
// it loads the signed-in user from the database on every page.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html lang="it">
      <head>
        <title>Errore · Lavanderia</title>
      </head>
      <body className={`${fontVariables} antialiased`}>
        <main className="mx-auto max-w-7xl px-4 pt-6 pb-12 sm:px-6">
          <StatusScreen
            eyebrow="Errore"
            title="La lavanderia non risponde"
            actions={
              // A full reload, since the layout has to be loaded again too.
              <button type="button" onClick={() => window.location.reload()} className={primaryAction}>
                Riprova
              </button>
            }
          >
            <p>
              Non siamo riusciti a caricare la pagina. Di solito è un problema momentaneo: riprova tra qualche minuto.
              Se continua, avvisa l&apos;amministratore.
            </p>
            {error.digest && <p className="mt-3 font-mono text-xs text-muted">Codice errore: {error.digest}</p>}
          </StatusScreen>
        </main>
      </body>
    </html>
  );
}
