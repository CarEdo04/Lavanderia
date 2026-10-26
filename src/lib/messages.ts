// Outcome codes passed in the `esito` query parameter after an action.
export const ESITI: Record<string, { ok: boolean; text: string }> = {
  prenotata: { ok: true, text: "Prenotazione confermata." },
  annullata: { ok: true, text: "Prenotazione annullata." },
  salvato: { ok: true, text: "Modifiche salvate." },
  occupato: { ok: false, text: "Questo turno è già stato prenotato." },
  limite: { ok: false, text: "Hai raggiunto il numero massimo di prenotazioni attive. Annullane una per prenotare di nuovo." },
  passato: { ok: false, text: "Non puoi prenotare un turno già concluso." },
  "troppo-avanti": { ok: false, text: "Non puoi prenotare con così tanto anticipo." },
  "turno-non-valido": { ok: false, text: "Orario non valido. Ricarica la pagina e riprova." },
  macchina: { ok: false, text: "Questa macchina non è disponibile." },
  "non-trovata": { ok: false, text: "Prenotazione non trovata." },
  "gia-conclusa": { ok: false, text: "Non puoi annullare una prenotazione già conclusa." },
  "dati-non-validi": { ok: false, text: "Dati non validi. Controlla i campi e riprova." },
  "se-stesso": { ok: false, text: "Non puoi cambiare il tuo ruolo." },
};

export const MACHINE_TYPES: Record<string, string> = {
  WASHER: "Lavatrice",
  DRYER: "Asciugatrice",
};
