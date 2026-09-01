/**
 * Ricevute di pagamento — costanti condivise client/server.
 * Il bucket è privato: ogni accesso passa da una URL firmata a breve scadenza,
 * esattamente come per i verbali (`src/lib/verbali.ts`).
 */
export const RICEVUTE_BUCKET = "ricevute";

export function receiptPath(reservationId: string, paymentId: string) {
  return `${reservationId}/ricevuta-${paymentId}.pdf`;
}

export const paymentMethodLabels: Record<string, string> = {
  stripe: "Carta di credito (online)",
  contanti_pos: "Contanti / POS in sede",
};

export const paymentTypeLabels: Record<string, string> = {
  caparra: "Caparra confirmatoria",
  saldo: "Saldo",
  pagamento_completo: "Pagamento completo",
};
