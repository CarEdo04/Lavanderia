"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, register, requestPasswordReset, updatePassword, type FormState } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

const input =
  "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200";
const label = "block text-sm font-medium text-slate-700";
const hint = "font-normal text-slate-500";
const button = "w-full rounded-lg bg-sky-600 px-4 py-2.5 font-medium text-white hover:bg-sky-700";

function FormError({ state }: { state: FormState }) {
  if (!state?.error) return null;
  return (
    <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
      {state.error}
    </p>
  );
}

function FormNotice({ state }: { state: FormState }) {
  if (!state?.notice) return null;
  return (
    <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
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
        <Link href="/password-dimenticata" className="text-sky-700 hover:underline">
          Password dimenticata?
        </Link>
      </p>
      <SubmitButton className={button}>Accedi</SubmitButton>
      <p className="text-center text-sm text-slate-600">
        Non hai un account?{" "}
        <Link href="/registrati" className="font-medium text-sky-700 hover:underline">
          Registrati
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ needsCode, rules }: { needsCode: boolean; rules: string }) {
  const [state, action] = useActionState(register, undefined);
  const v = state?.values;
  return (
    <form action={action} className="space-y-4">
      <FormError state={state} />
      <div className="grid grid-cols-2 gap-3">
        <label className={label}>
          Nome
          <input name="firstName" autoComplete="given-name" required maxLength={40} defaultValue={v?.firstName} className={input} />
        </label>
        <label className={label}>
          Cognome
          <input name="lastName" autoComplete="family-name" required maxLength={40} defaultValue={v?.lastName} className={input} />
        </label>
      </div>
      <label className={label}>
        Email <span className={hint}>(riceverai un link di conferma)</span>
        <input name="email" type="email" autoComplete="email" required defaultValue={v?.email} className={input} />
      </label>
      <label className={label}>
        Username <span className={hint}>(facoltativo, per accedere senza email)</span>
        <input
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          minLength={3}
          maxLength={30}
          pattern="[A-Za-z0-9._\-]{3,30}"
          title="3–30 caratteri tra lettere, numeri, punto, trattino e trattino basso"
          defaultValue={v?.username}
          className={input}
        />
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

      <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
        <details>
          <summary className="cursor-pointer font-medium text-sky-700">Leggi il regolamento</summary>
          <div className="mt-2 max-h-60 overflow-y-auto whitespace-pre-line text-slate-700">{rules}</div>
        </details>
        <label className="mt-3 flex items-start gap-2 text-slate-700">
          <input type="checkbox" name="rules" value="si" required className="mt-0.5 h-4 w-4 accent-sky-600" />
          Ho letto e accetto il regolamento della lavanderia
        </label>
      </div>

      <SubmitButton className={button}>Crea account</SubmitButton>
      <p className="text-center text-sm text-slate-600">
        Hai già un account?{" "}
        <Link href="/login" className="font-medium text-sky-700 hover:underline">
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
      <p className="text-center text-sm text-slate-600">
        <Link href="/login" className="font-medium text-sky-700 hover:underline">
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
