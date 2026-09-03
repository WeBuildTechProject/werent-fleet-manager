import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Car,
  Check,
  Clock,
  MapPin,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Wallet,
} from "lucide-react";

import { RentHubEmbed } from "@/components/booking/renthub-embed";
import { SearchWidget } from "@/components/search-widget";
import { JsonLd } from "@/components/json-ld";
import { LandingFaq, type LandingFaqEntry } from "@/components/landing/landing-faq";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingProcess } from "@/components/landing/landing-process";
import { ReviewsCarousel } from "@/components/reviews-carousel";
import { TrustStrip } from "@/components/trust-strip";
import { Button } from "@/components/ui/button";
import { whatsappHref } from "@/components/whatsapp-fab";
import { company } from "@/lib/company";
import { categories, vehicles } from "@/lib/fleet";
import { useI18n } from "@/lib/i18n";
import { PUBLIC_SITE_ONLY } from "@/lib/site-mode";
import { absoluteUrl, buildBreadcrumbJsonLd } from "@/lib/seo";

export const Route = createFileRoute("/noleggio-auto")({
  head: () => ({
    meta: [
      { title: "Noleggio auto a Cagliari, Olbia e Milano Linate | We Rent" },
      {
        name: "description",
        content:
          "Noleggia un'auto economy o premium a Cagliari Elmas, Olbia e Milano Linate. RCA e IVA incluse, cancellazione gratuita, ritiro in aeroporto. Prenota online in 2 minuti.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Noleggio auto a Cagliari, Olbia e Milano Linate | We Rent" },
      {
        property: "og:description",
        content: "Auto sempre nuove, prezzo trasparente, ritiro in aeroporto. Prenota online in 2 minuti.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absoluteUrl("/noleggio-auto") },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/noleggio-auto") }],
  }),
  component: NoleggioAutoPage,
});

const usps = [
  {
    icon: Wallet,
    title: { it: "Prezzo tutto incluso", en: "All-inclusive price" },
    body: {
      it: "RCA, IVA e assistenza stradale 24/7 sempre nel prezzo mostrato. Nessun costo a sorpresa al banco.",
      en: "Liability cover, VAT and 24/7 roadside assistance always in the shown price. No surprise costs at the desk.",
    },
  },
  {
    icon: Sparkles,
    title: { it: "Flotta sempre nuova", en: "Always-new fleet" },
    body: {
      it: "Vetture recenti, igienizzate e controllate prima di ogni consegna.",
      en: "Recent vehicles, sanitised and checked before every handover.",
    },
  },
  {
    icon: BadgeCheck,
    title: { it: "Cancellazione gratuita", en: "Free cancellation" },
    body: {
      it: "Cambi idea? Annulli senza costi fino a 48 ore prima del ritiro.",
      en: "Change of plan? Cancel free of charge up to 48 hours before pick-up.",
    },
  },
  {
    icon: MapPin,
    title: { it: "Ritiro in aeroporto", en: "Airport pick-up" },
    body: {
      it: "Cagliari Elmas, Olbia Costa Smeralda e Milano Linate: atterri e parti.",
      en: "Cagliari Elmas, Olbia Costa Smeralda and Milan Linate: land and go.",
    },
  },
];

const useCases: { it: string; en: string }[] = [
  { it: "Viaggio di lavoro a Cagliari, Olbia o Milano", en: "Business trip to Cagliari, Olbia or Milan" },
  { it: "Weekend o vacanza in Costa Smeralda", en: "Weekend or holiday in Costa Smeralda" },
  { it: "La tua auto è in officina e ti serve un sostituto", en: "Your car is in the shop and you need a replacement" },
  { it: "Sei atterrato in aeroporto senza auto", en: "You landed at the airport with no car" },
  { it: "Esigenza last-minute, anche per un solo giorno", en: "Last-minute need, even for a single day" },
  { it: "Turismo in Sardegna: spiagge, borghi, entroterra", en: "Touring Sardinia: beaches, villages, inland" },
  { it: "Auto aggiuntiva per la famiglia in visita", en: "An extra car for visiting family" },
  { it: "Trasferta con cambio automatico e dotazioni premium", en: "Business travel with automatic gearbox and premium features" },
];

