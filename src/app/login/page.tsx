import { redirect } from "next/navigation";
import { AuthCard } from "@/components/AuthCard";
import { LoginForm } from "@/components/AuthForms";
import { Flash } from "@/components/Flash";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Accedi · Lavanderia" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/prenota");
  return (
    <AuthCard title="Accedi" intro="Prenota la lavanderia del tuo condominio.">
      <Flash />
      <LoginForm />
    </AuthCard>
  );
}
