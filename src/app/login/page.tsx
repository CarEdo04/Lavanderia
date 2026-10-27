import { redirect } from "next/navigation";
import { LoginForm } from "@/components/AuthForms";
import { Flash } from "@/components/Flash";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Accedi · Lavanderia" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ esito?: string }> }) {
  if (await getCurrentUser()) redirect("/prenota");
  const { esito } = await searchParams;
  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">Accedi</h1>
      <p className="mb-6 text-sm text-slate-600">Prenota la lavanderia del tuo condominio.</p>
      <Flash code={esito} />
      <LoginForm />
    </div>
  );
}
