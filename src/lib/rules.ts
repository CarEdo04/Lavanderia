// Shown until an admin writes the building's own rules in Gestione.
export const DEFAULT_RULES = `1. La lavanderia si prenota solo tramite questa app e si usa solo durante il proprio turno.

2. Se non puoi usare il tuo turno, annulla la prenotazione il prima possibile, così altri possono usarlo.

3. Libera la lavanderia entro la fine del turno, anche se il bucato non è finito.

4. Lascia la lavanderia pulita e in ordine e svuota il filtro dell'asciugatrice.

5. Segnala subito guasti o problemi all'amministratore.`;

export function rulesText(settings: { rulesText: string | null }) {
  return settings.rulesText?.trim() || DEFAULT_RULES;
}
