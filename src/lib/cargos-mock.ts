import {
  CARGOS_RECORD_LENGTH,
  type CargosClient,
  type CargosOutcome,
} from "@/lib/cargos";

/**
 * Adapter MOCK — adapter attivo per default.
 *
 * Non contatta mai il portale della Polizia di Stato: verifica solo che i
 * record abbiano la lunghezza attesa, poi restituisce un esito positivo con un
 * codice transazione simulato. Serve a sviluppare e collaudare l'intero flusso
 * (costruzione tracciato, coda, retry, pannello di stato) senza credenziali e
 * senza trasmettere dati reali.
 */
export function createCargosMockClient(): CargosClient {
  const log = (op: string, detail: unknown) =>
    console.info(`[cargos:mock] ${op}`, JSON.stringify(detail));

  function validateLengths(records: string[]): string[] {
    return records
      .map((record, index) =>
        record.length === CARGOS_RECORD_LENGTH
          ? null
          : `Record ${index + 1}: ${record.length} caratteri invece di ${CARGOS_RECORD_LENGTH}.`,
      )
      .filter((message): message is string => message !== null);
  }

  function outcome(op: string, records: string[]): CargosOutcome {
    const messages = validateLengths(records);
    log(op, { records: records.length, messages });
    if (messages.length > 0) return { ok: false, messages, raw: { mock: true, op } };
    return {
      ok: true,
      transactionId: `MOCK-${Date.now().toString(36).toUpperCase()}`,
      messages: [],
      raw: { mock: true, op, records: records.length },
    };
  }

  return {
    mode: "mock",
    async getToken() {
      log("getToken", {});
      return "mock-token";
    },
    async checkRecords(records) {
      return outcome("check", records);
    },
    async sendRecords(records) {
      return outcome("send", records);
    },
    async getTabella(tabellaId) {
      log("getTabella", { tabellaId });
      // Nessun codice inventato: il mock non restituisce codifiche fittizie,
      // che finirebbero nel tracciato come se fossero ufficiali.
      return [];
    },
  };
}
