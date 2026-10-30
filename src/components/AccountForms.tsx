"use client";

import { useActionState, useState } from "react";
import { changeEmail, changePassword, deleteAccount, updateProfile } from "@/app/actions";
import { baseUsername } from "@/lib/people";
import { FormError, FormNotice, button, hint, input, label } from "./AuthForms";
import { SubmitButton } from "./SubmitButton";

const save = `${button} sm:w-auto sm:px-8`;

export function ProfileForm({
  firstName,
  lastName,
  room,
  username,
  isAdmin,
}: {
  firstName: string;
  lastName: string;
  room: string;
  username: string | null;
  isAdmin: boolean;
}) {
  const [state, action] = useActionState(updateProfile, undefined);
  const v = state?.values;
  // Typed names, to preview the username they lead to.
  const [names, setNames] = useState({ firstName: v?.firstName ?? firstName, lastName: v?.lastName ?? lastName });
  const changes =
    username && names.firstName.trim() && names.lastName.trim() && baseUsername(names) !== baseUsername({ firstName, lastName });

  return (
    <form action={action} className="space-y-4">
      <FormError state={state} />
      <FormNotice state={state} />
      <div>
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>
            Nome
            <input
              name="firstName"
              autoComplete="given-name"
              required
              maxLength={40}
              defaultValue={v?.firstName ?? firstName}
              onChange={(e) => setNames({ ...names, firstName: e.target.value })}
              className={input}
            />
          </label>
          <label className={label}>
            Cognome
            <input
              name="lastName"
              autoComplete="family-name"
              required={!isAdmin}
              maxLength={40}
              defaultValue={v?.lastName ?? lastName}
              onChange={(e) => setNames({ ...names, lastName: e.target.value })}
              className={input}
            />
          </label>
        </div>
        {username && (
          <p className="mt-1.5 text-sm text-ink-2" aria-live="polite">
            Username per accedere: <strong className="font-mono font-medium text-ink">{username}</strong>
            {changes && (
              <>
                , diventerà <strong className="font-mono font-medium text-ink">{baseUsername(names)}</strong> (con un
                numero in più se è già usato)
              </>
            )}
          </p>
        )}
      </div>
      <label className={label}>
        Numero di stanza {isAdmin && <span className={hint}>(facoltativo per gli admin)</span>}
        <input name="room" required={!isAdmin} maxLength={10} inputMode="numeric" defaultValue={v?.room ?? room} className={input} />
      </label>
      <SubmitButton className={save}>Salva</SubmitButton>
    </form>
  );
}

export function EmailForm({ email, pending }: { email: string; pending: string | null }) {
  const [state, action] = useActionState(changeEmail, undefined);
  return (
    <form action={action} className="space-y-4">
      <p className="text-sm text-ink-2">
        Indirizzo attuale: <strong className="font-semibold break-all text-ink">{email}</strong>
      </p>
      {pending && !state?.notice && (
        <p role="status" className="rounded-xl border border-warn-line bg-warn px-3 py-2 text-sm text-warn-ink">
          In attesa di conferma: <strong className="font-semibold break-all">{pending}</strong>. Apri il link che ti
          abbiamo inviato; fino ad allora resta valido l&apos;indirizzo attuale.
        </p>
      )}
      <FormError state={state} />
      <FormNotice state={state} />
      <label className={label}>
        Nuova email <span className={hint}>(riceverai un link di conferma)</span>
        <input name="email" type="email" autoComplete="email" required defaultValue={state?.values?.email} className={input} />
      </label>
      <label className={label}>
        Password <span className={hint}>(per confermare che sei tu)</span>
        <input name="current" type="password" autoComplete="current-password" required className={input} />
      </label>
      <SubmitButton className={save}>Cambia email</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="space-y-4">
      <FormError state={state} />
      <FormNotice state={state} />
      <label className={label}>
        Password attuale
        <input name="current" type="password" autoComplete="current-password" required className={input} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-3">
        <label className={label}>
          Nuova password <span className={hint}>(almeno 8)</span>
          <input name="password" type="password" autoComplete="new-password" required minLength={8} className={input} />
        </label>
        <label className={label}>
          Ripeti la nuova password
          <input name="confirm" type="password" autoComplete="new-password" required minLength={8} className={input} />
        </label>
      </div>
      <SubmitButton className={save}>Cambia password</SubmitButton>
    </form>
  );
}

export function DeleteAccountForm({ upcoming }: { upcoming: number }) {
  const [state, action] = useActionState(deleteAccount, undefined);
  return (
    <form action={action} className="space-y-4">
      <FormError state={state} />
      <label className={label}>
        Password <span className={hint}>(per confermare che sei tu)</span>
        <input name="password" type="password" autoComplete="current-password" required className={input} />
      </label>
      <SubmitButton
        confirm="Eliminare il tuo account?"
        confirmLabel="Elimina account"
        danger
        details={
          <p className="text-ink-2">
            {upcoming > 0 &&
              (upcoming === 1 ? "Il tuo turno in programma verrà annullato. " : `I tuoi ${upcoming} turni in programma verranno annullati. `)}
            Non potrai più accedere e non si può tornare indietro.
          </p>
        }
        className="h-[52px] w-full rounded-2xl border-[1.5px] border-red-300 bg-white px-8 font-semibold text-red-700 hover:bg-red-50 sm:w-auto"
      >
        Elimina account
      </SubmitButton>
    </form>
  );
}
