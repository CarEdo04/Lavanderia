import { ESITI } from "@/lib/messages";

export function Flash({ code }: { code?: string }) {
  const msg = code ? ESITI[code] : undefined;
  if (!msg) return null;
  return (
    <div
      role="status"
      className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-medium ${
        msg.ok ? "border-brand-line bg-brand-soft text-brand-ink" : "border-red-200 bg-red-50 text-red-800"
      }`}
    >
      {msg.text}
    </div>
  );
}
