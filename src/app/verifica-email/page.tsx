import { redirect } from "next/navigation";
import { logout, resendVerification } from "../actions";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Conferma l'email · Lavanderia" };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ esito?: string }> }) {
  const user = await requireUser();
  if (user.emailVerifiedAt) redirect("/prenota");
  const { esito } = await searchParams;

  return (
    <div className="mx-auto max-w-md py-10">
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">Conferma la tua email</h1>
      <p className="mb-6 text-slate-600">
        Ti abbiamo inviato un link a <strong className="text-slate-900">{user.email}</strong>. Aprilo per attivare
        l&apos;account e iniziare a prenotare. Se non lo trovi, controlla anche nella posta indesiderata.
      </p>
      <Flash code={esito} />
      <div className="flex flex-wrap gap-2">
        <form action={resendVerification}>
          <SubmitButton className="rounded-lg bg-sky-600 px-4 py-2 font-medium text-white hover:bg-sky-700">
            Invia di nuovo
          </SubmitButton>
        </form>
        <form action={logout}>
          <button className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">Esci</button>
        </form>
      </div>
    </div>
  );
}