const faqs: LandingFaqEntry[] = [
  {
    q: "Che documenti servono per ritirare l'auto?",
    a: "Carta d'identità o passaporto, patente in corso di validità da almeno 1 anno e una carta di credito intestata al conducente per la cauzione.",
    qEn: "What documents do I need to pick up the car?",
    aEn: "ID card or passport, a driving licence valid for at least 1 year, and a credit card in the driver's name for the deposit.",
  },
  {
    q: "Va bene il bancomat per la cauzione?",
    a: "No, serve una vera carta di credito (Visa o Mastercard) intestata al conducente: bancomat e prepagate non sono accettati per il blocco cauzionale.",
    qEn: "Can I use a debit card for the deposit?",
    aEn: "No, an actual credit card (Visa or Mastercard) in the driver's name is required: debit and prepaid cards are not accepted for the deposit hold.",
  },
  {
    q: "Posso noleggiare se ho meno di 25 anni?",
    a: "Sì, sulle categorie economy e compatte, con patente da almeno 1 anno. Tra 21 e 24 anni è previsto un supplemento giovane conducente, indicato prima della conferma.",
    qEn: "Can I rent if I'm under 25?",
    aEn: "Yes, on the economy and compact categories, with a licence held for at least 1 year. Drivers aged 21–24 pay a young-driver surcharge, shown before you confirm.",
  },
  {
    q: "Quanto è la franchigia in caso di danni?",
    a: "L'importo è indicato in fase di prenotazione, prima di confermare, e può essere ridotto con i pacchetti assicurativi opzionali.",
    qEn: "What's the excess in case of damage?",
    aEn: "The amount is shown at booking, before you confirm, and can be reduced with the optional insurance packages.",
  },
  {
    q: "Posso aggiungere un secondo conducente?",
    a: "Sì, su richiesta in fase di prenotazione o direttamente al ritiro, presentando i documenti del secondo conducente.",
    qEn: "Can I add a second driver?",
    aEn: "Yes, on request when booking or directly at pick-up, presenting the second driver's documents.",
  },
  {
    q: "Il chilometraggio è illimitato?",
    a: "Km illimitati sulle tariffe settimanali e mensili. Sulle tariffe giornaliere è previsto un pacchetto km, estendibile.",
    qEn: "Is mileage unlimited?",
    aEn: "Unlimited mileage on weekly and monthly rates. Daily rates include a mileage package, which can be extended.",
  },
  {
    q: "Le auto premium hanno il cambio automatico?",
    a: "Sì, la gamma Premium (BMW X4, Alfa Romeo Junior, Audi Q3) è a cambio automatico e dotazioni complete.",
    qEn: "Do premium cars have an automatic gearbox?",
    aEn: "Yes, the Premium range (BMW X4, Alfa Romeo Junior, Audi Q3) is automatic with full equipment.",
  },
  {
    q: "Posso ritirare in una sede e riconsegnare in un'altra?",
    a: "Sì, tra Cagliari, Olbia e Milano Linate, con un supplemento one-way da confermare in fase di prenotazione.",
    qEn: "Can I pick up at one branch and return at another?",
    aEn: "Yes, between Cagliari, Olbia and Milan Linate, with a one-way surcharge to confirm at booking.",
  },
];

