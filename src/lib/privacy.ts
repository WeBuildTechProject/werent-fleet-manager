import { company } from "@/lib/company";

export type PrivacyLanguage = "it" | "en";

export function privacySections(lang: PrivacyLanguage) {
  const it = lang === "it";
  return [
    {
      heading: it ? "1. Titolare del trattamento" : "1. Data controller",
      body: it
        ? `Il titolare è ${company.name}, ${company.legalAddress}, P.IVA ${company.vat}. Per ogni richiesta relativa ai dati personali scrivi a ${company.email} o chiama il ${company.phone}.`
        : `The controller is ${company.name}, ${company.legalAddress}, VAT ${company.vat}. For any request about personal data write to ${company.email} or call ${company.phone}.`,
    },
    {
      heading: it ? "2. Dati trattati" : "2. Data processed",
      body: it
        ? "Trattiamo dati anagrafici e di contatto, dati della patente e del documento di identità, dati di pagamento (tramite provider certificati), dati di noleggio (veicolo, sede, date, chilometraggio, eventuali danni) e dati tecnici di navigazione del sito."
        : "We process identification and contact data, driving licence and ID data, payment data (via certified providers), rental data (vehicle, branch, dates, mileage, any damage) and technical browsing data.",
    },
    {
      heading: it ? "3. Finalità e base giuridica" : "3. Purposes and legal basis",
      body: it
        ? "I dati sono trattati per la gestione di preventivi, prenotazioni e contratti di noleggio (esecuzione del contratto), per adempimenti fiscali, assicurativi e di legge (obbligo legale), per la tutela dei nostri diritti in caso di sinistri o sanzioni (legittimo interesse) e, solo con consenso separato e revocabile, per comunicazioni commerciali."
        : "Data is processed to manage quotes, bookings and rental agreements (contract performance), for tax, insurance and legal obligations, to protect our rights in case of accidents or fines (legitimate interest) and, only with separate revocable consent, for marketing communications.",
    },
    {
      heading: it ? "4. Destinatari" : "4. Recipients",
      body: it
        ? "I dati possono essere comunicati a compagnie assicurative, società di recupero crediti, autorità competenti, consulenti fiscali e legali, e ai fornitori tecnologici che gestiscono il motore di prenotazione e l'infrastruttura del sito, nominati responsabili del trattamento. Non vendiamo dati a terzi."
        : "Data may be shared with insurance companies, debt collection agencies, competent authorities, tax and legal advisors, and the technology providers running the booking engine and site infrastructure, appointed as processors. We never sell data.",
    },
    {
      heading: it ? "5. Conservazione" : "5. Retention",
      body: it
        ? "I dati contrattuali e fiscali sono conservati per 10 anni dalla chiusura del noleggio, come previsto dalla normativa civilistica e tributaria. I dati per finalità di marketing sono conservati fino alla revoca del consenso e comunque non oltre 24 mesi dall'ultimo contatto."
        : "Contractual and tax data is retained for 10 years after the rental closes, as required by law. Marketing data is retained until consent is withdrawn and in any case no longer than 24 months from the last contact.",
    },
    {
      heading: it ? "6. Diritti dell'interessato" : "6. Your rights",
      body: it
        ? "Puoi esercitare in ogni momento i diritti di accesso, rettifica, cancellazione, limitazione, portabilità e opposizione, oltre alla revoca del consenso, scrivendo al titolare. Hai inoltre diritto di proporre reclamo al Garante per la protezione dei dati personali."
        : "You may exercise at any time the rights of access, rectification, erasure, restriction, portability and objection, as well as withdrawal of consent, by writing to the controller. You also have the right to lodge a complaint with the supervisory authority.",
    },
  ];
}

export function privacyNoticeMarkdown(lang: PrivacyLanguage) {
  return privacySections(lang)
    .map((section) => `## ${section.heading}\n\n${section.body}`)
    .join("\n\n");
}