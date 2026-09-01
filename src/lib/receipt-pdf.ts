import { jsPDF } from "jspdf";

import { company } from "@/lib/company";
import { paymentMethodLabels, paymentTypeLabels } from "@/lib/receipts";

/**
 * Ricevuta di pagamento (Lotto 25).
 *
 * Stessa identità visiva e stessa libreria (jsPDF) di `invoice-pdf.ts` e
 * `handover-pdf.ts`. Generata lato server quando un pagamento risulta
 * `succeeded`: nessuna API del browser.
 */
export type ReceiptData = {
  numero: string;
  dataPagamento: string;
  importo: number;
  metodo: string;
  tipo: string;
  /** Prenotazione */
  codice: string;
  dataDal: string;
  dataAl: string;
  sede: string;
  veicolo: string | null;
  totaleNoleggio: number;
  /** Cliente */
  cliente: string;
  clienteEmail: string;
  clienteDocumento: string | null;
};

const euro = (v: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v);

const day = (value: string) => new Date(value).toLocaleDateString("it-IT");
const dayTime = (value: string) =>
  new Date(value).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" });

export function buildReceiptPdf(data: ReceiptData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const left = 18;
  let y = 22;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("werent", left, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y += 7;
  doc.text(company.name, left, y);
  y += 5;
  doc.text(`P. IVA ${company.vat} · REA ${company.rea}`, left, y);
  y += 5;
  doc.text(company.legalAddress, left, y);
  y += 5;
  doc.text(`${company.phone} · ${company.email}`, left, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("RICEVUTA DI PAGAMENTO", 192, 24, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`N. ${data.numero}`, 192, 31, { align: "right" });
  doc.text(`Data ${dayTime(data.dataPagamento)}`, 192, 37, { align: "right" });

  y += 14;
  doc.setFont("helvetica", "bold");
  doc.text("Cliente", left, y);
  doc.setFont("helvetica", "normal");
  y += 6;
  doc.text(data.cliente || "—", left, y);
  y += 5;
  doc.text(data.clienteEmail || "—", left, y);
  if (data.clienteDocumento) {
    y += 5;
    doc.text(data.clienteDocumento, left, y);
  }

  y += 12;
  doc.setFont("helvetica", "bold");
  doc.text("Prenotazione", left, y);
  doc.setFont("helvetica", "normal");
  const rows: Array<[string, string]> = [
    ["Codice", data.codice],
    ["Periodo", `${day(data.dataDal)} → ${day(data.dataAl)}`],
    ["Sede di ritiro", data.sede],
    ["Veicolo", data.veicolo ?? "da assegnare"],
    ["Totale noleggio", euro(data.totaleNoleggio)],
  ];
  for (const [label, value] of rows) {
    y += 6;
    doc.text(label, left, y);
    doc.text(value, 100, y);
  }

  y += 14;
  doc.setFillColor(240, 243, 240);
  doc.rect(left, y - 5, 174, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.text("Pagamento registrato", left + 2, y);
  doc.text("Importo", 190, y, { align: "right" });

  y += 10;
  doc.setFont("helvetica", "normal");
  doc.text(paymentTypeLabels[data.tipo] ?? data.tipo, left + 2, y);
  doc.setFont("helvetica", "bold");
  doc.text(euro(data.importo), 190, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  y += 6;
  doc.text(`Metodo: ${paymentMethodLabels[data.metodo] ?? data.metodo}`, left + 2, y);
  y += 6;
  doc.text(`Data e ora dell'incasso: ${dayTime(data.dataPagamento)}`, left + 2, y);

  y += 16;
  doc.setFontSize(8);
  doc.text(
    "Documento generato automaticamente dal sistema We Rent a conferma dell'incasso. Non sostituisce la fattura,",
    left,
    y,
  );
  y += 4;
  doc.text(
    `emessa separatamente e disponibile nell'area clienti. ${company.name} · ${company.site}`,
    left,
    y,
  );

  return doc;
}

export function receiptPdfBytes(data: ReceiptData): Uint8Array {
  return new Uint8Array(buildReceiptPdf(data).output("arraybuffer") as ArrayBuffer);
}
