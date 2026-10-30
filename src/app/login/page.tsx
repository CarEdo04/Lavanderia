import { redirect } from "next/navigation";
import { AuthCard } from "@/components/AuthCard";
import { LoginForm } from "@/components/AuthForms";
import { Flash } from "@/components/Flash";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Accedi · Lavanderia" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ esito?: string }> }) {
  if (await getCurrentUser()) redirect("/prenota");
  const { esito } = await searchParams;
  return (
    <AuthCard title="Accedi" intro="Prenota la lavanderia del tuo condominio.">
      <Flash code={esito} />
      <LoginForm />
    </AuthCard>
  );
}
