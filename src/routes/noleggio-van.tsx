import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Check,
  Clock,
  MapPin,
  ShieldCheck,
  Truck,
  Users,
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

export const Route = createFileRoute("/noleggio-van")({
  head: () => ({
    meta: [
      { title: "Noleggio van fino a 9 posti a Cagliari, Olbia e Milano | We Rent" },
      {
        name: "description",
        content:
          "Noleggia un van fino a 9 posti a Cagliari, Olbia e Milano Linate: ideale per gruppi, famiglie numerose e transfer aeroportuali. Patente B, RCA e IVA incluse.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Noleggio van fino a 9 posti a Cagliari, Olbia e Milano | We Rent" },
      {
        property: "og:description",
        content: "Van passeggeri per gruppi e famiglie numerose. Prenota online, ritira in aeroporto.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absoluteUrl("/noleggio-van") },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/noleggio-van") }],
  }),
  component: NoleggioVanPage,
});

const usps = [
  {
    icon: Users,
    title: { it: "Fino a 9 posti", en: "Up to 9 seats" },
    body: {
      it: "Un solo veicolo per tutto il gruppo, senza dividervi in più auto.",
      en: "One single vehicle for the whole group, no need to split into several cars." ,
    },
  },
  {
    icon: BadgeCheck,
    title: { it: "Si guida con patente B", en: "Drive it with a B licence" },
    body: {
      it: "Nessuna abilitazione speciale richiesta: si guida come un'auto normale.",
      en: "No special licence needed: it drives just like a regular car.",
    },
  },
  {
    icon: Briefcase,
    title: { it: "Bagagliaio capiente", en: "Spacious boot" },
    body: {
      it: "Spazio per valigie, passeggini e attrezzatura sportiva di tutto il gruppo.",
      en: "Room for suitcases, strollers and sports gear for the whole group.",
    },
  },
  {
    icon: MapPin,
    title: { it: "Ritiro in aeroporto", en: "Airport pick-up" },
    body: {
      it: "Cagliari Elmas, Olbia Costa Smeralda e Milano Linate: atterrate e partite tutti insieme.",
      en: "Cagliari Elmas, Olbia Costa Smeralda and Milan Linate: land and go, all together.",
    },
  },
];

const useCases: { it: string; en: string }[] = [
  { it: "Gruppo di amici in vacanza in Sardegna", en: "A group of friends on holiday in Sardinia" },
  { it: "Famiglia numerosa con bagagli e passeggini", en: "A large family with luggage and strollers" },
  { it: "Transfer aeroportuale per più persone insieme", en: "Airport transfer for several people together" },
  { it: "Matrimoni, cerimonie ed eventi", en: "Weddings, ceremonies and events" },
  { it: "Team aziendale in trasferta", en: "A company team travelling for work" },
  { it: "Tour organizzati e guide turistiche", en: "Organised tours and tour guides" },
  { it: "Gite scolastiche o sportive", en: "School or sports outings" },
  { it: "Escursioni di gruppo tra spiagge e borghi", en: "Group excursions between beaches and villages" },
];

const faqs: LandingFaqEntry[] = [
  {
    q: "Che patente serve per guidare un van da 9 posti?",
    a: "La normale patente B: nessuna abilitazione speciale, purché la massa del veicolo resti entro i 3,5 t (come i nostri van).",
    qEn: "What licence do I need to drive a 9-seater van?",
    aEn: "A standard category B licence: no special qualification needed, as long as the vehicle stays within 3.5 t (like ours).",
  },
  {
    q: "Quanti bagagli entrano oltre ai 9 passeggeri?",
    a: "Con tutti i posti occupati resta comunque spazio per bagagli medi; per gruppi con molti bagagli consigliamo di segnalarlo in fase di prenotazione così da consigliarvi la configurazione migliore.",
    qEn: "How much luggage fits with all 9 seats occupied?",
    aEn: "With every seat taken there's still room for medium-sized luggage; for groups with a lot of baggage, let us know when booking so we can suggest the best setup.",
  },
  {
    q: "Il van si guida come un'auto normale?",
    a: "Sì, cambio manuale e ingombri gestibili: non serve esperienza specifica su veicoli commerciali.",
    qEn: "Does the van drive like a regular car?",
    aEn: "Yes, manual gearbox and manageable size: no specific experience with commercial vehicles is needed.",
  },
  {
    q: "Che documenti servono al ritiro?",
    a: "Carta d'identità o passaporto, patente valida da almeno 1 anno e una carta di credito intestata al conducente per la cauzione.",
    qEn: "What documents do I need at pick-up?",
    aEn: "ID card or passport, a licence held for at least 1 year, and a credit card in the driver's name for the deposit.",
  },
  {
    q: "Quanto è la franchigia in caso di danni?",
    a: "L'importo è indicato in fase di prenotazione, prima di confermare, e può essere ridotto con i pacchetti assicurativi opzionali.",
    qEn: "What's the excess in case of damage?",
    aEn: "The amount is shown at booking, before you confirm, and can be reduced with the optional insurance packages.",
  },
  {
    q: "Il chilometraggio è illimitato?",
    a: "Km illimitati sulle tariffe settimanali e mensili. Sulle tariffe giornaliere è previsto un pacchetto km, estendibile.",
    qEn: "Is mileage unlimited?",
    aEn: "Unlimited mileage on weekly and monthly rates. Daily rates include a mileage package, which can be extended.",
  },
  {
    q: "Posso noleggiare il van per un solo giorno?",
    a: "Sì, la tariffa giornaliera è disponibile per qualsiasi periodo, da un giorno in su.",
    qEn: "Can I rent the van for just one day?",
    aEn: "Yes, the daily rate is available for any period, from one day upward.",
  },
  {
    q: "Posso ritirare in una sede e riconsegnare in un'altra?",
    a: "Sì, tra Cagliari, Olbia e Milano Linate, con un supplemento one-way da confermare in fase di prenotazione.",
    qEn: "Can I pick up at one branch and return at another?",
    aEn: "Yes, between Cagliari, Olbia and Milan Linate, with a one-way surcharge to confirm at booking.",
  },
];

