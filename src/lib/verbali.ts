/**
 * Verbali di consegna/rientro — costanti condivise client/server.
 * Il bucket è privato: ogni accesso passa da una URL firmata a breve scadenza.
 */
export const VERBALI_BUCKET = "verbali";

export type VerbaleKind = "consegna" | "rientro";

export function verbalePath(reservationId: string, kind: VerbaleKind) {
  return `${reservationId}/${kind}.pdf`;
}

export const VERBALE_LABELS: Record<VerbaleKind, string> = {
  consegna: "Verbale di consegna",
  rientro: "Verbale di rientro",
};

/** Destinatari interni sempre in copia dei verbali. */
export const VERBALE_INTERNAL_RECIPIENTS = [
  "booking@werentsrl.com",
  "amministrazione@werentsrl.com",
] as const;
