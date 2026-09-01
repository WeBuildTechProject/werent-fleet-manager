import * as React from "react";
import { Link, Text } from "@react-email/components";

import { EmailLayout, paragraph } from "./_shared";
import type { TemplateEntry } from "./registry";

interface Props {
  cliente?: string;
  codice?: string;
  targa?: string;
  link?: string;
}

const Email = ({ cliente = "cliente", codice = "—", targa = "—", link }: Props) => (
  <EmailLayout
    preview={`Verbale di consegna · prenotazione ${codice}`}
    title="Verbale di consegna disponibile"
  >
    <Text style={paragraph}>Gentile {cliente},</Text>
    <Text style={paragraph}>
      il verbale di consegna del veicolo <strong>{targa}</strong>, relativo alla prenotazione{" "}
      <strong>{codice}</strong>, è disponibile al seguente link:
    </Text>
    <Text style={paragraph}>
      {link ? <Link href={link}>Scarica il verbale di consegna</Link> : "link non disponibile"}
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
    `Verbale di consegna · prenotazione ${String(data["codice"] ?? "")}`,
  displayName: "Verbale di consegna",
  previewData: {
    cliente: "Marco Rossi",
    codice: "WR-2609-008",
    targa: "GX123AB",
    link: "https://example.com/verbale-consegna.pdf",
  },
} satisfies TemplateEntry;
