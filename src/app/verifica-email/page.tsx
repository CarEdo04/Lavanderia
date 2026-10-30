import Link from "next/link";
import { redirect } from "next/navigation";
import { logout, resendVerification } from "../actions";
import { AuthCard } from "@/components/AuthCard";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { getCurrentUser, pendingEmail } from "@/lib/session";

export const metadata = { title: "Conferma l'email · Lavanderia" };

// Shown after registering, or after trying to log in before confirming.
export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ esito?: string }> }) {
  const user = await getCurrentUser();
  if (user?.emailVerifiedAt) redirect("/prenota");
  const email = user?.email ?? (await pendingEmail());
  if (!email) redirect("/login");
  const { esito } = await searchParams;
  const secondary = "flex h-[50px] items-center justify-center rounded-2xl border border-line px-5 font-medium text-ink hover:bg-ground";

  return (
    <AuthCard title="Conferma la tua email">
      <p className="mb-5 text-ink-2">
        Ti abbiamo inviato un link a <strong className="break-all text-ink">{email}</strong>. Aprilo per attivare
        l&apos;account e iniziare a prenotare. Se non lo trovi, controlla anche nella posta indesiderata.
      </p>
      <Flash code={esito} />
      <div className="flex flex-col gap-2.5">
        <form action={resendVerification}>
          <SubmitButton className="h-[52px] w-full rounded-2xl bg-brand px-5 font-semibold text-white hover:bg-brand-strong">
            Invia di nuovo
          </SubmitButton>
        </form>
        {user ? (
          <form action={logout}>
            <button className={`${secondary} w-full`}>Esci</button>
          </form>
        ) : (
          <Link href="/login" className={secondary}>
            Torna all&apos;accesso
          </Link>
        )}
      </div>
    </AuthCard>
  );
}
