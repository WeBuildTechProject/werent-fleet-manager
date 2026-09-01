import type { Invoice, Reservation } from "@/lib/gestionale";

/** Escape CSV: separatore punto e virgola, atteso da Excel in locale italiano. */
function cell(value: string | number) {
  const s = String(value ?? "");
  return /[";\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

const euro = (n: number) => Number(n).toFixed(2).replace(".", ",");

const headers = [
  "Numero fattura",
  "Data emissione",
  "Cliente",
  "P.IVA / CF",
  "Imponibile",
  "IVA",
  "Totale",
  "Stato pagamento",
  "Riferimento prenotazione",
];

/**
 * Export per il commercialista: un CSV leggibile e importabile a mano in un
 * software di contabilità esterno. Nessun motore contabile interno.
 */
export function buildAccountingCsv(
  invoices: Invoice[],
  reservations: Map<string, Reservation>,
) {
  const lines = [headers.join(";")];
  for (const i of invoices) {
    lines.push(
      [
        cell(i.numero_fattura),
        cell(i.data_emissione),
        cell(i.cliente_denominazione),
        cell(i.cliente_piva_cf),
        cell(euro(Number(i.imponibile))),
        cell(euro(Number(i.iva))),
        cell(euro(Number(i.totale))),
        cell(i.stato),
        cell(reservations.get(i.reservation_id)?.code ?? ""),
      ].join(";"),
    );
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function downloadAccountingCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
