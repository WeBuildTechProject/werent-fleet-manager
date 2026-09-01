import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, MapPin, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { useEffect, useRef, useState } from "react";


import { PromoBands } from "@/components/promo-bands";
import { ReviewsCarousel } from "@/components/reviews-carousel";
import { SearchWidget } from "@/components/search-widget";
import { TrustStrip } from "@/components/trust-strip";
import { Button } from "@/components/ui/button";
import { branches, company } from "@/lib/company";
import { heroImage } from "@/lib/fleet";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "We Rent — Autonoleggio in Sardegna e a Milano Linate" },
      {
        name: "description",
        content:
          "Noleggia auto, van e veicoli commerciali a Cagliari, Olbia e Milano Linate. Km inclusi, RCA e IVA nel prezzo, assistenza 24/7.",
      },
      { property: "og:title", content: "We Rent — Autonoleggio in Sardegna e a Milano Linate" },
      {
        property: "og:description",
        content: "Il noleggio che fa per te: prenota online in due minuti e ritira in aeroporto.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { t, lang } = useI18n();
  // Sentinella sul bordo inferiore dell'hero: finché è visibile il form resta
  // sticky, appena viene superata torna nel flusso normale e scorre via.
  const heroEndRef = useRef<HTMLDivElement | null>(null);
  const [heroPassed, setHeroPassed] = useState(false);

  useEffect(() => {
    const sentinel = heroEndRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        setHeroPassed(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      // Si sgancia ~72px prima del bordo reale dell'hero (64px della topbar
      // sticky + margine) così sotto al form resta visibile una fascia di
      // sfondo verde prima della sezione statistiche.
      { threshold: 0, rootMargin: "-136px 0px 0px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
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
      {/* Contenitore relativo: il widget resta sticky solo per la durata dell'hero. */}
      <div className="relative bg-gradient-hero">
        <div
          className={
            heroPassed
              ? "mx-auto max-w-7xl px-4 pt-6 sm:px-6"
              : "mx-auto max-w-7xl px-4 pt-6 sm:px-6 md:sticky md:top-16 md:z-30"
          }
        >
          <SearchWidget variant="hero" />
        </div>


        <section className="relative overflow-hidden">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-14 lg:py-20">
            <div className="relative z-10 min-w-0 max-w-xl">
              <h1 className="text-4xl leading-tight text-ink [overflow-wrap:anywhere] sm:text-5xl lg:text-[3.25rem] xl:text-6xl">
                <span className="font-black">EVERY</span>
                <span className="font-black text-primary">WHERE</span>
                <span className="font-black">NT</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg text-ink/80">
                {t(
                  "Auto, van e veicoli commerciali pronti al ritiro a Cagliari, Olbia e Milano Linate. Tariffe chiare, km inclusi, assistenza 24/7.",
                  "Cars, vans and commercial vehicles ready for pick-up in Cagliari, Olbia and Milano Linate. Clear rates, mileage included, 24/7 support.",
                )}
              </p>
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
                alt={t("Auto a noleggio We Rent pronta al ritiro", "We Rent rental car ready for pick-up")}
                className="animate-ken-burns w-full object-cover"
              />
            </div>
          </div>
        </section>
        <div ref={heroEndRef} aria-hidden="true" className="h-px" />
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
