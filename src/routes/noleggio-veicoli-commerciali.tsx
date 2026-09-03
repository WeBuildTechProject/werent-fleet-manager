import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  Check,
  Clock,
  IdCard,
  MapPin,
  Ruler,
  ShieldCheck,
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

export const Route = createFileRoute("/noleggio-veicoli-commerciali")({
  head: () => ({
    meta: [
      { title: "Noleggio veicoli commerciali a Cagliari, Olbia e Milano | We Rent" },
      {
        name: "description",
        content:
          "Noleggia un furgone commerciale fino a 15 m³ a Cagliari, Olbia e Milano Linate: cantieri, logistica, traslochi. Patente B, tariffe anche a lungo termine.",
      },
      { name: "robots", content: "noindex, follow" },
      { property: "og:title", content: "Noleggio veicoli commerciali a Cagliari, Olbia e Milano | We Rent" },
      {
        property: "og:description",
        content: "Furgoni cargo per aziende e cantieri. Prenota online, ritira in aeroporto.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absoluteUrl("/noleggio-veicoli-commerciali") },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/noleggio-veicoli-commerciali") }],
  }),
  component: NoleggioVeicoliCommercialiPage,
});

/** Specifiche pertinenti al segmento cargo (dati flotta reale We Rent). */
const cargoSpecs: Record<string, { volume: string; payload: string; wheelbase: { it: string; en: string }; licence: string }> = {
  ducato: {
    volume: "12 m³",
    payload: "1.400 kg",
    wheelbase: { it: "Passo medio", en: "Medium wheelbase" },
    licence: "B",
  },
  transit: {
    volume: "15 m³",
    payload: "1.500 kg",
    wheelbase: { it: "Passo lungo", en: "Long wheelbase" },
    licence: "B",
  },
};

const usps = [
  {
    icon: Boxes,
    title: { it: "Fino a 15 m³ di carico", en: "Up to 15 m³ of load" },
    body: {
      it: "Furgoni cargo pronti per logistica, traslochi e forniture di cantiere.",
      en: "Cargo vans ready for logistics, moving and construction supplies.",
    },
  },
  {
    icon: IdCard,
    title: { it: "Si guidano con la patente B", en: "Drive them with a B licence" },
    body: {
      it: "Nessuna abilitazione speciale: massa entro 3,5 t su tutta la gamma.",
      en: "No special licence needed: all models stay within 3.5 t.",
    },
  },
  {
    icon: Clock,
    title: { it: "Anche lungo periodo", en: "Long-term too" },
    body: {
      it: "Formule mensili per cantieri e commesse continuative, con sostituzione garantita.",
      en: "Monthly formulas for sites and ongoing contracts, with replacement guaranteed.",
    },
  },
  {
    icon: ShieldCheck,
    title: { it: "Assistenza 24/7", en: "24/7 assistance" },
    body: {
      it: "RCA, IVA e assistenza stradale sempre incluse nella tariffa mostrata.",
      en: "Liability cover, VAT and roadside assistance always included.",
    },
  },
];

const useCases: { it: string; en: string }[] = [
  { it: "Cantiere edile: trasporto materiali e attrezzatura", en: "Building site: transporting materials and equipment" },
  { it: "Trasloco privato o aziendale", en: "Private or business moving" },
  { it: "Consegne e logistica dell'ultimo miglio", en: "Deliveries and last-mile logistics" },
  { it: "Fornitura di materiali a più punti vendita", en: "Supplying materials to several stores" },
  { it: "Mezzo aziendale in officina: serve un sostituto", en: "Company vehicle in the shop: you need a replacement" },
  { it: "Allestimento di eventi e fiere", en: "Setting up events and trade fairs" },
  { it: "Noleggio a lungo termine per PMI e artigiani", en: "Long-term rental for SMEs and tradespeople" },
  { it: "Trasporto attrezzature sportive o professionali", en: "Transporting sports or professional equipment" },
];

