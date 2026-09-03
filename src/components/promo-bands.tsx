import { Link } from "@tanstack/react-router";
import { ArrowRight, Briefcase, ShieldCheck, Sparkles, Truck } from "lucide-react";

import { Reveal } from "@/components/reveal";
import { categories, heroImage, heroImageSrcSet } from "@/lib/fleet";
import { useI18n } from "@/lib/i18n";
import { PUBLIC_SITE_ONLY } from "@/lib/site-mode";
import { cn } from "@/lib/utils";

const vanImage = categories.find((c) => c.id === "van")?.image ?? heroImage;
const vanImageSrcSet = categories.find((c) => c.id === "van")?.imageSrcSet ?? heroImageSrcSet;
const premiumImage = categories.find((c) => c.id === "premium")?.image ?? heroImage;
const premiumImageSrcSet = categories.find((c) => c.id === "premium")?.imageSrcSet ?? heroImageSrcSet;
const businessImage = categories.find((c) => c.id === "business")?.image ?? heroImage;
const businessImageSrcSet = categories.find((c) => c.id === "business")?.imageSrcSet ?? heroImageSrcSet;

/**
 * Fasce promozionali a piena larghezza: ogni card è interamente cliccabile e
 * punta a una funzionalità reale del sito (assicurazioni, fedeltà, business, van).
 */
export function PromoBands() {
  const { t } = useI18n();

  const allBands = [
    {
      key: "protezione",
      icon: ShieldCheck,
      badge: t("Protezione", "Protection"),
      title: t("PROTEZIONE ZERO PENSIERI", "ZERO-WORRY PROTECTION"),
      body: t(
        "Aggiungi la protezione danni estesa e parti senza pensieri.",
        "Add extended damage protection and drive worry-free.",
      ),
      cta: t("Aggiungi al tuo noleggio", "Add to your rental"),
      image: heroImage,
      imageSrcSet: heroImageSrcSet,
      link: { to: "/prenota", search: { insurance: "estesa" } },
    },
    {
      key: "vip",
      icon: Sparkles,
      badge: t("We Rent VIP", "We Rent VIP"),
      title: t("WE RENT VIP", "WE RENT VIP"),
      body: t(
        "Fino al 10% di sconto ai livelli Silver e Gold, senza costi di iscrizione.",
        "Up to 10% off at Silver and Gold tiers, with no membership fee.",
      ),
      cta: t("Scopri il programma fedeltà", "Discover the loyalty programme"),
      image: premiumImage,
      imageSrcSet: premiumImageSrcSet,
      link: { to: "/area-clienti/accedi", search: undefined },
    },
    {
      key: "business",
      icon: Briefcase,
      badge: "Business",
      title: t("NOLEGGIO PER AZIENDE", "RENTAL FOR COMPANIES"),
      body: t(
        "Tariffe dedicate, fatturazione semplificata, un referente per la tua attività.",
        "Dedicated rates, simplified invoicing, one contact for your business.",
      ),
      cta: t("Richiedi una convenzione", "Request an agreement"),
      image: businessImage,
      imageSrcSet: businessImageSrcSet,
      link: { to: "/business", search: undefined },
    },
    {
      key: "van",
      icon: Truck,
      badge: "Van",
      title: t("VAN E VEICOLI COMMERCIALI", "VANS AND COMMERCIAL VEHICLES"),
      body: t(
        "Fino a 9 posti o portata commerciale, per persone o merci.",
        "Up to 9 seats or commercial payload, for people or goods.",
      ),
      cta: t("Vedi la flotta Van", "See the van fleet"),
      image: vanImage,
      imageSrcSet: vanImageSrcSet,
      link: { to: "/flotta", search: { class: "van" } },
    },
  ];

  // La fascia VIP rimanda all'area clienti, oscurata provvisoriamente insieme al gestionale.
  const bands = PUBLIC_SITE_ONLY ? allBands.filter((band) => band.key !== "vip") : allBands;

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <p className="eyebrow">{t("Offerte e servizi", "Offers and services")}</p>
      <h2 className="mt-2 max-w-2xl text-3xl font-black sm:text-4xl">
        {t("Scegli come noleggiare.", "Choose how to rent.")}
      </h2>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        {bands.map((band, i) => {
          // Alternanza chiara/scura calcolata sulla posizione dopo il filtro
          // (non su un tono fisso per card): resta corretta indipendentemente
          // da quali card sono nascoste da PUBLIC_SITE_ONLY.
          const tone: "light" | "dark" = i % 2 === 0 ? "light" : "dark";
          return (
            <Reveal key={band.key} delay={i * 80}>
              <Link
                to={band.link.to}
                search={band.link.search as never}
                className={cn(
                  "group relative flex h-full min-h-56 flex-col justify-end overflow-hidden rounded-3xl border p-7 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-elev",
                  tone === "dark"
                    ? "border-ink/20 bg-ink text-ink-foreground"
                    : "border-border bg-secondary",
                )}
              >
                <img
                  src={band.image}
                  srcSet={band.imageSrcSet}
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  alt=""
                  aria-hidden
                  loading="lazy"
                  className={cn(
                    "absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105",
                    tone === "dark" ? "opacity-35" : "opacity-25",
                  )}
                />
                <div
                  className={cn(
                    "absolute inset-0",
                    tone === "dark"
                      ? "bg-gradient-to-tr from-ink via-ink/85 to-ink/40"
                      : "bg-gradient-to-tr from-secondary via-secondary/90 to-secondary/40",
                  )}
                  aria-hidden
                />

                <div className="relative">
                  <span
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest",
                      tone === "dark"
                        ? "bg-primary-soft/20 text-primary-soft"
                        : "bg-primary text-primary-foreground",
                    )}
                  >
                    <band.icon className="size-3.5" aria-hidden />
                    {band.badge}
                  </span>
                  <h3 className="mt-4 text-2xl font-black uppercase tracking-tight sm:text-3xl">
                    {band.title}
                  </h3>
                  <p
                    className={cn(
                      "mt-2 max-w-md text-sm",
                      tone === "dark" ? "text-ink-foreground/75" : "text-muted-foreground",
                    )}
                  >
                    {band.body}
                  </p>
                  <span
                    className={cn(
                      "mt-5 inline-flex items-center gap-2 text-sm font-bold",
                      tone === "dark" ? "text-primary-soft" : "text-primary",
                    )}
                  >
                    {band.cta}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                  </span>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
