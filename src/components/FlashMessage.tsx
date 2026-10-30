"use client";

import { useEffect, useState } from "react";

// Messages already shown in this tab. Back and Forward reuse the pages the
// router has cached, message included, so those copies stay hidden.
const shown = new Set<string>();

export function FlashMessage({ id, ok, text }: { id: string; ok: boolean; text: string }) {
  const [visible] = useState(() => !shown.has(id));

  useEffect(() => {
    shown.add(id);
    // Delete the cookie unless a newer message has replaced it meanwhile.
    if (document.cookie.split("; ").includes(`esito=${id}`)) document.cookie = "esito=; Max-Age=0; path=/";
  }, [id]);

  if (!visible) return null;
  return (
    <div
      role="status"
      className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-medium ${
        ok ? "border-brand-line bg-brand-soft text-brand-ink" : "border-red-200 bg-red-50 text-red-800"
      }`}
    >
      {text}
    </div>
  );
}
