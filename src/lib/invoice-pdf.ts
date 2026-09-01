import { jsPDF } from "jspdf";

import { company } from "@/lib/company";
import type { Invoice, Reservation } from "@/lib/gestionale";

/**
 * PDF fattura/ricevuta conforme ai dati minimi: intestazione azienda
 * (src/lib/company.ts), numero e data, dati cliente, righe, scorporo IVA.
 * Generato nel browser su richiesta dell'operatore (nessuno storage remoto).
 */
const euro = (v: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v);

export function buildInvoicePdf(invoice: Invoice, reservation?: Reservation): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const left = 18;
  let y = 22;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("werent", left, y);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
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
  doc.text("FATTURA / RICEVUTA", 192, 24, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`N. ${invoice.numero_fattura}`, 192, 31, { align: "right" });
  doc.text(
    `Data ${new Date(invoice.data_emissione).toLocaleDateString("it-IT")}`,
    192,
    37,
    { align: "right" },
  );

  y += 14;
  doc.setFont("helvetica", "bold");
  doc.text("Cliente", left, y);
  doc.setFont("helvetica", "normal");
  y += 6;
  doc.text(invoice.cliente_denominazione || reservation?.customer_name || "—", left, y);
  if (invoice.cliente_piva_cf) {
    y += 5;
    doc.text(`P. IVA / C.F. ${invoice.cliente_piva_cf}`, left, y);
  }
  if (reservation?.customer_email) {
    y += 5;
    doc.text(reservation.customer_email, left, y);
  }

  y += 14;
  doc.setFillColor(240, 243, 240);
  doc.rect(left, y - 5, 174, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.text("Descrizione", left + 2, y);
  doc.text("Imponibile", 150, y, { align: "right" });
  doc.text("IVA 22%", 190, y, { align: "right" });

  y += 10;
  doc.setFont("helvetica", "normal");
  const description = reservation
    ? `Servizio di noleggio veicolo · prenotazione ${reservation.code} · dal ${new Date(
        reservation.date_from,
      ).toLocaleDateString("it-IT")} al ${new Date(reservation.date_to).toLocaleDateString("it-IT")}`
    : "Servizio di noleggio veicolo";
  const lines = doc.splitTextToSize(description, 120) as string[];
  doc.text(lines, left + 2, y);
  doc.text(euro(Number(invoice.imponibile)), 150, y, { align: "right" });
  doc.text(euro(Number(invoice.iva)), 190, y, { align: "right" });

  y += Math.max(12, lines.length * 5 + 8);
  doc.line(left, y, 192, y);
  y += 8;
  doc.text("Totale imponibile", 150, y, { align: "right" });
  doc.text(euro(Number(invoice.imponibile)), 190, y, { align: "right" });
  y += 6;
  doc.text("IVA 22%", 150, y, { align: "right" });
  doc.text(euro(Number(invoice.iva)), 190, y, { align: "right" });
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Totale documento", 150, y, { align: "right" });
  doc.text(euro(Number(invoice.totale)), 190, y, { align: "right" });

  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    "Documento generato dal gestionale We Rent. Pronto per il caricamento sul sistema di fatturazione elettronica.",
    left,
    y,
  );

  return doc;
}

export function downloadInvoicePdf(invoice: Invoice, reservation?: Reservation) {
  buildInvoicePdf(invoice, reservation).save(
    `fattura-${invoice.numero_fattura.replace("/", "-")}.pdf`,
  );
}
