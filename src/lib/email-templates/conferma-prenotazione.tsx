import * as React from "react";
import { Text } from "@react-email/components";

import { EmailLayout, paragraph } from "./_shared";
import type { TemplateEntry } from "./registry";

interface Props {
  cliente?: string;
  codice?: string;
  modello?: string;
  sede?: string;
  data_ritiro?: string;
  data_rientro?: string;
  totale?: string | number;
}

const Email = ({
  cliente = "cliente",
  codice = "—",
  modello = "—",
  sede = "—",
  data_ritiro = "—",
  data_rientro = "—",
  totale = "—",
}: Props) => (
  <EmailLayout
    preview={`Prenotazione ${codice} confermata`}
    title="Prenotazione confermata"
  >
    <Text style={paragraph}>Gentile {cliente},</Text>
    <Text style={paragraph}>
      la sua prenotazione <strong>{codice}</strong> è confermata: {modello}, dal{" "}
      {data_ritiro} al {data_rientro}.
    </Text>
    <Text style={paragraph}>
      Sede di ritiro: {sede} · Totale: € {totale}
    </Text>
  </EmailLayout>
);

export const template = {
  component: Email,
  subject: (data: Record<string, unknown>) =>
    `Conferma prenotazione ${String(data["codice"] ?? "")}`,
  displayName: "Conferma prenotazione",
  previewData: {
    cliente: "Marco Rossi",
    codice: "WR-2609-008",
    modello: "Fiat Panda",
    sede: "Cagliari",
    data_ritiro: "01/09/2026",
    data_rientro: "05/09/2026",
    totale: "184,00",
  },
} satisfies TemplateEntry;
