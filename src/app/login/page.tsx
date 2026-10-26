import { redirect } from "next/navigation";
import { LoginForm } from "@/components/AuthForms";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Accedi · Lavanderia" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/prenota");
  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">Accedi</h1>
      <p className="mb-6 text-sm text-slate-600">Prenota la lavatrice o l&apos;asciugatrice del tuo condominio.</p>
      <LoginForm />
    </div>
  );
}
