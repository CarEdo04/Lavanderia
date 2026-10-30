"use client";

import { useId, useRef } from "react";
import { useFormStatus } from "react-dom";

// Submit button that disables itself while the form's action runs and can
// optionally ask for confirmation first, in a sheet that rises from the
// bottom on phones and sits in the middle on larger screens.
export function SubmitButton({
  children,
  className = "",
  confirm,
  details,
  confirmLabel = "Conferma",
  danger = false,
  pendingText = "Attendere…",
  title,
  formAction,
}: {
  children: React.ReactNode;
  className?: string;
  /** The question in the confirmation sheet; without it the form submits straight away. */
  confirm?: string;
  details?: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  pendingText?: string;
  title?: string;
  /** Submits the form to this action instead of the form's own. */
  formAction?: (formData: FormData) => void | Promise<void>;
}) {
  const { pending } = useFormStatus();
  const button = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  return (
    <>
      <button
        ref={button}
        type="submit"
        disabled={pending}
        title={title}
        formAction={formAction}
        className={`${className} disabled:cursor-wait disabled:opacity-60`}
        onClick={(e) => {
          if (!confirm) return;
          e.preventDefault();
          dialog.current?.showModal();
        }}
      >
        {pending ? pendingText : children}
      </button>
      {confirm && (
        <dialog
          ref={dialog}
          aria-labelledby={titleId}
          className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-3xl bg-white p-5 pb-7 text-left text-base font-normal tracking-normal text-ink normal-case shadow-2xl backdrop:bg-ink/45 sm:inset-0 sm:m-auto sm:h-fit sm:max-w-md sm:rounded-3xl sm:p-6"
        >
          <div aria-hidden className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line sm:hidden" />
          <h2 id={titleId} className="text-2xl font-bold tracking-tight">
            {confirm}
          </h2>
          {details && <div className="mt-4">{details}</div>}
          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              className={`h-[52px] rounded-2xl font-semibold text-white ${
                danger ? "bg-red-700 hover:bg-red-800" : "bg-brand hover:bg-brand-strong"
              }`}
              onClick={() => {
                dialog.current?.close();
                // Passing the button keeps its formAction.
                button.current?.form?.requestSubmit(button.current);
              }}
            >
              {confirmLabel}
            </button>
            <button
              type="button"
              className="h-[50px] rounded-2xl border border-line font-medium hover:bg-ground"
              onClick={() => dialog.current?.close()}
            >
              Torna indietro
            </button>
          </div>
        </dialog>
      )}
    </>
  );
}
