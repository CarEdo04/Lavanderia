import { getSettings } from "@/lib/booking";
import { rulesText } from "@/lib/rules";

export const metadata = { title: "Regolamento · Lavanderia" };

export default async function RulesPage() {
  const settings = await getSettings();
  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-3xl font-bold tracking-tight">Regolamento della lavanderia</h1>
      <div className="whitespace-pre-line rounded-2xl border border-line bg-white p-5 leading-relaxed text-ink">
        {rulesText(settings)}
      </div>
    </div>
  );
}
