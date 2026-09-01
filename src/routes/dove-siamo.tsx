import { Link, createFileRoute } from "@tanstack/react-router";
import { Clock, MapPin, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { branches, company } from "@/lib/company";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/dove-siamo")({
  head: () => ({
    meta: [
      { title: "Dove siamo — Cagliari, Olbia e Milano Linate | We Rent" },
      {
        name: "description",
        content:
          "Tre sedi operative: Cagliari Elmas, Olbia Aeroporto e Milano Linate. Orari, indirizzi e ritiro rapido in aeroporto.",
      },
      { property: "og:title", content: "Dove siamo — Cagliari, Olbia e Milano Linate | We Rent" },
      {
        property: "og:description",
        content: "Ritira il tuo veicolo in aeroporto a Cagliari, Olbia o Milano Linate.",
      },
    ],
  }),
  component: DoveSiamoPage,
});

function DoveSiamoPage() {
  const { t, lang } = useI18n();

  return (
    <>
      <section className="bg-gradient-hero">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <p className="eyebrow text-ink/60">{t("Le nostre sedi", "Our locations")}</p>
          <h1 className="mt-2 max-w-3xl text-4xl text-ink sm:text-5xl">
            {t("Ti aspettiamo in aeroporto.", "We meet you at the airport.")}
          </h1>
          <p className="mt-4 max-w-2xl text-ink/80">
            {t(
              "Tre sedi operative, ritiro rapido e assistenza 24/7 su tutta la Sardegna e a Milano.",
              "Three operating branches, fast pick-up and 24/7 support across Sardinia and in Milan.",
            )}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-10 px-4 py-16 sm:px-6">
        {branches.map((b, i) => (
          <article
            key={b.id}
            id={b.id}
            className="scroll-mt-24 grid gap-6 overflow-hidden rounded-3xl border border-border bg-card shadow-card lg:grid-cols-2"
          >
            <div className={i % 2 === 1 ? "p-8 lg:order-2 lg:p-10" : "p-8 lg:p-10"}>
              <p className="eyebrow">{b.area[lang]}</p>
              <h2 className="mt-2 text-2xl sm:text-3xl">{b.name}</h2>
              <ul className="mt-6 space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <span>{b.address}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Clock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <span>{b.hours[lang]}</span>
                </li>
                <li className="flex items-start gap-3">
                  <Phone className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <a href={company.phoneHref} className="font-semibold hover:underline">
                    {company.phone}
                  </a>
                </li>
              </ul>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild className="rounded-full px-6">
                  <Link to="/prenota" search={{ from: b.code }}>
                    {t("Prenota da qui", "Book from here")}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full px-6">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.mapQuery)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("Apri in Maps", "Open in Maps")}
                  </a>
                </Button>
              </div>
            </div>
            <div className={i % 2 === 1 ? "min-h-[300px] lg:order-1" : "min-h-[300px]"}>
              <iframe
                title={`${t("Mappa", "Map")} ${b.name}`}
                src={`https://www.google.com/maps?q=${encodeURIComponent(b.mapQuery)}&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="size-full min-h-[300px] border-0"
              />
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
