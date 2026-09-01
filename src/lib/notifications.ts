/**
 * Notifiche transazionali We Rent — tipi condivisi client/server.
 * Solo il canale email è inviabile: whatsapp è modellato ma non attivo.
 */
export type NotificationType =
  | "scadenza_veicolo"
  | "fine_noleggio_imminente"
  | "documento_in_scadenza"
  | "conferma_prenotazione"
  | "verbale_consegna"
  | "verbale_rientro"
  | "ricevuta_pagamento"
  | "altro";

export type NotificationChannel = "email" | "whatsapp";
export type NotificationStatus = "in_coda" | "inviata" | "fallita";

export const notificationTypeLabels: Record<NotificationType, string> = {
  scadenza_veicolo: "Scadenza veicolo",
  fine_noleggio_imminente: "Fine noleggio imminente",
  documento_in_scadenza: "Documento in scadenza",
  conferma_prenotazione: "Conferma prenotazione",
  verbale_consegna: "Verbale di consegna",
  verbale_rientro: "Verbale di rientro",
  ricevuta_pagamento: "Ricevuta di pagamento",
  altro: "Altro",
};

export const notificationStatusLabels: Record<NotificationStatus, string> = {
  in_coda: "In coda",
  inviata: "Inviata",
  fallita: "Fallita",
};

/**
 * Punto di controllo unico per il consenso marketing.
 * Oggi tutte le notifiche sono di servizio (esecuzione del contratto o
 * sicurezza/conformità del veicolo), quindi ritorna sempre false: quando
 * verranno aggiunti tipi promozionali basterà elencarli qui.
 */
const marketingTypes: readonly NotificationType[] = [];

export function requiresMarketingConsent(tipo: NotificationType): boolean {
  return marketingTypes.includes(tipo);
}

/** Soglie in giorni per gli avvisi di scadenza veicolo. */
export const expirationThresholds = [7, 3, 1] as const;
