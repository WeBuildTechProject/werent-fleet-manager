import { Link, createFileRoute } from "@tanstack/react-router";
import { JsonLd } from "@/components/json-ld";
import { absoluteUrl, buildBreadcrumbJsonLd } from "@/lib/seo";
import { Mail, MapPin, Phone } from "lucide-react";

import { whatsappHref } from "@/components/whatsapp-fab";
import { WhatsappIcon } from "@/components/whatsapp-icon";

import { Button } from "@/components/ui/button";
import { branches, company } from "@/lib/company";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/contatti")({
  head: () => ({
    meta: [
      { title: "We Rent | Contatti e Sedi a Cagliari, Olbia e Milano" },
      {
        name: "description",
        content:
          "Telefono e WhatsApp +39 389 286 5597, email booking@werentsrl.com. Assistenza 24/7 su Cagliari, Olbia e Milano Linate.",
      },
      { property: "og:title", content: "We Rent | Contatti e Sedi a Cagliari, Olbia e Milano" },
      {
        property: "og:description",
        content: "Chiamaci, scrivici su WhatsApp o via email: rispondiamo tutti i giorni.",
      },
      { property: "og:url", content: absoluteUrl("/contatti") },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/contatti") }],
  }),
  component: ContattiPage,
});

function ContattiPage() {
  const { t, lang } = useI18n();

  const channels = [
    {
      icon: Phone,
      title: t("Telefono", "Phone"),
      value: company.phone,
      href: company.phoneHref,
      note: t("Tutti i giorni, 08:00 – 21:00", "Every day, 8:00 am – 9:00 pm"),
    },
    {
      icon: WhatsappIcon,
      title: "WhatsApp",
      value: company.phone,
      href: whatsappHref,
      note: t("Risposta media in 15 minuti", "Average reply in 15 minutes"),
    },
    {
      icon: Mail,
      title: "Email",
      value: company.email,
      href: `mailto:${company.email}`,
      note: t("Preventivi e convenzioni aziendali", "Quotes and corporate agreements"),
    },
  ];

  return (
    <>
      <JsonLd data={buildBreadcrumbJsonLd([{ name: "Contatti", path: "/contatti" }])} />
      <section className="bg-gradient-hero">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <p className="eyebrow text-ink/60">{t("Contatti", "Contact")}</p>
          <h1 className="mt-2 max-w-3xl text-4xl text-ink sm:text-5xl">
            {t("Parliamone.", "Let's talk.")}
          </h1>
          <p className="mt-4 max-w-2xl text-ink/80">
            {t(
              "Hai bisogno di un veicolo, di un preventivo o di assistenza su un noleggio in corso? Siamo raggiungibili su ogni canale.",
              "Need a vehicle, a quote or support on an ongoing rental? Reach us on any channel.",
            )}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-5 md:grid-cols-3">
          {channels.map((c) => (
            <a
              key={c.title}
              href={c.href}
              target={c.href.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer"
              className="rounded-2xl border border-border bg-card p-6 shadow-card transition-shadow hover:shadow-elev"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <c.icon className="size-5" aria-hidden />
              </span>
              <h2 className="mt-4 text-lg">{c.title}</h2>
              <p className="mt-1 font-semibold text-primary">{c.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{c.note}</p>
            </a>
          ))}
        </div>

        <div className="mt-12 grid gap-8 rounded-3xl bg-ink p-8 text-ink-foreground shadow-elev lg:grid-cols-2 lg:p-12">
          <div>
            <h2 className="text-2xl sm:text-3xl">{t("Sedi operative", "Operating branches")}</h2>
            <ul className="mt-6 space-y-5 text-sm">
              {branches.map((b) => (
                <li key={b.id} className="flex items-start gap-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary-soft" aria-hidden />
                  <span>
                    <span className="block font-bold">{b.name}</span>
                    <span className="block text-ink-foreground/70">{b.address}</span>
                    <span className="block text-ink-foreground/60">{b.hours[lang]}</span>
                  </span>
                </li>
              ))}
            </ul>
            <Button asChild className="mt-8 rounded-full px-6">
              <Link to="/dove-siamo">{t("Vedi mappe e orari", "See maps and hours")}</Link>
            </Button>
          </div>
          <div className="rounded-2xl bg-card p-6 text-card-foreground shadow-card">
            <h2 className="text-xl">{t("Dati societari", "Company details")}</h2>
            <dl className="mt-4 space-y-2 text-sm">
              {[
                [t("Ragione sociale", "Legal name"), company.name],
                ["P.IVA / C.F.", company.vat],
                ["REA", company.rea],
                [t("Sede legale", "Registered office"), company.legalAddress],
                [t("Codice ATECO", "Business code"), company.ateco],
                [t("Capitale sociale", "Share capital"), company.shareCapital],
                [t("Gruppo", "Group"), company.group],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-border pb-2 last:border-0">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>
    </>
  );
}
