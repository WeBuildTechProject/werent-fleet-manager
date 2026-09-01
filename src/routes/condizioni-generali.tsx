import { createFileRoute } from "@tanstack/react-router";

import { LegalDocumentPage } from "@/components/legal/legal-document-page";

export const Route = createFileRoute("/condizioni-generali")({
  head: () => ({
    meta: [
      { title: "Condizioni Generali di Noleggio | We Rent" },
      { name: "description", content: "Condizioni Generali di Noleggio dei veicoli We Rent S.r.l." },
      { property: "og:title", content: "Condizioni Generali di Noleggio | We Rent" },
      { property: "og:description", content: "Consulta le condizioni contrattuali applicabili al noleggio We Rent." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <LegalDocumentPage slug="condizioni-generali" eyebrow="Documento legale" title="Condizioni Generali di Noleggio" description="Il documento contrattuale che disciplina il rapporto di noleggio, dalla consegna alla riconsegna del veicolo." />,
});
