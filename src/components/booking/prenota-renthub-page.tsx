import { getRouteApi } from "@tanstack/react-router";
import { CalendarCheck, Lock, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { branches } from "@/lib/company";
import { useI18n } from "@/lib/i18n";

/**
 * Fase provvisoria: la prenotazione passa dal motore reale già in
 * produzione (RentHub Booking Engine, tenant "werentsardegna"), incorporato
 * via iframe con lo stesso URL/parametri già usati su werentsrl.com — non
 * dal flusso nativo (`prenota-native-page.tsx`), tenuto intatto per quando
 * il gestionale sarà approvato e questo componente verrà rimesso da parte.
 */

const RENTHUB_BASE_URL = "https://werentsardegna.renthubsoftware.com/rental-booking-engine/search";
const RENTHUB_IFRAME_PARAMS =
  "iframe=1&hideHeader=1&hideLangs=1&min_seats_hidden=1&class_hidden=1&type_hidden=0&priority_type=1";
const RESIZER_SRC = "https://d2w6m45wk5ig2o.cloudfront.net/assets/rental/be/clientResizer.js";

/** Codici sede RentHub (estratti dal widget live il 1° settembre 2026). */
const RENTHUB_LOCATION_CODE: Record<string, string> = {
  CAG: "1",
  OLB: "2",
  LIN: "4",
};

/** Codici tipologia veicolo RentHub: non esiste una categoria "van" separata da "business" (furgone). */
const RENTHUB_TYPE_CODE: Record<string, string> = {
  economy: "1",
  premium: "3",
  van: "2",
  business: "2",
};

function isoDate(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/** Aggiunge giorni a una data ISO (YYYY-MM-DD) senza passare da "oggi". */
function addDaysToIso(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate(days);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

const routeApi = getRouteApi("/prenota");

function buildRentHubSrc(search: ReturnType<typeof routeApi.useSearch>) {
  const params = new URLSearchParams(RENTHUB_IFRAME_PARAMS);

  const fromCode = search.from ? RENTHUB_LOCATION_CODE[search.from] : undefined;
  const toCode = search.to ? RENTHUB_LOCATION_CODE[search.to] : fromCode;
  if (fromCode) params.set("from", fromCode);
  if (toCode) params.set("to", toCode);

  const dateFrom = search.date_from ?? isoDate(1);
  // Il fallback di date_to è sempre relativo a date_from (non a "oggi"), così
  // un deep-link con solo date_from valorizzato non produce mai un intervallo
  // con la restituzione prima del ritiro.
  const dateTo = search.date_to ?? addDaysToIso(dateFrom, 3);
  params.set("date_from", dateFrom);
  params.set("time_from", search.time_from ?? "10:00");
  params.set("date_to", dateTo);
  params.set("time_to", search.time_to ?? "10:00");

  const typeCode = search.class ? RENTHUB_TYPE_CODE[search.class] : undefined;
  if (typeCode) params.set("type", typeCode);

  return `${RENTHUB_BASE_URL}?${params.toString()}`;
}

export function PrenotaRentHubPage() {
  const { t } = useI18n();
  const search = routeApi.useSearch();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const src = buildRentHubSrc(search);

  useEffect(() => {
    if (document.querySelector(`script[src="${RESIZER_SRC}"]`)) return;
    const script = document.createElement("script");
    script.src = RESIZER_SRC;
    script.async = true;
    script.onload = () => {
      const iFrameResize = (window as unknown as { iFrameResize?: (opts: object, selector: string) => void })
        .iFrameResize;
      iFrameResize?.({ checkOrigin: false, heightCalculationMethod: "lowestElement" }, "#renthub-frame");
    };
    document.body.appendChild(script);
  }, []);

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
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-card shadow-elev">
          {!loaded && (
            <div className="flex min-h-[520px] flex-col items-center justify-center gap-3 p-10 text-center">
              <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">
                {t("Caricamento disponibilità in corso…", "Loading availability…")}
              </p>
            </div>
          )}
          <iframe
            id="renthub-frame"
            ref={iframeRef}
            title={t("Motore di prenotazione We Rent", "We Rent booking engine")}
            src={src}
            onLoad={() => setLoaded(true)}
            className={loaded ? "w-full border-0" : "sr-only"}
            style={{ minHeight: loaded ? undefined : 0 }}
            scrolling="no"
          />
        </div>
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
