import * as React from "react";
import { Text } from "@react-email/components";

import { EmailLayout, paragraph } from "./_shared";
import type { TemplateEntry } from "./registry";

interface Props {
  cliente?: string;
  codice?: string;
  modello?: string;
  sede?: string;
  data_rientro?: string;
}

const Email = ({
  cliente = "cliente",
  codice = "—",
  modello = "—",
  sede = "—",
  data_rientro = "—",
}: Props) => (
  <EmailLayout
    preview={`Il tuo noleggio ${codice} termina il ${data_rientro}`}
    title="Promemoria rientro veicolo"
  >
    <Text style={paragraph}>Gentile {cliente},</Text>
    <Text style={paragraph}>
      le ricordiamo che il noleggio <strong>{codice}</strong> ({modello}) termina il{" "}
      <strong>{data_rientro}</strong>.
    </Text>
    <Text style={paragraph}>Sede di riconsegna: {sede}.</Text>
    <Text style={paragraph}>
      Le chiediamo di riconsegnare il veicolo con lo stesso livello di carburante del
      ritiro. Per proroghe o variazioni ci contatti in anticipo.
    </Text>
  </EmailLayout>
);

export const template = {
  component: Email,
  subject: (data: Record<string, unknown>) =>
    `Il tuo noleggio We Rent termina il ${String(data["data_rientro"] ?? "")}`,
  displayName: "Fine noleggio imminente",
  previewData: {
    cliente: "Marco Rossi",
    codice: "WR-2609-008",
    modello: "Toyota Aygo",
    sede: "Olbia",
    data_rientro: "28/08/2026",
  },
} satisfies TemplateEntry;
