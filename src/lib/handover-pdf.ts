import { jsPDF } from "jspdf";

import { company } from "@/lib/company";

/**
 * Verbale di consegna / rientro veicolo (Lotto 23).
 *
 * Stessa identità visiva della fattura (`invoice-pdf.ts`): intestazione We Rent,
 * dati societari, footer con P. IVA / REA / sede legale. Il documento è
 * generato lato server al termine di `checkoutVehicle` / `checkinVehicle`,
 * quindi il modulo non usa alcuna API del browser: solo jsPDF.
 */

export type VerbaleTipo = "consegna" | "rientro";

export type VerbaleDamage = {
  label: string;
  view: string;
  description?: string | null;
  charge_amount?: number | null;
};

export type VerbaleData = {
  tipo: VerbaleTipo;
  /** Prenotazione */
  codice: string;
  dataDal: string;
  dataAl: string;
  sede: string;
  /** Cliente */
  cliente: string;
  clienteEmail: string;
  clienteDocumento: string | null;
  /** Veicolo */
  targa: string;
  modello: string;
  categoria: string;
  /** Stato al passaggio di consegna */
  km: number;
  carburanteLitri: number;
  capacitaLitri: number | null;
  dotazioni: string[];
  danni: VerbaleDamage[];
  /** Firma */
  firmaDataUrl: string | null;
  firmaAt: string | null;
  /** Conferma esplicita dei dati rilevati, distinta dalla firma (Lotto 23-bis). */
  dataConfirmedAt: string | null;
  /** Accettazione contrattuale (Lotto 21) */
  contractAcceptedAt: string | null;
  contractVersion: number | null;
};

const euro = (v: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v);

const dateOnly = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("it-IT") : "—";

const dateTime = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("it-IT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export function verbaleFileName(tipo: VerbaleTipo, codice: string) {
  return `verbale-${tipo}-${codice}.pdf`;
}

