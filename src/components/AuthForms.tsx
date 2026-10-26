"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, register, type FormState } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

const input =
  "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200";
const button = "w-full rounded-lg bg-sky-600 px-4 py-2.5 font-medium text-white hover:bg-sky-700";

function FormError({ state }: { state: FormState }) {
  if (!state?.error) return null;
  return (
    <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
      {state.error}
    </p>
  );
}

export function LoginForm() {
  const [state, action] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-4">
      <FormError state={state} />
      <label className="block text-sm font-medium text-slate-700">
        Email
        <input name="email" type="email" autoComplete="email" required className={input} />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Password
        <input name="password" type="password" autoComplete="current-password" required className={input} />
      </label>
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

export function RegisterForm({ needsCode }: { needsCode: boolean }) {
  const [state, action] = useActionState(register, undefined);
  return (
    <form action={action} className="space-y-4">
      <FormError state={state} />
      <label className="block text-sm font-medium text-slate-700">
        Nome e cognome
        <input name="name" autoComplete="name" required maxLength={60} className={input} />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Interno / appartamento <span className="font-normal text-slate-500">(facoltativo)</span>
        <input name="apartment" maxLength={20} className={input} />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Email
        <input name="email" type="email" autoComplete="email" required className={input} />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Password <span className="font-normal text-slate-500">(almeno 8 caratteri)</span>
        <input name="password" type="password" autoComplete="new-password" required minLength={8} className={input} />
      </label>
      {needsCode && (
        <label className="block text-sm font-medium text-slate-700">
          Codice di registrazione
          <input name="code" required className={input} />
        </label>
      )}
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
