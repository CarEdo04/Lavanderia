"use client";

import { useFormStatus } from "react-dom";

// Submit button that disables itself while the form's action runs and can
// optionally ask for confirmation first.
export function SubmitButton({
  children,
  className = "",
  confirm,
  pendingText = "Attendere…",
}: {
  children: React.ReactNode;
  className?: string;
  confirm?: string;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} disabled:cursor-wait disabled:opacity-60`}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? pendingText : children}
    </button>
  );
}
