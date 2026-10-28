// Outcome codes passed in the `esito` query parameter after an action.
export const ESITI: Record<string, { ok: boolean; text: string }> = {
  prenotata: { ok: true, text: "Prenotazione confermata." },
  annullata: { ok: true, text: "Prenotazione annullata." },
  salvato: { ok: true, text: "Modifiche salvate." },
  "avviso-pubblicato": { ok: true, text: "Avviso pubblicato." },
  "avviso-rimosso": { ok: true, text: "Avviso rimosso." },
  occupato: { ok: false, text: "Questo turno è già stato prenotato." },
  limite: { ok: false, text: "Hai raggiunto il numero massimo di prenotazioni attive. Annullane una per prenotare di nuovo." },
  passato: { ok: false, text: "Non puoi prenotare un turno già concluso." },
  "troppo-avanti": { ok: false, text: "Non puoi prenotare con così tanto anticipo." },
  "troppo-tardi": { ok: false, text: "Troppo tardi: le prenotazioni per questo turno sono chiuse." },
  "turno-non-valido": { ok: false, text: "Orario non valido. Ricarica la pagina e riprova." },
  macchina: { ok: false, text: "Questa macchina non è disponibile." },
  "non-trovata": { ok: false, text: "Prenotazione non trovata." },
  "gia-conclusa": { ok: false, text: "Non puoi annullare una prenotazione già conclusa." },
  "dati-non-validi": { ok: false, text: "Dati non validi. Controlla i campi e riprova." },
  "se-stesso": { ok: false, text: "Non puoi cambiare il tuo ruolo." },
  "email-verificata": { ok: true, text: "Email confermata. Ora puoi prenotare." },
  "email-inviata": { ok: true, text: "Ti abbiamo inviato una nuova email di conferma." },
  attendi: { ok: false, text: "Hai appena ricevuto un'email: attendi un minuto prima di chiederne un'altra." },
  "invio-fallito": { ok: false, text: "Non è stato possibile inviare l'email. Riprova più tardi o contatta l'amministratore." },
  "link-non-valido": { ok: false, text: "Il link non è valido, è scaduto o è già stato usato. Accedi, oppure chiedine uno nuovo." },
  "password-aggiornata": { ok: true, text: "Password aggiornata." },
  "operazione-fallita": { ok: false, text: "Operazione non riuscita. Riprova più tardi." },
};

export const MACHINE_TYPES: Record<string, string> = {
  WASHER: "Lavatrice",
  DRYER: "Asciugatrice",
};

export const NOTICE_LEVELS: Record<string, string> = {
  INFO: "Informazione",
  WARNING: "Problema / disservizio",
};
