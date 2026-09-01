/**
 * CaRGOS (Polizia di Stato) — logica pura del tracciato record.
 *
 * ⚠️ ATTENDIBILITÀ DELLA SPECIFICA
 * La mappa dei campi qui sotto è una RICOSTRUZIONE del tracciato a posizione
 * fissa descritto nel manuale ufficiale (cargos.poliziadistato.it, p2.pdf),
 * ottenuta per lettura assistita e NON verificata byte-per-byte sul PDF
 * originale. Prima di qualunque invio reale in produzione, chi ha accesso al
 * manuale ufficiale deve validare riga per riga `CARGOS_FIELDS`: in un
 * tracciato a posizione fissa un solo carattere di scostamento produce un
 * contratto scartato oppure dati associati al campo sbagliato.
 *
 * Fino a quella verifica `TRACCIATO_VERIFICATO` resta `false`: l'adapter reale
 * rifiuta l'invio se la variabile d'ambiente di conferma non è impostata.
 */

export const TRACCIATO_VERIFICATO = false;

/**
 * ⚠️ CIFRATURA DEL TOKEN
 * Il manuale prevede che il token restituito da `GET api/Token` sia cifrato con
 * l'ApiKey (AES se l'ApiKey ha almeno 48 caratteri, 3DES se almeno 24) prima di
 * essere usato come `Authorization: Bearer`. Modalità (ECB/CBC), eventuale IV e
 * encoding dell'output NON sono stati confrontati byte-per-byte col PDF
 * ufficiale: l'implementazione usa il caso più plausibile (ECB, output base64).
 * Fino alla verifica sul manuale `CIFRATURA_VERIFICATA` resta `false` e
 * l'adapter reale rifiuta l'invio definitivo, esattamente come per il tracciato.
 */
export const CIFRATURA_VERIFICATA = false;

/** Lunghezza totale del tracciato record dichiarata dal manuale. */
export const CARGOS_RECORD_LENGTH = 1505;

export type CargosFieldFormat =
  | "text" // allineato a sinistra, padding con spazi
  | "num" // allineato a destra, padding con zeri
  | "date" // yyyymmdd
  | "time" // hhmm
  | "amount" // importo in centesimi, allineato a destra con zeri
  | "filler";

export type CargosFieldSpec = {
  /** Nome logico del campo (chiave di `CargosContract`). */
  name: string;
  /** Posizione 1-based di inizio nel tracciato. */
  start: number;
  length: number;
  format: CargosFieldFormat;
  /** Etichetta leggibile per il pannello di controllo. */
  label: string;
  /** Il campo è obbligatorio secondo la ricostruzione della specifica. */
  required?: boolean;
  /** Tabella di codifica CaRGOS di riferimento (se il valore è un codice). */
  tabella?: number;
};

/**
 * Definizione dichiarativa in ordine di tracciato: le posizioni di inizio sono
 * derivate dalle lunghezze, così non possono divergere fra loro.
 */
