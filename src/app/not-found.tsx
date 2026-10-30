import Link from "next/link";
import { StatusScreen, primaryAction } from "@/components/StatusScreen";

export const metadata = { title: "Pagina non trovata · Lavanderia" };

export default function NotFound() {
  return (
    <StatusScreen
      eyebrow="Errore 404"
      title="Pagina non trovata"
      actions={
        <Link href="/" className={primaryAction}>
          Vai alla lavanderia
        </Link>
      }
    >
      <p>L&apos;indirizzo è sbagliato oppure la pagina non esiste più. Controlla il link o riparti dall&apos;inizio.</p>
    </StatusScreen>
  );
}