const faqs: LandingFaqEntry[] = [
  {
    q: "Che patente serve per guidare i furgoni?",
    a: "La normale patente B: tutta la gamma resta entro i 3,5 t, nessuna abilitazione professionale richiesta.",
    qEn: "What licence do I need to drive the vans?",
    aEn: "A standard category B licence: the whole range stays within 3.5 t, no professional qualification required.",
  },
  {
    q: "Qual è la portata massima?",
    a: "Fino a 1.500 kg sul Ford Transit 15 m³; il Fiat Ducato 12 m³ porta fino a 1.400 kg. La scheda di ogni veicolo indica volume e portata esatti.",
    qEn: "What's the maximum payload?",
    aEn: "Up to 1,500 kg on the Ford Transit 15 m³; the Fiat Ducato 12 m³ carries up to 1,400 kg. Each vehicle's card shows the exact volume and payload.",
  },
  {
    q: "È disponibile il noleggio a lungo termine?",
    a: "Sì, formule mensili per cantieri e commesse continuative, con sostituzione del mezzo garantita in caso di fermo tecnico. Contattaci per una convenzione dedicata.",
    qEn: "Is long-term rental available?",
    aEn: "Yes, monthly formulas for sites and ongoing contracts, with vehicle replacement guaranteed in case of downtime. Contact us for a dedicated agreement.",
  },
  {
    q: "Potete fatturare all'azienda con P.IVA?",
    a: "Sì, la fattura viene emessa direttamente all'azienda o al libero professionista in fase di prenotazione.",
    qEn: "Can you invoice the company with a VAT number?",
    aEn: "Yes, the invoice is issued directly to the company or freelancer at booking.",
  },
  {
    q: "L'assicurazione copre anche la merce trasportata?",
    a: "La copertura RCA riguarda il veicolo; per merce di valore consigliamo una polizza trasporti dedicata, che possiamo indicarvi su richiesta.",
    qEn: "Does the insurance also cover the goods being transported?",
    aEn: "Liability cover applies to the vehicle; for valuable goods we recommend a dedicated cargo insurance policy, which we can point you to on request.",
  },
  {
    q: "Il chilometraggio è illimitato?",
    a: "Km illimitati sulle tariffe settimanali e mensili. Sulle tariffe giornaliere è previsto un pacchetto km, estendibile.",
    qEn: "Is mileage unlimited?",
    aEn: "Unlimited mileage on weekly and monthly rates. Daily rates include a mileage package, which can be extended.",
  },
  {
    q: "Posso ritirare fuori dagli orari standard per esigenze di cantiere?",
    a: "Su richiesta, in fase di prenotazione, cerchiamo di venire incontro a orari di ritiro/riconsegna anticipati o posticipati.",
    qEn: "Can I pick up outside standard hours for site needs?",
    aEn: "On request, when booking, we try to accommodate earlier or later pick-up/return times.",
  },
  {
    q: "Cosa succede in caso di guasto durante il noleggio?",
    a: "Assistenza stradale attiva 24/7: in caso di fermo tecnico organizziamo la sostituzione del mezzo il prima possibile.",
    qEn: "What happens if there's a breakdown during the rental?",
    aEn: "24/7 roadside assistance: in case of downtime we arrange a replacement vehicle as soon as possible.",
  },
];

