import * as React from "react";
import { Link, Text } from "@react-email/components";

import { EmailLayout, paragraph } from "./_shared";
import type { TemplateEntry } from "./registry";

interface Props {
  cliente?: string;
  codice?: string;
  importo?: string;
  link?: string;
}

const Email = ({ cliente = "cliente", codice = "—", importo = "—", link }: Props) => (
  <EmailLayout
    preview={`Ricevuta di pagamento · prenotazione ${codice}`}
    title="Ricevuta di pagamento disponibile"
  >
    <Text style={paragraph}>Gentile {cliente},</Text>
    <Text style={paragraph}>
      abbiamo registrato il pagamento di <strong>{importo}</strong> per la prenotazione{" "}
      <strong>{codice}</strong>. La ricevuta è disponibile al seguente link:
    </Text>
    <Text style={paragraph}>
      {link ? <Link href={link}>Scarica la ricevuta di pagamento</Link> : "link non disponibile"}
    </Text>
    <Text style={paragraph}>
      Il link è personale e temporaneo. Il documento resta sempre disponibile nella sua area
      clienti We Rent.
    </Text>
  </EmailLayout>
);

export const template = {
  component: Email,
  subject: (data: Record<string, unknown>) =>
    `Ricevuta di pagamento · prenotazione ${String(data["codice"] ?? "")}`,
  displayName: "Ricevuta di pagamento",
  previewData: {
    cliente: "Marco Rossi",
    codice: "WR-2609-008",
    importo: "180,00 €",
    link: "https://example.com/ricevuta.pdf",
  },
} satisfies TemplateEntry;
