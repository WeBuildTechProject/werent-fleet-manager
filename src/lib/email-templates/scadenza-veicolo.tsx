import * as React from "react";
import { Text } from "@react-email/components";

import { EmailLayout, paragraph } from "./_shared";
import type { TemplateEntry } from "./registry";

interface Props {
  targa?: string;
  modello?: string;
  sede?: string;
  tipo_scadenza?: string;
  data_scadenza?: string;
  giorni?: number | string;
  priorita?: string;
}

const Email = ({
  targa = "—",
  modello = "—",
  sede = "—",
  tipo_scadenza = "—",
  data_scadenza = "—",
  giorni = "—",
  priorita = "—",
}: Props) => (
  <EmailLayout
    preview={`Scadenza ${tipo_scadenza} per ${targa} tra ${giorni} giorni`}
    title="Scadenza veicolo in avvicinamento"
  >
    <Text style={paragraph}>
      Il veicolo <strong>{targa}</strong> ({modello}) ha una scadenza{" "}
      <strong>{tipo_scadenza}</strong> prevista per il <strong>{data_scadenza}</strong>,
      tra {giorni} giorni.
    </Text>
    <Text style={paragraph}>
      Sede: {sede} · Priorità: {priorita}
    </Text>
    <Text style={paragraph}>
      Programma l'intervento dal gestionale, sezione Flotta.
    </Text>
  </EmailLayout>
);

export const template = {
  component: Email,
  subject: (data: Record<string, unknown>) =>
    `Scadenza ${String(data["tipo_scadenza"] ?? "veicolo")} — ${String(
      data["targa"] ?? "",
    )} (tra ${String(data["giorni"] ?? "")} giorni)`,
  displayName: "Scadenza veicolo",
  previewData: {
    targa: "GH123KL",
    modello: "Fiat Panda",
    sede: "Cagliari",
    tipo_scadenza: "Revisione",
    data_scadenza: "12/09/2026",
    giorni: 7,
    priorita: "Alta",
  },
} satisfies TemplateEntry;
