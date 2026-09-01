/**
 * Documenti obbligatori richiesti al cliente in fase di prenotazione.
 * Nessuna estrazione dati (OCR/validazione automatica): il file viene solo
 * raccolto e conservato in uno spazio privato collegato alla prenotazione.
 */
export const DOCUMENT_TYPES = [
  "documento_identita",
  "tessera_sanitaria",
  "patente",
  "carta_pagamento",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_LABELS: Record<DocumentType, { it: string; en: string; hint_it: string; hint_en: string }> = {
  documento_identita: {
    it: "Documento d'identità valido",
    en: "Valid ID document",
    hint_it: "Carta d'identità o passaporto in corso di validità.",
    hint_en: "Valid identity card or passport.",
  },
  tessera_sanitaria: {
    it: "Tessera sanitaria",
    en: "Health insurance card",
    hint_it: "Fronte della tessera sanitaria / codice fiscale.",
    hint_en: "Front of the health card / tax code card.",
  },
  patente: {
    it: "Patente di guida del conducente",
    en: "Driver's licence",
    hint_it: "Patente idonea alla categoria del veicolo noleggiato.",
    hint_en: "Licence valid for the rented vehicle category.",
  },
  carta_pagamento: {
    it: "Carta di pagamento (fronte)",
    en: "Payment card (front)",
    hint_it:
      "Serve solo a verificare intestatario e circuito: non registriamo alcun dato di pagamento, oscura le cifre che non vuoi condividere.",
    hint_en:
      "Only to verify cardholder and network: we store no payment data, feel free to mask the digits you prefer.",
  },
};

export const DOCUMENT_BUCKET = "documenti-clienti";

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_DOCUMENT_MIME = ["image/jpeg", "image/png", "application/pdf"] as const;

export const ACCEPTED_DOCUMENT_ATTR = ".jpg,.jpeg,.png,.pdf";

/** Estensione normalizzata a partire dal MIME type accettato. */
export function extensionFor(contentType: string): "jpg" | "png" | "pdf" | null {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "application/pdf") return "pdf";
  return null;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
