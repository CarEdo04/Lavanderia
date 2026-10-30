import type { MachineType, NoticeLevel } from "@prisma/client";

// Outcomes of actions, shown once on the next page (see src/lib/flash.ts).
export const ESITI: Record<string, { ok: boolean; text: string }> = {
  prenotata: { ok: true, text: "Prenotazione confermata." },
  annullata: { ok: true, text: "Prenotazione annullata." },
  salvato: { ok: true, text: "Modifiche salvate." },
  "avviso-pubblicato": { ok: true, text: "Avviso pubblicato." },
  "avviso-rimosso": { ok: true, text: "Avviso rimosso." },
  "codice-generato": {
    ok: true,
    text: "Nuovo codice di registrazione creato. Comunicalo ai residenti: quello di prima non funziona più.",
  },
  occupato: { ok: false, text: "Questo turno è già stato prenotato." },
  limite: { ok: false, text: "Hai raggiunto il numero massimo di prenotazioni attive. Annullane una per prenotare di nuovo." },
  passato: { ok: false, text: "Non puoi prenotare un turno già iniziato o concluso." },
  "troppo-avanti": { ok: false, text: "Non puoi prenotare con così tanto anticipo." },
  "troppo-tardi": { ok: false, text: "Troppo tardi: le prenotazioni per questo turno sono chiuse." },
  "turno-non-valido": { ok: false, text: "Orario non valido. Ricarica la pagina e riprova." },
  macchina: { ok: false, text: "Questa macchina non è disponibile." },
  "non-trovata": { ok: false, text: "Prenotazione non trovata." },
  "gia-iniziata": { ok: false, text: "Non puoi annullare un turno già iniziato o concluso: resta nello storico." },
  "contatta-admin": {
    ok: false,
    text: "Il turno è troppo vicino per annullarlo da qui: contatta l'amministratore, che può annullarlo per te.",
  },
  "utente-non-trovato": { ok: false, text: "Nessun utente con questo username." },
  "limite-utente": { ok: false, text: "Questa persona ha già il numero massimo di prenotazioni attive." },
  "macchina-con-storico": {
    ok: false,
    text: "Questa macchina ha prenotazioni registrate, quindi non si può eliminare: disattivala per toglierla dal calendario.",
  },
  "dati-non-validi": { ok: false, text: "Dati non validi. Controlla i campi e riprova." },
  "se-stesso": { ok: false, text: "Non puoi cambiare il tuo ruolo." },
  "email-verificata": { ok: true, text: "Email confermata. Ora puoi prenotare." },
  "email-inviata": { ok: true, text: "Ti abbiamo inviato una nuova email di conferma." },
  attendi: { ok: false, text: "Sono state inviate troppe email in poco tempo. Riprova più tardi (può volerci fino a un'ora); se il problema continua, contatta l'amministratore." },
  "invio-fallito": { ok: false, text: "Non è stato possibile inviare l'email. Riprova più tardi o contatta l'amministratore." },
  "link-non-valido": { ok: false, text: "Il link non è valido, è scaduto o è già stato usato. Accedi, oppure chiedine uno nuovo." },
  "password-aggiornata": { ok: true, text: "Password aggiornata." },
  "email-aggiornata": { ok: true, text: "Email aggiornata: da ora accedi con il nuovo indirizzo." },
  "email-altro-link": {
    ok: true,
    text: "Link confermato. Per completare il cambio apri anche il link che abbiamo inviato all'altro indirizzo.",
  },
  "account-eliminato": { ok: true, text: "Il tuo account è stato eliminato." },
  "operazione-fallita": { ok: false, text: "Operazione non riuscita. Riprova più tardi." },
};

export const MACHINE_TYPES: Record<MachineType, string> = {
  WASHER: "Lavatrice",
  DRYER: "Asciugatrice",
};

export const NOTICE_LEVELS: Record<NoticeLevel, string> = {
  INFO: "Informazione",
  WARNING: "Problema / disservizio",
};

// Whether a submitted value is one of the record's keys. Own keys only:
// `"toString" in MACHINE_TYPES` is true.
export function isKeyOf<K extends string>(record: Record<K, string>, value: string): value is K {
  return Object.hasOwn(record, value);
}