function NoleggioVanPage() {
  const { t, lang } = useI18n();
  const van = vehicles.filter((v) => v.category === "van");
  const vanCategory = categories.find((c) => c.id === "van")!;

  return (
    <>
      <JsonLd data={buildBreadcrumbJsonLd([{ name: "Noleggio van", path: "/noleggio-van" }])} />
      <LandingHeader />

      <section className="bg-gradient-hero">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:py-20">
          <p className="eyebrow text-ink/60">{t("Noleggio van", "Van rental")}</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight text-ink sm:text-5xl">
            {t(
              "Noleggio van fino a 9 posti a Cagliari, Olbia e Milano Linate.",
              "Van rental up to 9 seats in Cagliari, Olbia and Milan Linate.",
            )}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-ink/80">
            {t(
              "Van passeggeri per gruppi, famiglie numerose e transfer aeroportuali. Bagagliaio capiente, aria condizionata, si guida con patente B. RCA e IVA sempre incluse.",
              "Passenger vans for groups, large families and airport transfers. Spacious boot, air conditioning, drive it with a B licence. Liability cover and VAT always included.",
            )}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full px-7">
              <Link to="/prenota" search={{ class: "van" }}>
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
            <Users className="size-3.5" aria-hidden />
            {t("Van fino a 9 posti", "Vans up to 9 seats")}
          </span>
        </div>
        {PUBLIC_SITE_ONLY ? (
          <RentHubEmbed compact params={{ class: "van" }} frameId="renthub-frame-noleggio-van" />
        ) : (
          <SearchWidget variant="page" fixedClass="van" />
        )}
      </section>

      <TrustStrip />

      <section className="bg-secondary/60 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="eyebrow">{t("Quando ti serve", "When you need it")}</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-black sm:text-4xl">
            {t("Un van pronto per ogni gruppo.", "A van ready for every group.")}
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
        <p className="eyebrow">{t("Il van", "The van")}</p>
        <h2 className="mt-2 text-3xl font-black sm:text-4xl">
          {t("Spazio per tutto il gruppo.", "Room for the whole group.")}
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {van.map((v) => (
            <article
              key={v.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-shadow hover:shadow-elev sm:col-span-2 sm:flex-row"
            >
              <div className="aspect-[16/10] bg-muted sm:w-72 sm:shrink-0">
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
              <div className="flex flex-1 flex-col p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-primary">{vanCategory.label[lang]}</p>
                <h3 className="mt-1 text-xl">{v.model}</h3>
                <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                  <li className="inline-flex items-center gap-1.5">
                    <Users className="size-4" aria-hidden />
                    {v.seats} {t("posti", "seats")}
                  </li>
                  <li className="inline-flex items-center gap-1.5">
                    <Briefcase className="size-4" aria-hidden />
                    {v.luggage} {t("bagagli grandi", "large bags")}
                  </li>
                  <li>{t("Diesel", "Diesel")}</li>
                  <li>{t("Clima", "A/C")}</li>
                </ul>
                <div className="mt-auto flex justify-end gap-2 pt-6">
                  <Button asChild size="sm" className="rounded-full">
                    <Link to="/prenota" search={{ class: "van" }}>
                      {t("Prenota", "Book")}
                    </Link>
                  </Button>
                </div>
              </div>
            </article>
          ))}
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
            {t("Pensato per viaggiare insieme.", "Built for travelling together.")}
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
          <LandingFaq faqs={faqs} idPrefix="van-faq" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="flex flex-col items-center gap-6 rounded-3xl bg-ink px-6 py-12 text-center text-ink-foreground sm:px-12">
          <Truck className="size-10 text-primary-soft" aria-hidden />
          <h2 className="max-w-xl text-3xl font-black sm:text-4xl">
            {t("Tutto il gruppo, un solo van.", "The whole group, one single van.")}
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="rounded-full px-7">
              <Link to="/prenota" search={{ class: "van" }}>
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
