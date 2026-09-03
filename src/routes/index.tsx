import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, MapPin, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { useEffect, useRef, useState } from "react";


import { BookingClassTabs, RentHubEmbed } from "@/components/booking/renthub-embed";
import { JsonLd } from "@/components/json-ld";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PromoBands } from "@/components/promo-bands";
import { ReviewsCarousel } from "@/components/reviews-carousel";
import { SearchWidget } from "@/components/search-widget";
import { TrustStrip } from "@/components/trust-strip";
import { Button } from "@/components/ui/button";
import { branches, company } from "@/lib/company";
import { heroImage, heroImageSrcSet } from "@/lib/fleet";
import { useI18n } from "@/lib/i18n";
import { PUBLIC_SITE_ONLY } from "@/lib/site-mode";
import { absoluteUrl, buildFaqJsonLd, type FaqEntry } from "@/lib/seo";

// Fascia di sfondo verde visibile tra il widget "released" e la sezione
// sottostante: usata sia come soglia di sgancio sia come offset "bottom"
// fisso del widget una volta sganciato (vedi HomePage per i dettagli).
const RELEASE_GAP = 220;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "We Rent | Noleggio Auto a Cagliari, Olbia e Milano Linate" },
      {
        name: "description",
        content:
          "Noleggia auto, van e veicoli commerciali a Cagliari, Olbia e Milano Linate. Km inclusi, RCA e IVA nel prezzo, assistenza 24/7.",
      },
      { property: "og:title", content: "We Rent | Noleggio Auto a Cagliari, Olbia e Milano Linate" },
      {
        property: "og:description",
        content: "Il noleggio che fa per te: prenota online in due minuti e ritira in aeroporto.",
      },
      { property: "og:url", content: absoluteUrl("/") },
    ],
    links: [
      { rel: "canonical", href: absoluteUrl("/") },
      { rel: "preload", as: "image", href: heroImage, imageSrcSet: heroImageSrcSet, imageSizes: "(min-width: 1024px) 616px, 100vw", fetchPriority: "high" },
    ],
  }),
  component: HomePage,
});


const homeFaqs: (FaqEntry & { en: string })[] = [
  {
    q: "Che documenti servono per il ritiro dell'auto?",
    a: "Carta d'identità o passaporto, patente di guida in corso di validità da almeno 1 anno e una carta di credito intestata al conducente per la pre-autorizzazione della cauzione.",
    en: "ID card or passport, a driving licence valid for at least 1 year, and a credit card in the driver's name for the deposit pre-authorisation.",
  },
  {
    q: "Va bene il bancomat al posto della carta di credito?",
    a: "Per la cauzione serve una vera carta di credito (Visa o Mastercard) intestata al conducente: bancomat, carte prepagate o revolut non sono accettate per il blocco cauzionale.",
    en: "The deposit requires an actual credit card (Visa or Mastercard) in the driver's name: debit or prepaid cards are not accepted for the deposit hold.",
  },
  {
    q: "Quanto è la franchigia in caso di danni?",
    a: "L'importo è indicato chiaramente in fase di prenotazione, prima di confermare, e può essere ridotto o azzerato con i pacchetti assicurativi opzionali. RCA e furto/incendio sono sempre incluse nel prezzo mostrato.",
    en: "The amount is shown clearly at booking, before you confirm, and can be reduced or removed with the optional insurance packages. Third-party liability and theft/fire cover are always included in the displayed price.",
  },
  {
    q: "Posso noleggiare se ho meno di 25 anni?",
    a: "Sì, sulle categorie economy e compatte, con patente da almeno 1 anno. Per i conducenti tra 21 e 24 anni è previsto un supplemento giovane conducente, indicato prima della conferma.",
    en: "Yes, on the economy and compact categories, with a licence held for at least 1 year. Drivers aged 21 to 24 pay a young-driver surcharge, shown before you confirm.",
  },
  {
    q: "Posso aggiungere un secondo conducente?",
    a: "Sì, su richiesta in fase di prenotazione o direttamente al ritiro, presentando i documenti del secondo conducente.",
    en: "Yes, on request when booking or directly at pick-up, presenting the second driver's documents.",
  },
  {
    q: "Il chilometraggio è illimitato?",
    a: "Sì, km illimitati sulle tariffe settimanali e mensili. Sulle tariffe giornaliere è previsto un pacchetto km con possibilità di estensione, sempre indicato prima della prenotazione.",
    en: "Yes, unlimited mileage on weekly and monthly rates. Daily rates include a mileage package that can be extended, always shown before booking.",
  },
  {
    q: "Posso imbarcare l'auto sul traghetto e uscire dalla Sardegna?",
    a: "L'uscita dall'isola va comunicata e autorizzata in anticipo: ha condizioni assicurative dedicate ed eventuale supplemento. Contattaci prima di prenotare per organizzarla insieme.",
    en: "Taking the car off the island must be requested and approved in advance: it has dedicated insurance terms and a possible surcharge. Contact us before booking so we can arrange it together.",
  },
  {
    q: "Posso ritirare in una sede e riconsegnare in un'altra?",
    a: "Sì, tra Cagliari, Olbia e Milano Linate, con un supplemento one-way da verificare in fase di prenotazione in base a sede e periodo.",
    en: "Yes, between Cagliari, Olbia and Milan Linate, with a one-way surcharge to be confirmed at booking depending on branch and period.",
  },
];

