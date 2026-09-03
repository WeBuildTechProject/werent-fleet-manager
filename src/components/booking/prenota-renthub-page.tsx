import { getRouteApi } from "@tanstack/react-router";
import { CalendarCheck, Lock, ShieldCheck } from "lucide-react";

import { branches } from "@/lib/company";
import { useI18n } from "@/lib/i18n";

import { BookingClassTabs, RentHubEmbed } from "./renthub-embed";

/**
 * Fase provvisoria: la prenotazione passa dal motore reale già in
 * produzione (RentHub Booking Engine, tenant "werentsardegna"), incorporato
 * via iframe con lo stesso URL/parametri già usati su werentsrl.com — non
 * dal flusso nativo (`prenota-native-page.tsx`), tenuto intatto per quando
 * il gestionale sarà approvato e questo componente verrà rimesso da parte.
 */
const routeApi = getRouteApi("/prenota");

export function PrenotaRentHubPage() {
  const { t } = useI18n();
  const search = routeApi.useSearch();

  const badges = [
    { icon: Lock, label: t("Connessione crittografata", "Encrypted connection") },
    { icon: CalendarCheck, label: t("Cancellazione gratuita fino a 48h", "Free cancellation up to 48h") },
    { icon: ShieldCheck, label: t("RCA e IVA incluse", "Insurance and VAT included") },
  ];

  return (
    <>
      <section className="bg-gradient-hero">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <p className="eyebrow text-ink/60">{t("Prenotazione", "Booking")}</p>
          <h1 className="mt-2 text-4xl text-ink sm:text-5xl">
            {t("Prenota in un minuto.", "Book in one minute.")}
          </h1>
          <p className="mt-4 max-w-2xl text-ink/80">
            {t(
              "Disponibilità in tempo reale su Cagliari Elmas, Olbia Aeroporto e Milano Linate.",
              "Real-time availability in Cagliari Elmas, Olbia Airport and Milan Linate.",
            )}
          </p>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
            {badges.map((badge) => (
              <li key={badge.label} className="flex items-center gap-2 text-sm font-semibold text-ink/80">
                <badge.icon className="size-4" aria-hidden />
                {badge.label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-28 pt-10 sm:px-6 lg:pb-10">
        <BookingClassTabs fixedClass={search.class === "business" ? "business" : undefined} />
        <RentHubEmbed params={search} frameId="renthub-frame-full" />
        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t(
            "Motore di prenotazione fornito da RentHub Software — collegato in tempo reale alla nostra flotta.",
            "Booking engine provided by RentHub Software — connected live to our fleet.",
          )}
        </p>
        <ul className="mx-auto mt-2 flex max-w-md flex-wrap justify-center gap-x-4 gap-y-1 text-center text-[11px] text-muted-foreground/70">
          {branches.map((b) => (
            <li key={b.id}>{b.name}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