function NoleggioVeicoliCommercialiPage() {
  const { t, lang } = useI18n();
  const cargo = vehicles.filter((v) => v.category === "business");
  const businessCategory = categories.find((c) => c.id === "business")!;

  return (
    <>
      <JsonLd data={buildBreadcrumbJsonLd([{ name: "Veicoli commerciali", path: "/noleggio-veicoli-commerciali" }])} />
      <LandingHeader />

      <section className="bg-gradient-hero">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
          <p className="eyebrow text-ink/60">{t("Veicoli commerciali", "Commercial vehicles")}</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight text-ink sm:text-5xl">
            {t(
              "Noleggio furgoni commerciali a Cagliari, Olbia e Milano Linate — fino a 15 m³.",
              "Commercial van rental in Cagliari, Olbia and Milan Linate — up to 15 m³.",
            )}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-ink/80">
            {t(
              "Furgoni cargo per cantieri, logistica e traslochi. Si guidano con patente B, disponibili anche a lungo termine. RCA e IVA sempre incluse.",
              "Cargo vans for construction sites, logistics and moving. Drive them with a B licence, available long-term too. Liability cover and VAT always included.",
            )}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full px-7">
              <Link to="/prenota" search={{ class: "business" }}>
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
            <Boxes className="size-3.5" aria-hidden />
            {t("Furgoni cargo", "Cargo vans")}
          </span>
        </div>
        {PUBLIC_SITE_ONLY ? (
          <RentHubEmbed compact params={{ class: "business" }} frameId="renthub-frame-noleggio-commerciali" />
        ) : (
          <SearchWidget variant="page" fixedClass="business" />
        )}
      </section>

      <TrustStrip />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <p className="eyebrow">{t("Prezzi trasparenti", "Transparent pricing")}</p>
        <h2 className="mt-2 max-w-2xl text-3xl font-black sm:text-4xl">
          {t("Il costo lo sai prima di prenotare.", "You know the cost before you book.")}
        </h2>
        <div className="mt-8 max-w-sm rounded-2xl border border-border bg-card p-6 shadow-card">
          <p className="eyebrow">{businessCategory.label[lang]}</p>
          <p className="mt-2">
            <span className="font-display text-3xl text-primary">{t("Da", "From")} €{businessCategory.fromPrice}</span>
            <span className="text-sm font-semibold text-muted-foreground"> /{t("giorno", "day")}</span>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{businessCategory.description[lang]}</p>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          {t(
            "Prezzi IVA inclusa. Km illimitati sulle tariffe settimanali e mensili. Formule a lungo termine su richiesta.",
            "Prices include VAT. Unlimited mileage on weekly and monthly rates. Long-term formulas on request.",
          )}
        </p>
      </section>

      <section className="bg-secondary/60 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="eyebrow">{t("Quando ti serve", "When you need it")}</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-black sm:text-4xl">
            {t("Un furgone pronto per ogni lavoro.", "A van ready for every job.")}
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
        <p className="eyebrow">{t("La gamma cargo", "The cargo range")}</p>
        <h2 className="mt-2 text-3xl font-black sm:text-4xl">
          {t("Due misure, ogni esigenza di carico.", "Two sizes, every load need.")}
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {cargo.map((v) => {
            const spec = cargoSpecs[v.id];
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
                    alt={`${v.model} — ${t("furgone a noleggio", "rental van")}`}
                    width={1536}
                    height={1024}
                    loading="lazy"
                    className="size-full object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-lg">{v.model}</h3>
                  {spec ? (
                    <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <Boxes className="size-4" aria-hidden />
                        {t("Volume di carico", "Load volume")}: {spec.volume}
                      </li>
                      <li className="flex items-center gap-2">
                        <Ruler className="size-4" aria-hidden />
                        {spec.wheelbase[lang]} · {t("Portata", "Payload")} {spec.payload}
                      </li>
                      <li className="flex items-center gap-2">
                        <IdCard className="size-4" aria-hidden />
                        {t("Patente richiesta", "Licence required")}: {spec.licence}
                      </li>
                    </ul>
                  ) : null}
                  <div className="mt-auto flex items-end justify-between gap-2 pt-5">
                    <p>
                      <span className="eyebrow block">{t("Da", "From")}</span>
                      <span className="font-display text-2xl text-primary">€{v.pricePerDay}</span>
                      <span className="text-xs font-semibold text-muted-foreground">/{t("giorno", "day")}</span>
                    </p>
                    <Button asChild size="sm" className="rounded-full">
                      <Link to="/prenota" search={{ class: "business" }}>
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
          <p className="eyebrow">{t("Perché noi", "Why us")}</p>
          <h2 className="mt-2 text-3xl font-black sm:text-4xl">
            {t("Pensati per chi lavora.", "Built for people at work.")}
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
          <p className="mt-8 flex items-start gap-2 text-sm text-muted-foreground">
            <BadgeCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            {t(
              `Gli stessi furgoni supportano la logistica dei cantieri del gruppo ${company.group}: mezzi mantenuti con standard di uso professionale quotidiano.`,
              `The same vans support the construction logistics of the ${company.group} group: vehicles maintained to daily professional standards.`,
            )}
          </p>
        </div>
      </section>

      <ReviewsCarousel />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <p className="eyebrow">{t("Prima di prenotare", "Before you book")}</p>
        <h2 className="mt-2 max-w-2xl text-3xl font-black sm:text-4xl">
          {t("Le domande più frequenti.", "Frequently asked questions.")}
        </h2>
        <div className="mt-8 max-w-3xl">
          <LandingFaq faqs={faqs} idPrefix="commerciali-faq" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="flex flex-col items-center gap-6 rounded-3xl bg-ink px-6 py-12 text-center text-ink-foreground sm:px-12">
          <MapPin className="size-10 text-primary-soft" aria-hidden />
          <h2 className="max-w-xl text-3xl font-black sm:text-4xl">
            {t("Il tuo cantiere si muove con noi.", "Your worksite moves with us.")}
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="rounded-full px-7">
              <Link to="/prenota" search={{ class: "business" }}>
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