const FIELD_DEFS: Omit<CargosFieldSpec, "start">[] = [
  { name: "tipoRecord", length: 2, format: "text", label: "Tipo record", required: true },
  { name: "codiceLuogoPolizia", length: 10, format: "text", label: "Codice luogo polizia", required: true },
  { name: "codiceOrganizzazione", length: 10, format: "text", label: "Codice organizzazione", required: true },
  { name: "progressivoContratto", length: 12, format: "text", label: "Numero contratto", required: true },
  { name: "dataStipula", length: 8, format: "date", label: "Data stipula", required: true },
  { name: "dataInizio", length: 8, format: "date", label: "Data inizio noleggio", required: true },
  { name: "oraInizio", length: 4, format: "time", label: "Ora inizio noleggio" },
  { name: "dataFine", length: 8, format: "date", label: "Data fine noleggio", required: true },
  { name: "oraFine", length: 4, format: "time", label: "Ora fine noleggio" },
  { name: "luogoRitiro", length: 10, format: "text", label: "Luogo di ritiro", required: true },
  { name: "luogoRiconsegna", length: 10, format: "text", label: "Luogo di riconsegna" },
  { name: "tipoPagamento", length: 2, format: "text", label: "Tipo pagamento", required: true, tabella: 0 },
  { name: "importoContratto", length: 10, format: "amount", label: "Importo contratto (cent.)", required: true },
  // Veicolo
  { name: "targa", length: 12, format: "text", label: "Targa", required: true },
  { name: "tipoVeicolo", length: 2, format: "text", label: "Tipo veicolo", required: true, tabella: 2 },
  { name: "marcaModello", length: 40, format: "text", label: "Marca e modello", required: true },
  { name: "telaio", length: 20, format: "text", label: "Numero di telaio" },
  // Conducente principale
  { name: "conducenteCognome", length: 40, format: "text", label: "Cognome conducente", required: true },
  { name: "conducenteNome", length: 40, format: "text", label: "Nome conducente", required: true },
  { name: "conducenteSesso", length: 1, format: "text", label: "Sesso conducente" },
  { name: "conducenteDataNascita", length: 8, format: "date", label: "Data di nascita" },
  { name: "conducenteComuneNascita", length: 6, format: "text", label: "Comune di nascita", tabella: 1 },
  { name: "conducenteStatoNascita", length: 6, format: "text", label: "Stato di nascita", tabella: 1 },
  { name: "conducenteCittadinanza", length: 6, format: "text", label: "Cittadinanza", tabella: 1 },
  { name: "conducenteCodiceFiscale", length: 16, format: "text", label: "Codice fiscale" },
  // Documento d'identità
  { name: "tipoDocumento", length: 2, format: "text", label: "Tipo documento", tabella: 3 },
  { name: "numeroDocumento", length: 20, format: "text", label: "Numero documento" },
  { name: "documentoRilasciatoDa", length: 40, format: "text", label: "Documento rilasciato da" },
  { name: "documentoDataRilascio", length: 8, format: "date", label: "Data rilascio documento" },
  { name: "documentoDataScadenza", length: 8, format: "date", label: "Scadenza documento" },
  // Patente
  { name: "patenteNumero", length: 20, format: "text", label: "Numero patente", required: true },
  { name: "patenteDataScadenza", length: 8, format: "date", label: "Scadenza patente" },
  // Residenza e contatti
  { name: "indirizzoResidenza", length: 60, format: "text", label: "Indirizzo di residenza" },
  { name: "comuneResidenza", length: 6, format: "text", label: "Comune di residenza", tabella: 1 },
  { name: "capResidenza", length: 5, format: "text", label: "CAP di residenza" },
  { name: "statoResidenza", length: 6, format: "text", label: "Stato di residenza", tabella: 1 },
  { name: "telefono", length: 20, format: "text", label: "Telefono" },
  { name: "email", length: 60, format: "text", label: "Email" },
  // Secondo conducente (opzionale)
  { name: "secondoCognome", length: 40, format: "text", label: "Cognome 2° conducente" },
  { name: "secondoNome", length: 40, format: "text", label: "Nome 2° conducente" },
  { name: "secondoDataNascita", length: 8, format: "date", label: "Nascita 2° conducente" },
  { name: "secondoPatenteNumero", length: 20, format: "text", label: "Patente 2° conducente" },
  { name: "note", length: 100, format: "text", label: "Note" },
];

function buildSpecs(): CargosFieldSpec[] {
  const specs: CargosFieldSpec[] = [];
  let cursor = 1;
  for (const def of FIELD_DEFS) {
    specs.push({ ...def, start: cursor });
    cursor += def.length;
  }
  const used = cursor - 1;
  if (used > CARGOS_RECORD_LENGTH) {
    throw new Error(
      `Tracciato CaRGOS incoerente: i campi dichiarati occupano ${used} caratteri (max ${CARGOS_RECORD_LENGTH}).`,
    );
  }
  // Filler finale: mantiene la lunghezza fissa dichiarata dal manuale.
  if (used < CARGOS_RECORD_LENGTH) {
    specs.push({
      name: "filler",
      start: cursor,
      length: CARGOS_RECORD_LENGTH - used,
      format: "filler",
      label: "Riempimento",
    });
  }
  return specs;
}

export const CARGOS_FIELDS: CargosFieldSpec[] = buildSpecs();

/** Campi valorizzati dall'applicativo: chiave logica → valore grezzo. */
export type CargosContract = Record<string, string | number | null | undefined>;

