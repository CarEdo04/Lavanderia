import { ESITI } from "@/lib/messages";

export function Flash({ code }: { code?: string }) {
  const msg = code ? ESITI[code] : undefined;
  if (!msg) return null;
  return (
    <div
      role="status"
      className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
        msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"
      }`}
    >
      {msg.text}
    </div>
  );
}
