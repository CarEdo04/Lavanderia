import { NewPasswordForm } from "@/components/AuthForms";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Nuova password · Lavanderia" };

// The link in the password-reset email signs the user in and lands here.
export default async function NewPasswordPage() {
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">Scegli una nuova password</h1>
      <p className="mb-6 text-sm text-slate-600">
        Account: <strong className="text-slate-900">{user.email}</strong>
      </p>
      <NewPasswordForm />
    </div>
  );
}
