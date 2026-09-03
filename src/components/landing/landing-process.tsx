import { useI18n } from "@/lib/i18n";

const steps = [
  {
    n: "01",
    title: { it: "Scegli e prenota", en: "Choose and book" },
    body: {
      it: "Seleziona sede, date e veicolo: la disponibilità è reale, il prezzo mostrato è quello finale.",
      en: "Pick branch, dates and vehicle: real-time availability, the price shown is the final one.",
    },
  },
  {
    n: "02",
    title: { it: "Conferma immediata", en: "Instant confirmation" },
    body: {
      it: "Ricevi subito la conferma via email, senza attese: nessuna carta richiesta per bloccare la prenotazione.",
      en: "You get instant email confirmation, no waiting: no card needed to hold the booking.",
    },
  },
  {
    n: "03",
    title: { it: "Ritiro in aeroporto", en: "Airport pick-up" },
    body: {
      it: "Documenti, carta di credito per la cauzione e le chiavi sono pronte alla sede scelta.",
      en: "Documents, credit card for the deposit, and keys are ready at your chosen branch.",
    },
  },
  {
    n: "04",
    title: { it: "Riconsegna senza sorprese", en: "Hassle-free return" },
    body: {
      it: "RCA, IVA e assistenza stradale erano già incluse nel prezzo: nessun costo aggiunto al banco.",
      en: "Liability cover, VAT and roadside assistance were already included: no extra cost at the desk.",
    },
  },
];

export function LandingProcess() {
  const { t, lang } = useI18n();
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((s) => (
        <div key={s.n} className="relative rounded-2xl border border-border bg-card p-6 shadow-card">
          <span className="font-display text-3xl text-primary/40">{s.n}</span>
          <h3 className="mt-2 text-lg">{s.title[lang]}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{t(s.body.it, s.body.en)}</p>
        </div>
      ))}
    </div>
  );
}
