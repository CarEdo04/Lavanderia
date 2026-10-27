import { getSettings } from "@/lib/booking";
import { rulesText } from "@/lib/rules";

export const metadata = { title: "Regolamento · Lavanderia" };

export default async function RulesPage() {
  const settings = await getSettings();
  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-2xl font-semibold text-slate-900">Regolamento della lavanderia</h1>
      <div className="whitespace-pre-line rounded-xl border border-slate-200 bg-white p-5 leading-relaxed text-slate-700">
        {rulesText(settings)}
      </div>
    </div>
  );
}