const ALLOWED = /[^A-Za-z0-9 .,'\-/@]/g;

/** Normalizza il testo: maiuscolo, senza accenti né caratteri fuori tracciato. */
export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(ALLOWED, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatValue(spec: CargosFieldSpec, raw: string | number | null | undefined): string {
  if (spec.format === "filler") return " ".repeat(spec.length);
  if (raw === null || raw === undefined || raw === "") {
    return spec.format === "num" || spec.format === "amount" ? "0".repeat(spec.length) : " ".repeat(spec.length);
  }
  switch (spec.format) {
    case "date": {
      // Accetta ISO (yyyy-mm-dd) o già compattato.
      const iso = String(raw).slice(0, 10).replace(/-/g, "");
      return iso.padEnd(spec.length, " ").slice(0, spec.length);
    }
    case "time": {
      const time = String(raw).replace(/[^0-9]/g, "").slice(0, 4);
      return time.padStart(spec.length, "0").slice(0, spec.length);
    }
    case "amount": {
      const cents = Math.round(Number(raw) * 100);
      return String(Math.max(0, cents)).padStart(spec.length, "0").slice(-spec.length);
    }
    case "num": {
      const digits = String(raw).replace(/[^0-9]/g, "");
      return digits.padStart(spec.length, "0").slice(-spec.length);
    }
    default: {
      const text = normalizeText(String(raw));
      return text.padEnd(spec.length, " ").slice(0, spec.length);
    }
  }
}

export type CargosValidationIssue = { field: string; label: string; message: string };

/** Verifica i campi obbligatori prima di costruire il tracciato. */
export function validateContract(contract: CargosContract): CargosValidationIssue[] {
  const issues: CargosValidationIssue[] = [];
  for (const spec of CARGOS_FIELDS) {
    if (!spec.required) continue;
    const raw = contract[spec.name];
    if (raw === null || raw === undefined || String(raw).trim() === "") {
      issues.push({ field: spec.name, label: spec.label, message: "valore obbligatorio mancante" });
    }
  }
  return issues;
}

/**
 * Serializza il contratto nel tracciato a posizione fissa.
 * Fallisce se la lunghezza finale non è esattamente `CARGOS_RECORD_LENGTH`:
 * meglio un errore visibile che un record silenziosamente disallineato.
 */
export function buildRecord(contract: CargosContract): string {
  let record = "";
  for (const spec of CARGOS_FIELDS) {
    const chunk = formatValue(spec, contract[spec.name]);
    if (chunk.length !== spec.length) {
      throw new Error(`Campo CaRGOS ${spec.name}: lunghezza ${chunk.length} invece di ${spec.length}.`);
    }
    if (record.length + 1 !== spec.start) {
      throw new Error(`Campo CaRGOS ${spec.name}: posizione ${record.length + 1} invece di ${spec.start}.`);
    }
    record += chunk;
  }
  if (record.length !== CARGOS_RECORD_LENGTH) {
    throw new Error(`Tracciato CaRGOS di ${record.length} caratteri invece di ${CARGOS_RECORD_LENGTH}.`);
  }
  return record;
}

/* ------------------------------------------------------------------ */
/* Client CaRGOS: interfaccia comune a mock e reale                    */
/* ------------------------------------------------------------------ */

export type CargosOutcome = {
  ok: boolean;
  /** Codice transazione restituito dal portale (se presente). */
  transactionId?: string | null;
  /** Messaggi di errore/avviso, uno per record scartato. */
  messages: string[];
  /** Risposta grezza, conservata per l'audit. */
  raw?: unknown;
};

export interface CargosClient {
  /** Etichetta dell'adapter attivo, mostrata nel pannello del gestionale. */
  readonly mode: "mock" | "live";
  getToken(): Promise<string>;
  /** Validazione formale senza acquisizione (api/Check). */
  checkRecords(records: string[]): Promise<CargosOutcome>;
  /** Invio definitivo (api/Send). */
  sendRecords(records: string[]): Promise<CargosOutcome>;
  /** Scarico di una tabella di codifica (api/Tabella). */
  getTabella(tabellaId: number): Promise<{ codice: string; descrizione: string; raw: string }[]>;
}

export const cargosStatusLabels: Record<string, string> = {
  in_attesa: "In attesa",
  validato: "Validato",
  inviato: "Inviato",
  errore: "Errore",
};

/**
 * ⚠️ DA VERIFICARE SUL MANUALE / PORTALE UFFICIALE
 * Il tracciato richiede il codice della "Tabella Luoghi Polizia" per più campi
 * (luogo di nascita, residenza, rilascio documento, rilascio patente, sede di
 * ritiro/rientro). Non è confermato che la tabella con id 1 ("Comuni e stati
 * esteri") sia la stessa "Tabella Luoghi": potrebbe essere una tabella distinta
 * o aggiuntiva. Chi avrà accesso al manuale (o al portale) deve controllarlo e,
 * se necessario, aggiungere qui la tabella corretta. Non modificare senza
 * conferma: un id sbagliato popola i mapping con codici non validi.
 */
export const cargosTabelle: { id: number; label: string }[] = [
  { id: 0, label: "Tipo pagamento" },
  { id: 1, label: "Comuni e stati esteri (da verificare: è la Tabella Luoghi?)" },
  { id: 2, label: "Tipo veicolo" },
  { id: 3, label: "Tipo documento" },
];

/* ------------------------------------------------------------------ */
/* Mapping configurabile (chiavi app_settings)                         */
/* ------------------------------------------------------------------ */

export const cargosSettingKeys = {
  /** Codice luogo polizia per sede: `cargos.luogo_polizia.<branch_id>`. */
  luogoPolizia: (branchId: string) => `cargos.luogo_polizia.${branchId}`,
  /** Codice tipo veicolo per categoria: `cargos.tipo_veicolo.<category_id>`. */
  tipoVeicolo: (categoryId: string) => `cargos.tipo_veicolo.${categoryId}`,
  /** Codice tipo pagamento per modalità interna. */
  tipoPagamento: (mode: string) => `cargos.tipo_pagamento.${mode}`,
  /** Codice tipo documento usato per default in anagrafica. */
  tipoDocumentoDefault: "cargos.tipo_documento.default",
  /** Codice organizzazione (fallback quando l'env non è impostato). */
  organizzazione: "cargos.organizzazione",
} as const;

export function readSetting(rows: { key: string; value: string }[] | null | undefined, key: string) {
  const found = (rows ?? []).find((r) => r.key === key);
  const value = found?.value?.trim();
  return value ? value : null;
}
