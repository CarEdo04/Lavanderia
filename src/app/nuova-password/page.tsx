import { AuthCard } from "@/components/AuthCard";
import { NewPasswordForm } from "@/components/AuthForms";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Nuova password · Lavanderia" };

// The link in the password-reset email signs the user in and lands here.
export default async function NewPasswordPage() {
  const user = await requireUser();
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
