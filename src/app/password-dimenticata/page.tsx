import { ResetRequestForm } from "@/components/AuthForms";

export const metadata = { title: "Password dimenticata · Lavanderia" };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">Password dimenticata</h1>
      <p className="mb-6 text-sm text-slate-600">
        Inserisci la tua email o il tuo username: ti invieremo un link per sceglierne una nuova.
      </p>
      <ResetRequestForm />
    </div>
  );
}
