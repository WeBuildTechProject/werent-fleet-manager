import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, Boxes, Clock, IdCard, Ruler, ShieldCheck } from "lucide-react";

import { SearchWidget } from "@/components/search-widget";
import { TrustStrip } from "@/components/trust-strip";
import { Button } from "@/components/ui/button";
import heroCommerciali from "@/assets/hero-commerciali.jpg";
import { company } from "@/lib/company";
import { vehicles } from "@/lib/fleet";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/veicoli-commerciali")({
  head: () => ({
    meta: [
      { title: "Noleggio veicoli commerciali — We Rent Sardegna e Milano" },
      {
        name: "description",
        content:
          "Furgoni cargo fino a 15 m³ a noleggio a Cagliari, Olbia e Milano Linate: patente B, km inclusi, tariffe per aziende e cantieri.",
      },
      { property: "og:title", content: "Noleggio veicoli commerciali — We Rent" },
      {
        property: "og:description",
        content: "Furgoni cargo per logistica, cantieri e traslochi. Prenota online, ritira in aeroporto.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CommercialPage,
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

function CommercialPage() {
  const { t, lang } = useI18n();
  const cargo = vehicles.filter((v) => v.category === "business");

  const usp = [
    {
      icon: Boxes,
      title: t("Fino a 15 m³ di carico", "Up to 15 m³ of load"),
      body: t(
        "Furgoni cargo pronti per logistica, traslochi e forniture di cantiere.",
        "Cargo vans ready for logistics, moving and construction supplies.",
      ),
    },
    {
      icon: IdCard,
      title: t("Si guidano con la patente B", "Drive them with a B licence"),
      body: t(
        "Nessuna abilitazione speciale: massa entro 3,5 t su tutta la gamma.",
        "No special licence needed: all models stay within 3.5 t.",
      ),
    },
    {
      icon: Clock,
      title: t("Anche lungo periodo", "Long-term too"),
      body: t(
        "Formule mensili per cantieri e commesse continuative, con sostituzione garantita.",
        "Monthly formulas for sites and ongoing contracts, with replacement guaranteed.",
      ),
    },
    {
      icon: ShieldCheck,
      title: t("Assistenza 24/7", "24/7 assistance"),
      body: t(
        "RCA, IVA e assistenza stradale sempre incluse nella tariffa mostrata.",
        "Liability cover, VAT and roadside assistance always included.",
      ),
    },
  ];

  return (
    <>
      <section className="relative overflow-hidden bg-ink text-ink-foreground">
        <img
          src={heroCommerciali}
          alt={t(
            "Furgoni cargo We Rent allineati in un capannone illuminato",
            "We Rent cargo vans lined up in a lit hangar",
          )}
          width={1600}
          height={912}
          className="absolute inset-0 size-full object-cover opacity-60"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
          <p className="eyebrow text-primary-soft">{t("Veicoli commerciali", "Commercial vehicles")}</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-black sm:text-5xl">
            {t("Il tuo cantiere si muove con noi.", "Your worksite moves with us.")}
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-foreground/80">
            {t(
              "Furgoni cargo fino a 15 m³ disponibili a Cagliari, Olbia e Milano Linate. Prenotazione online, ritiro in aeroporto, tariffe chiare.",
              "Cargo vans up to 15 m³ available in Cagliari, Olbia and Milano Linate. Book online, collect at the airport, clear rates.",
            )}
          </p>
        </div>
      </section>

      <section className="mx-auto -mt-10 max-w-7xl px-4 sm:px-6">
        <SearchWidget variant="page" fixedClass="business" />
      </section>

      <TrustStrip />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <p className="eyebrow">{t("La gamma cargo", "The cargo range")}</p>
        <h2 className="mt-2 text-3xl font-black sm:text-4xl">
          {t("Due misure, ogni esigenza di carico.", "Two sizes, every load need.")}
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
                    alt={`${v.model} — ${t("furgone a noleggio", "rental van")}`}
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

      <section className="bg-secondary/60 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="eyebrow">{t("Perché noi", "Why us")}</p>
          <h2 className="mt-2 text-3xl font-black sm:text-4xl">
            {t("Pensati per chi lavora.", "Built for people at work.")}
          </h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {usp.map((item) => (
              <article key={item.title} className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <item.icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-lg">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
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

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="grid gap-6 rounded-3xl border border-border bg-card p-8 shadow-card lg:grid-cols-[1.4fr_1fr] lg:items-center lg:p-12">
          <div>
            <p className="eyebrow">Business</p>
            <h2 className="mt-2 text-3xl font-black sm:text-4xl">
              {t("Noleggi più di un furgone?", "Renting more than one van?")}
            </h2>
            <p className="mt-4 max-w-xl text-muted-foreground">
              {t(
                "Convenzioni aziendali, tariffe dedicate, contratto quadro e referente unico per flotte di veicoli commerciali.",
                "Corporate agreements, dedicated rates, master contract and a single point of contact for commercial fleets.",
              )}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <Button asChild size="lg" className="rounded-full px-7">
              <Link to="/business">
                {t("Richiedi convenzione", "Request an agreement")}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
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
