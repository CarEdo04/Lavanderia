import { redirect } from "next/navigation";
import { AuthCard } from "@/components/AuthCard";
import { RegisterForm } from "@/components/AuthForms";
import { getSettings } from "@/lib/booking";
import { rulesText } from "@/lib/rules";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Registrati · Lavanderia" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/prenota");
  const settings = await getSettings();
  return (
    <AuthCard title="Crea un account" intro="Bastano pochi secondi.">
      <RegisterForm needsCode={!!settings.registrationCode} rules={rulesText(settings)} />
    </AuthCard>
  );
}
