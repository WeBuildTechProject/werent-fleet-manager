import { createFileRoute } from "@tanstack/react-router";
import { absoluteUrl } from "@/lib/seo";

import { LegalDocumentPage } from "@/components/legal/legal-document-page";

export const Route = createFileRoute("/termini-e-condizioni")({
  head: () => ({
    meta: [
      { title: "Termini e Condizioni | We Rent" },
      { name: "description", content: "Termini e condizioni di utilizzo del sito e del servizio di prenotazione online We Rent." },
      { property: "og:title", content: "Termini e Condizioni | We Rent" },
      { property: "og:description", content: "Consulta i termini di utilizzo del sito e del servizio di prenotazione We Rent." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:url", content: absoluteUrl("/termini-e-condizioni") },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/termini-e-condizioni") }],
  }),
  component: () => <LegalDocumentPage slug="termini-e-condizioni" eyebrow="Documento legale" title="Termini e Condizioni" description="Le regole che disciplinano l’accesso al sito e il servizio di prenotazione online." notice="Documento in attesa di validazione legale." />,
});
