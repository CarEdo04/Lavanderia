"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { login, register, requestPasswordReset, updatePassword, type FormState } from "@/app/actions";
import { baseUsername } from "@/lib/people";
import { SubmitButton } from "./SubmitButton";

const input =
  "mt-1.5 block h-12 w-full rounded-xl border-[1.5px] border-line bg-white px-3.5 text-base font-normal text-ink focus:border-brand focus:ring-3 focus:ring-brand/20 focus:outline-none";
const label = "block text-sm font-semibold text-ink";
const hint = "font-normal text-ink-2";
const button = "h-[52px] w-full rounded-2xl bg-brand px-4 font-semibold text-white hover:bg-brand-strong";

function FormError({ state }: { state: FormState }) {
  if (!state?.error) return null;
  return (
    <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
      {state.error}
    </p>
  );
}

function FormNotice({ state }: { state: FormState }) {
  if (!state?.notice) return null;
  return (
    <p role="status" className="rounded-xl border border-brand-line bg-brand-soft px-3 py-2 text-sm text-brand-ink">
      {state.notice}
    </p>
  );
}

export function LoginForm() {
  const [state, action] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-4">
      <FormError state={state} />
      <label className={label}>
        Email o username
        <input
          name="identifier"
          autoComplete="username"
          autoCapitalize="none"
          required
          defaultValue={state?.values?.identifier}
          className={input}
        />
      </label>
      <label className={label}>
        Password
        <input name="password" type="password" autoComplete="current-password" required className={input} />
      </label>
      <p className="-mt-2 text-right text-sm">
        <Link href="/password-dimenticata" className="text-brand hover:underline">
          Password dimenticata?
        </Link>
      </p>
      <SubmitButton className={button}>Accedi</SubmitButton>
      <p className="text-center text-sm text-ink-2">
        Non hai un account?{" "}
        <Link href="/registrati" className="font-medium text-brand hover:underline">
          Registrati
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ needsCode, rules }: { needsCode: boolean; rules: string }) {
  const [state, action] = useActionState(register, undefined);
  const v = state?.values;
  // Typed names, for the username preview below them.
  const [names, setNames] = useState({ firstName: v?.firstName ?? "", lastName: v?.lastName ?? "" });
  const typed = names.firstName.trim() && names.lastName.trim();
  return (
    <form action={action} className="space-y-4">
      <FormError state={state} />
      <div>
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>
            Nome
            <input
              name="firstName"
              autoComplete="given-name"
              required
              maxLength={40}
              defaultValue={v?.firstName}
              onChange={(e) => setNames({ ...names, firstName: e.target.value })}
              className={input}
            />
          </label>
          <label className={label}>
            Cognome
            <input
              name="lastName"
              autoComplete="family-name"
              required
              maxLength={40}
              defaultValue={v?.lastName}
              onChange={(e) => setNames({ ...names, lastName: e.target.value })}
              className={input}
            />
          </label>
        </div>
        <p className="mt-1.5 text-sm text-ink-2" aria-live="polite">
          Username per accedere:{" "}
          {typed ? <strong className="font-medium text-ink">{baseUsername(names)}</strong> : "cognome.nome"}
          {typed && " (con un numero in più se è già usato)"}
        </p>
      </div>
      <label className={label}>
        Email <span className={hint}>(riceverai un link di conferma)</span>
        <input name="email" type="email" autoComplete="email" required defaultValue={v?.email} className={input} />
      </label>
      <label className={label}>
        Password <span className={hint}>(almeno 8 caratteri)</span>
        <input name="password" type="password" autoComplete="new-password" required minLength={8} className={input} />
      </label>
      <label className={label}>
        Numero di stanza
        <input name="room" required maxLength={10} inputMode="numeric" defaultValue={v?.room} className={input} />
      </label>
      {needsCode && (
        <label className={label}>
          Codice di registrazione
          <input name="code" required className={input} />
        </label>
      )}

      <div className="rounded-lg border border-line p-3.5 text-sm">
        <details>
          <summary className="cursor-pointer font-medium text-brand">Leggi il regolamento</summary>
          <div className="mt-2 max-h-60 overflow-y-auto whitespace-pre-line text-ink">{rules}</div>
        </details>
        <label className="mt-3 flex items-start gap-2 text-ink">
          <input type="checkbox" name="rules" value="si" required className="mt-0.5 h-4 w-4 accent-brand" />
          Ho letto e accetto il regolamento della lavanderia
        </label>
      </div>

      <SubmitButton className={button}>Crea account</SubmitButton>
      <p className="text-center text-sm text-ink-2">
        Hai già un account?{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Accedi
        </Link>
      </p>
    </form>
  );
}

export function ResetRequestForm() {
  const [state, action] = useActionState(requestPasswordReset, undefined);
  return (
    <form action={action} className="space-y-4">
      <FormError state={state} />
      <FormNotice state={state} />
      <label className={label}>
        Email o username
        <input
          name="identifier"
          autoComplete="username"
          autoCapitalize="none"
          required
          defaultValue={state?.values?.identifier}
          className={input}
        />
      </label>
      <SubmitButton className={button}>Invia il link</SubmitButton>
      <p className="text-center text-sm text-ink-2">
        <Link href="/login" className="font-medium text-brand hover:underline">
          Torna all&apos;accesso
        </Link>
      </p>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action] = useActionState(updatePassword, undefined);
  return (
    <form action={action} className="space-y-4">
      <FormError state={state} />
      <label className={label}>
        Nuova password <span className={hint}>(almeno 8 caratteri)</span>
        <input name="password" type="password" autoComplete="new-password" required minLength={8} className={input} />
      </label>
      <label className={label}>
        Ripeti la nuova password
        <input name="confirm" type="password" autoComplete="new-password" required minLength={8} className={input} />
      </label>
      <SubmitButton className={button}>Salva la password</SubmitButton>
    </form>
  );
}
