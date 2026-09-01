import * as React from "react";
import { Text } from "@react-email/components";

import { EmailLayout, paragraph } from "./_shared";
import type { TemplateEntry } from "./registry";

interface Props {
  documento?: string;
  intestatario?: string;
  data_scadenza?: string;
}

const Email = ({
  documento = "—",
  intestatario = "—",
  data_scadenza = "—",
}: Props) => (
  <EmailLayout
    preview={`Documento ${documento} in scadenza il ${data_scadenza}`}
    title="Documento in scadenza"
  >
    <Text style={paragraph}>
      Il documento <strong>{documento}</strong> di {intestatario} scade il{" "}
      <strong>{data_scadenza}</strong>.
    </Text>
    <Text style={paragraph}>
      Aggiorni il documento prima della scadenza per non interrompere il servizio.
    </Text>
  </EmailLayout>
);

export const template = {
  component: Email,
  subject: (data: Record<string, unknown>) =>
    `Documento in scadenza — ${String(data["documento"] ?? "")}`,
  displayName: "Documento in scadenza",
  previewData: {
    documento: "Patente di guida",
    intestatario: "Marco Rossi",
    data_scadenza: "30/09/2026",
  },
} satisfies TemplateEntry;