function HomePage() {
  const { t, lang } = useI18n();

  // Il widget di prenotazione resta agganciato sotto la topbar mentre si
  // scorre l'hero, ma deve staccarsi "in anticipo" (non appena tocca la
  // sezione sottostante) lasciando visibile una fascia di sfondo verde.
  // La sticky position nativa non può farlo: per definizione dello spec si
  // sgancia esattamente a contatto col bordo del proprio contenitore (gap
  // zero), quindi qui il posizionamento è gestito interamente via JS con
  // fixed/absolute invece che con la classe "sticky":
  // - "flow": posizione normale, prima di raggiungere il punto di aggancio
  //   (o sempre, sotto i 768px, dove il widget non è mai agganciato);
  // - "pinned": position fixed, incollato sotto la topbar, mentre l'hero
  //   scorre sotto/dietro di lui;
  // - "released": non appena manca meno di GAP px al bordo inferiore del
  //   contenitore hero, passa a position absolute con bottom: RELEASE_GAP
  //   (ancorato al bordo inferiore del contenitore hero stesso, non a una
  //   coordinata "top" congelata nel documento): così il gap resta esatto
  //   anche se l'altezza del widget cresce in modo asincrono dopo lo
  //   sgancio (es. resize del frame RentHub), senza bisogno di ricalcoli.
  const heroWrapRef = useRef<HTMLDivElement | null>(null);
  const rulerRef = useRef<HTMLDivElement | null>(null);
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const [widgetHeight, setWidgetHeight] = useState(0);
  const [widgetMode, setWidgetMode] = useState<"flow" | "pinned" | "released">("flow");
  const [pinBox, setPinBox] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const el = widgetRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height;
      if (h) setWidgetHeight(h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const wrap = heroWrapRef.current;
    const ruler = rulerRef.current;
    if (!wrap || !ruler) return;

    const PIN_TOP = 64; // corrisponde a top-16 (topbar sticky)
    const GAP = RELEASE_GAP;
    const isDesktop = () => window.matchMedia("(min-width: 768px)").matches;

    let ticking = false;

    const check = () => {
      ticking = false;

      if (!isDesktop()) {
        setWidgetMode("flow");
        return;
      }

      const wrapRect = wrap.getBoundingClientRect();
      const widgetH = widgetRef.current?.offsetHeight ?? 0;
      const distanceToBottom = wrapRect.bottom - PIN_TOP - widgetH;

      if (wrapRect.top > PIN_TOP) {
        // Non ancora arrivati al punto di aggancio: flusso normale.
        setWidgetMode("flow");
        return;
      }

      if (distanceToBottom > GAP) {
        // Agganciato: misura la fascia centrata (mx-auto max-w-7xl) tramite
        // il "righello" invisibile, per riprodurla nel fixed.
        const rulerRect = ruler.getBoundingClientRect();
        setPinBox({ left: rulerRect.left, width: rulerRect.width });
        setWidgetMode("pinned");
        return;
      }

      // Sganciato in anticipo: da qui in poi il widget resta ancorato al
      // bordo inferiore del contenitore hero (position absolute + bottom
      // fisso), non a una posizione "top" congelata nel documento. Così il
      // gap resta sempre corretto anche se l'altezza del widget continua a
      // crescere in modo asincrono dopo lo sgancio (es. resize del frame
      // RentHub), senza bisogno di ricalcoli via JS.
      setWidgetMode("released");
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(check);
    };

    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const promises = [
    {
      icon: Wallet,
      title: t("Prezzo trasparente", "Transparent pricing"),
      body: t("RCA, IVA e assistenza sempre incluse nella tariffa mostrata.", "Insurance, VAT and support always included in the displayed rate."),
    },
    {
      icon: Sparkles,
      title: t("Nuova flotta", "New fleet"),
      body: t("Veicoli nuovi, igienizzati e controllati prima di ogni consegna.", "New vehicles, sanitised and checked before every handover."),
    },
    {
      icon: ShieldCheck,
      title: t("Cancellazione flessibile", "Flexible cancellation"),
      body: t("Modifica o annulla gratuitamente fino a 48 ore dal ritiro.", "Change or cancel free of charge up to 48 hours before pick-up."),
    },
    {
      icon: MapPin,
      title: t("Presenza locale", "Local presence"),
      body: t("Un team che conosce il territorio e risponde in tempo reale.", "A team that knows the territory and replies in real time."),
    },
  ];


  return (
    <>
      {/* Contenitore relativo: riferimento per il fixed/absolute del widget.
          paddingBottom: garantisce SEMPRE (indipendentemente da come/quando
          si sgancia il widget) una fascia di sfondo verde di RELEASE_GAP px
          tra la foto dell'hero e la sezione successiva (TrustStrip) — prima
          il gap dipendeva solo dal posizionamento del widget, che non aveva
          alcun effetto sull'altezza reale di questo contenitore (il widget è
          fixed/absolute quindi "fuori flusso": non spinge giù nulla). */}
      <div
        ref={heroWrapRef}
        className="relative bg-gradient-hero"
        style={{ paddingBottom: RELEASE_GAP }}
      >
        {/* Righello invisibile: misura la fascia centrata (mx-auto max-w-7xl)
            indipendentemente dallo stato corrente del widget. */}
        <div
          ref={rulerRef}
          aria-hidden="true"
          className="pointer-events-none invisible absolute inset-x-0 top-0 mx-auto h-0 max-w-7xl px-4 sm:px-6"
        />

        {/* Segnaposto: riserva lo spazio nel flusso quando il widget passa a
            fixed/absolute, così il contenuto sottostante non "salta". */}
        {widgetMode !== "flow" && <div aria-hidden="true" style={{ height: widgetHeight }} />}

        <div
          ref={widgetRef}
          className="mx-auto max-w-7xl px-4 pt-6 sm:px-6"
          style={
            widgetMode === "pinned"
              ? { position: "fixed", top: 64, left: pinBox.left, width: pinBox.width, zIndex: 30 }
              : widgetMode === "released"
                ? { position: "absolute", bottom: RELEASE_GAP, left: 0, right: 0, zIndex: 30 }
                : undefined
          }
        >
          {PUBLIC_SITE_ONLY ? (
            <>
              <BookingClassTabs />
              <RentHubEmbed compact frameId="renthub-frame-home" />
            </>
          ) : (
            <SearchWidget variant="hero" />
          )}
        </div>


        <section className="relative overflow-hidden">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-14 lg:py-20">
            <div className="relative z-10 min-w-0 max-w-xl">
              {/* Wordmark di brand: resta visivamente identico, ma non è più il
                  tag <h1> della pagina (era privo di riferimenti a servizio/città). */}
              <p className="text-4xl leading-tight text-ink [overflow-wrap:anywhere] sm:text-5xl lg:text-[3.25rem] xl:text-6xl" aria-hidden="true">
                <span className="font-black">EVERY</span>
                <span className="font-black text-primary">WHERE</span>
                <span className="font-black">NT</span>
              </p>
              <h1 className="mt-5 max-w-xl text-lg font-normal text-ink/80">
                {t(
                  "Noleggio auto, van e veicoli commerciali pronti al ritiro a Cagliari, Olbia e Milano Linate. Tariffe chiare, km inclusi, assistenza 24/7.",
                  "Car, van and commercial vehicle rental ready for pick-up in Cagliari, Olbia and Milano Linate. Clear rates, mileage included, 24/7 support.",
                )}
              </h1>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="rounded-full px-7">
                  <Link to="/prenota">{t("Prenota ora", "Book now")}</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full border-ink/20 px-7">
                  <Link to="/flotta">{t("Scopri la flotta", "Explore the fleet")}</Link>
                </Button>
              </div>
            </div>
            <div className="relative z-0 min-w-0 overflow-hidden rounded-3xl shadow-elev">
              <img
                src={heroImage}
                srcSet={heroImageSrcSet}
                sizes="(min-width: 1024px) 616px, 100vw"
                alt={t("Auto a noleggio We Rent pronta al ritiro", "We Rent rental car ready for pick-up")}
                width={1920}
                height={1200}
                fetchPriority="high"
                loading="eager"
                className="animate-ken-burns w-full object-cover"
              />
            </div>
          </div>
        </section>
      </div>



      <TrustStrip />


      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <p className="eyebrow">{t("Perché We Rent", "Why We Rent")}</p>
        <h2 className="mt-2 max-w-2xl text-3xl font-black sm:text-4xl">
          {t("Quattro promesse, sempre mantenute.", "Four promises, always kept.")}
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {promises.map((p) => (
            <article key={p.title} className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <p.icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 text-lg">{p.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
            </article>
          ))}
        </div>
      </section>

      <PromoBands />

      <section className="bg-ink py-16 text-ink-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="eyebrow text-primary-soft">{t("Dove trovarci", "Where to find us")}</p>
          <h2 className="mt-2 text-3xl font-black sm:text-4xl">{t("Tre sedi, un solo standard.", "Three branches, one standard.")}</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {branches.map((b) => (
              <article key={b.id} className="rounded-2xl border border-ink-foreground/10 bg-ink-foreground/5 p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-primary-soft">{b.area[lang]}</p>
                <h3 className="mt-2 text-xl">{b.name}</h3>
                <p className="mt-3 text-sm text-ink-foreground/70">{b.address}</p>
                <p className="mt-1 text-sm text-ink-foreground/60">{b.hours[lang]}</p>
                <Link
                  to="/prenota"
                  search={{ from: b.code }}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary-soft hover:underline"
                >
                  {t("Prenota da qui", "Book from here")}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <ReviewsCarousel />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <p className="eyebrow">{t("Prima di prenotare", "Before you book")}</p>
        <h2 className="mt-2 max-w-2xl text-3xl font-black sm:text-4xl">
          {t("Le domande che ci fate più spesso.", "The questions we get asked most.")}
        </h2>
        <div className="mt-8 max-w-3xl rounded-2xl border border-border bg-card px-6 shadow-card sm:px-8">
          <Accordion type="single" collapsible>
            {homeFaqs.map((faq, i) => (
              <AccordionItem key={faq.q} value={`faq-${i}`}>
                <AccordionTrigger className="text-base">{t(faq.q, faq.en)}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{t(faq.a, faq.en)}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
        <JsonLd data={buildFaqJsonLd(homeFaqs.map((f) => ({ q: f.q, a: f.a })))} />
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="grid gap-6 rounded-3xl border border-border bg-card p-8 shadow-card lg:grid-cols-[1.4fr_1fr] lg:items-center lg:p-12">
          <div>
            <p className="eyebrow">Business</p>
            <h2 className="mt-2 text-3xl font-black sm:text-4xl">
              {t("Noleggio per aziende e professionisti", "Rental for companies and professionals")}
            </h2>
            <p className="mt-4 max-w-xl text-muted-foreground">
              {t(
                "Tariffe dedicate, contratto quadro, referente unico e flotta su misura per trasferte, cantieri ed eventi.",
                "Dedicated rates, master agreement, single point of contact and a tailored fleet for travel, sites and events.",
              )}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <Button asChild size="lg" className="rounded-full px-7">
              <Link to="/business">{t("Richiedi convenzione", "Request an agreement")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-7">
              <a href={company.phoneHref}>{company.phone}</a>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