export function buildHandoverPdf(data: VerbaleData): jsPDF {
  const isConsegna = data.tipo === "consegna";
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const left = 18;
  const right = 192;
  let y = 22;

  // Intestazione societaria
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
  doc.text(
    isConsegna ? "VERBALE DI CONSEGNA" : "VERBALE DI RIENTRO",
    right,
    24,
    { align: "right" },
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Prenotazione ${data.codice}`, right, 31, { align: "right" });
  doc.text(`Emesso il ${dateTime(new Date().toISOString())}`, right, 37, { align: "right" });

  const section = (title: string) => {
    y += 11;
    doc.setFillColor(240, 243, 240);
    doc.rect(left, y - 5, right - left, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(title, left + 2, y);
    doc.setFont("helvetica", "normal");
    y += 8;
  };

  const row = (label: string, value: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, left + 2, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(value || "—", 110) as string[];
    doc.text(lines, left + 62, y);
    y += Math.max(6, lines.length * 5 + 1);
  };

  y += 6;
  section("Noleggio");
  row("Periodo", `dal ${dateOnly(data.dataDal)} al ${dateOnly(data.dataAl)}`);
  row("Sede di ritiro / consegna", data.sede);

  section("Cliente");
  row("Nominativo", data.cliente);
  row("Contatto", data.clienteEmail);
  row("Documento / patente", data.clienteDocumento ?? "—");

  section("Veicolo");
  row("Targa", data.targa);
  row("Modello", data.modello);
  row("Categoria", data.categoria);

  section(isConsegna ? "Stato al ritiro" : "Stato al rientro");
  row("Chilometraggio", `${data.km.toLocaleString("it-IT")} km`);
  row(
    "Carburante",
    data.capacitaLitri
      ? `${data.carburanteLitri} litri su ${data.capacitaLitri} litri di capacità`
      : `${data.carburanteLitri} litri`,
  );
  row(
    isConsegna ? "Dotazioni consegnate" : "Dotazioni restituite",
    data.dotazioni.length > 0 ? data.dotazioni.join(", ") : "Nessuna dotazione registrata",
  );

  doc.setFont("helvetica", "bold");
  doc.text(
    isConsegna ? "Danni preesistenti annotati" : "Nuovi danni rilevati",
    left + 2,
    y,
  );
  doc.setFont("helvetica", "normal");
  y += 6;
  if (data.danni.length === 0) {
    doc.text(
      isConsegna
        ? "Nessun danno preesistente rilevato al momento della consegna."
        : "Nessun nuovo danno rilevato al momento della riconsegna.",
      left + 2,
      y,
    );
    y += 6;
  } else {
    for (const d of data.danni) {
      const charge = Number(d.charge_amount ?? 0);
      const text = `• ${d.label} · ${d.view}${d.description ? ` — ${d.description}` : ""}${
        charge > 0 ? ` · addebito ${euro(charge)}` : ""
      }`;
      const lines = doc.splitTextToSize(text, right - left - 6) as string[];
      if (y > 250) {
        doc.addPage();
        y = 22;
      }
      doc.text(lines, left + 2, y);
      y += lines.length * 5 + 1;
    }
  }

  if (y > 210) {
    doc.addPage();
    y = 22;
  }

  section("Conferma e firma del cliente");
  const declaration = isConsegna
    ? "Il cliente dichiara che i dati sopra riportati (chilometraggio, carburante, stato del veicolo, dotazioni) corrispondono a quanto verificato al momento della consegna."
    : "Il cliente dichiara che i dati sopra riportati (chilometraggio, carburante, stato del veicolo, dotazioni) corrispondono a quanto verificato al momento della riconsegna.";
  const declLines = doc.splitTextToSize(declaration, right - left - 4) as string[];
  doc.text(declLines, left + 2, y);
  y += declLines.length * 5 + 4;

  if (data.contractAcceptedAt) {
    const contract = `Il cliente ha accettato le Condizioni Generali di Noleggio in data ${dateTime(
      data.contractAcceptedAt,
    )}, versione ${data.contractVersion ?? "—"}.`;
    const contractLines = doc.splitTextToSize(contract, right - left - 4) as string[];
    doc.text(contractLines, left + 2, y);
    y += contractLines.length * 5 + 4;
  }

  doc.text(
    data.dataConfirmedAt
      ? `Conferma dei dati rilevati registrata il ${dateTime(data.dataConfirmedAt)}`
      : "Conferma dei dati rilevati: non registrata",
    left + 2,
    y,
  );
  y += 6;
  doc.text(`Firma acquisita il ${dateTime(data.firmaAt)}`, left + 2, y);
  y += 4;

  if (data.firmaDataUrl?.startsWith("data:image/png")) {
    try {
      doc.addImage(data.firmaDataUrl, "PNG", left + 2, y, 70, 26);
    } catch {
      // Una firma illeggibile non deve impedire l'emissione del verbale:
      // il riferimento temporale resta comunque a documento.
      doc.text("(firma acquisita digitalmente)", left + 2, y + 8);
    }
    y += 28;
  } else {
    doc.text("(firma acquisita digitalmente)", left + 2, y + 8);
    y += 14;
  }
  doc.line(left + 2, y, left + 76, y);
  y += 5;
  doc.setFontSize(8);
  doc.text("Firma del cliente", left + 2, y);
  doc.setFontSize(10);

  // Footer
  doc.setFontSize(8);
  doc.text(
    `${company.name} · P. IVA ${company.vat} · REA ${company.rea} · ${company.legalAddress} · documento generato automaticamente dal gestionale We Rent.`,
    left,
    287,
    { maxWidth: right - left },
  );

  return doc;
}

/** Bytes del PDF, pronti per l'upload su storage privato. */
export function handoverPdfBytes(data: VerbaleData): Uint8Array {
  const doc = buildHandoverPdf(data);
  return new Uint8Array(doc.output("arraybuffer") as ArrayBuffer);
}
