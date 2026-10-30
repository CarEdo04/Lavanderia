import Link from "next/link";
import { AuthCard } from "@/components/AuthCard";
import { NewPasswordForm } from "@/components/AuthForms";
import { canResetPassword, requireUser } from "@/lib/session";

export const metadata = { title: "Nuova password · Lavanderia" };

// The link in the password-reset email signs the user in and lands here.
// Without that link (or once it has expired) the password is changed from the
// account page, which asks for the current one.
export default async function NewPasswordPage() {
  const user = await requireUser();
  if (!(await canResetPassword(user.authId))) {
    return (
      <AuthCard title="Link scaduto">
        <div className="space-y-4 text-ink-2">
          <p>
            Questa pagina funziona solo subito dopo aver aperto il link dell&apos;email per reimpostare la password.
          </p>
          <p>
            Se ricordi la password attuale, cambiala dalla{" "}
            <Link href="/account#password" className="font-medium text-brand hover:underline">
              pagina del tuo account
            </Link>
            ; altrimenti{" "}
            <Link href="/password-dimenticata" className="font-medium text-brand hover:underline">
              chiedi un nuovo link
            </Link>
            .
          </p>
        </div>
      </AuthCard>
    );
  }
  return (
    <AuthCard
      title="Scegli una nuova password"
      intro={
        <>
          Account: <strong className="font-semibold break-all">{user.email}</strong>
        </>
      }
    >
      <NewPasswordForm />
    </AuthCard>
  );
}
