import { AuthCard } from "@/components/AuthCard";
import { ResetRequestForm } from "@/components/AuthForms";

export const metadata = { title: "Password dimenticata · Lavanderia" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Password dimenticata"
      intro="Inserisci la tua email o il tuo username: ti invieremo un link per sceglierne una nuova."
    >
      <ResetRequestForm />
    </AuthCard>
  );
}
