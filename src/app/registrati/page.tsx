import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/AuthForms";
import { getSettings } from "@/lib/booking";
import { rulesText } from "@/lib/rules";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Registrati · Lavanderia" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/prenota");
  const settings = await getSettings();
  return (
    <div className="mx-auto max-w-md py-10">
      <h1 className="mb-1 text-2xl font-semibold text-slate-900">Crea un account</h1>
      <p className="mb-6 text-sm text-slate-600">Bastano pochi secondi.</p>
      <RegisterForm needsCode={!!settings.registrationCode} rules={rulesText(settings)} />
    </div>
  );
}