function NoleggioAutoPage() {
  const { t, lang } = useI18n();
  const cars = vehicles.filter((v) => v.category === "economy" || v.category === "premium");
  const economy = categories.find((c) => c.id === "economy")!;
  const premium = categories.find((c) => c.id === "premium")!;

  return (
    <>
      <JsonLd data={buildBreadcrumbJsonLd([{ name: "Noleggio auto", path: "/noleggio-auto" }])} />
      <LandingHeader />

      <section className="bg-gradient-hero">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
          <p className="eyebrow text-ink/60">{t("Noleggio auto", "Car rental")}</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight text-ink sm:text-5xl">
            {t(
              "Noleggio auto a Cagliari, Olbia e Milano Linate — ritiro in aeroporto in pochi minuti.",
              "Car rental in Cagliari, Olbia and Milan Linate — airport pick-up in a few minutes.",
            )}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-ink/80">
            {t(
              "Auto economy e premium sempre nuove. RCA, IVA e assistenza stradale 24/7 incluse nel prezzo mostrato. Cancellazione gratuita fino a 48 ore prima del ritiro.",
              "Economy and premium cars, always new. Liability cover, VAT and 24/7 roadside assistance included in the shown price. Free cancellation up to 48 hours before pick-up.",
            )}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full px-7">
              <Link to="/prenota" search={{ class: "economy" }}>
                {t("Prenota ora", "Book now")}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full border-ink/20 px-7">
              <a href={whatsappHref} target="_blank" rel="noreferrer">
                WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-8 max-w-7xl px-4 sm:px-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground">
            <Car className="size-3.5" aria-hidden />
            {t("Auto economy e premium", "Economy and premium cars")}
          </span>
        </div>
        {PUBLIC_SITE_ONLY ? (
          <RentHubEmbed compact frameId="renthub-frame-noleggio-auto" />
        ) : (
          <SearchWidget variant="page" />
        )}
      </section>

      <TrustStrip />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <p className="eyebrow">{t("Prezzi trasparenti", "Transparent pricing")}</p>
        <h2 className="mt-2 max-w-2xl text-3xl font-black sm:text-4xl">
          {t("Il costo lo sai prima di prenotare.", "You know the cost before you book.")}
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <p className="eyebrow">{economy.label[lang]}</p>
            <p className="mt-2">
              <span className="font-display text-3xl text-primary">{t("Da", "From")} €{economy.fromPrice}</span>
              <span className="text-sm font-semibold text-muted-foreground"> /{t("giorno", "day")}</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{economy.description[lang]}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <p className="eyebrow">{premium.label[lang]}</p>
            <p className="mt-2">
              <span className="font-display text-3xl text-primary">{t("Da", "From")} €{premium.fromPrice}</span>
              <span className="text-sm font-semibold text-muted-foreground"> /{t("giorno", "day")}</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{premium.description[lang]}</p>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          {t(
            "Prezzi IVA inclusa. Km illimitati sulle tariffe settimanali e mensili. Franchigia e cauzione indicate prima della conferma.",
            "Prices include VAT. Unlimited mileage on weekly and monthly rates. Excess and deposit shown before you confirm.",
          )}
        </p>
      </section>

      <section className="bg-secondary/60 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="eyebrow">{t("Quando ti serve", "When you need it")}</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-black sm:text-4xl">
            {t("Un'auto pronta per ogni motivo.", "A car ready for every reason.")}
          </h2>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {useCases.map((u) => (
              <div key={u.it} className="flex items-start gap-2.5 rounded-xl bg-card p-4 shadow-card">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <p className="text-sm text-foreground/90">{t(u.it, u.en)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <p className="eyebrow">{t("La gamma auto", "The car range")}</p>
        <h2 className="mt-2 text-3xl font-black sm:text-4xl">
          {t("Dalla city car alla premium.", "From city car to premium.")}
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cars.map((v) => {
            const category = categories.find((c) => c.id === v.category)!;
            return (
              <article
                key={v.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-shadow hover:shadow-elev"
              >
                <div className="aspect-[16/10] bg-muted">
                  <img
                    src={v.image}
                    srcSet={v.imageSrcSet}
                    sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 90vw"
                    alt={`${v.model} — ${t("noleggio", "rental")} We Rent`}
                    width={1536}
                    height={1024}
                    loading="lazy"
                    className="size-full object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-primary">{category.label[lang]}</p>
                  <h3 className="mt-1 text-lg">{v.model}</h3>
                  <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <li>{v.seats} {t("posti", "seats")}</li>
                    <li>{v.gearbox === "automatico" ? t("Automatico", "Automatic") : t("Manuale", "Manual")}</li>
                    <li className="inline-flex items-center gap-1">
                      <Snowflake className="size-3.5" aria-hidden />
                      {t("Clima", "A/C")}
                    </li>
                  </ul>
                  <div className="mt-auto flex items-end justify-between gap-2 pt-5">
                    <p>
                      <span className="eyebrow block">{t("Da", "From")}</span>
                      <span className="font-display text-2xl text-primary">€{v.pricePerDay}</span>
                      <span className="text-xs font-semibold text-muted-foreground">/{t("giorno", "day")}</span>
                    </p>
                    <Button asChild size="sm" className="rounded-full">
                      <Link to="/prenota" search={{ class: v.category }}>
                        {t("Prenota", "Book")}
                      </Link>
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <p className="eyebrow">{t("Come funziona", "How it works")}</p>
        <h2 className="mt-2 max-w-2xl text-3xl font-black sm:text-4xl">
          {t("Dalla prenotazione alla riconsegna.", "From booking to return.")}
        </h2>
        <div className="mt-8">
          <LandingProcess />
        </div>
      </section>

      <section className="bg-secondary/60 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="eyebrow">{t("Perché We Rent", "Why We Rent")}</p>
          <h2 className="mt-2 text-3xl font-black sm:text-4xl">
            {t("Quattro promesse, sempre mantenute.", "Four promises, always kept.")}
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {usps.map((u) => (
              <article key={u.title.it} className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <u.icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-lg">{t(u.title.it, u.title.en)}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t(u.body.it, u.body.en)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <ReviewsCarousel />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <p className="eyebrow">{t("Prima di prenotare", "Before you book")}</p>
        <h2 className="mt-2 max-w-2xl text-3xl font-black sm:text-4xl">
          {t("Le domande più frequenti.", "Frequently asked questions.")}
        </h2>
        <div className="mt-8 max-w-3xl">
          <LandingFaq faqs={faqs} idPrefix="auto-faq" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="flex flex-col items-center gap-6 rounded-3xl bg-ink px-6 py-12 text-center text-ink-foreground sm:px-12">
          <ShieldCheck className="size-10 text-primary-soft" aria-hidden />
          <h2 className="max-w-xl text-3xl font-black sm:text-4xl">
            {t("La tua auto ti aspetta in aeroporto.", "Your car is waiting for you at the airport.")}
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="rounded-full px-7">
              <Link to="/prenota" search={{ class: "economy" }}>
                {t("Prenota ora", "Book now")}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full border-ink-foreground/25 bg-transparent px-7 text-ink-foreground hover:bg-ink-foreground/10 hover:text-ink-foreground">
              <a href={company.phoneHref}>{company.phone}</a>
            </Button>
          </div>
          <p className="flex items-center gap-2 text-xs text-ink-foreground/60">
            <Clock className="size-3.5" aria-hidden />
            {t("Assistenza clienti attiva 24/7, anche di notte e nei festivi.", "Customer support active 24/7, day and night, holidays included.")}
          </p>
        </div>
      </section>

      <LandingFooter />
    </>
  );
}
