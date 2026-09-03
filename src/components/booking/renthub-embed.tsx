import { Link } from "@tanstack/react-router";
import { Car, Truck } from "lucide-react";
import { useEffect, useState } from "react";

import { useI18n } from "@/lib/i18n";

/**
 * Motore di prenotazione RentHub incorporato via iframe — stesso URL/parametri
 * già usati su werentsrl.com. Componente condiviso: usato sia nella pagina
 * `/prenota` a piena pagina, sia in versione compatta nella hero della home
 * (fase provvisoria, PUBLIC_SITE_ONLY).
 */
const RENTHUB_BASE_URL = "https://werentsardegna.renthubsoftware.com/rental-booking-engine/search";
const RENTHUB_IFRAME_PARAMS =
  "iframe=1&hideHeader=1&hideLangs=1&min_seats_hidden=1&class_hidden=1&type_hidden=0&priority_type=1";
const RESIZER_SRC = "https://d2w6m45wk5ig2o.cloudfront.net/assets/rental/be/clientResizer.js";

/** Codici sede RentHub (estratti dal widget live il 1° settembre 2026). */
export const RENTHUB_LOCATION_CODE: Record<string, string> = {
  CAG: "1",
  OLB: "2",
  LIN: "4",
};

/** Codici tipologia veicolo RentHub: non esiste una categoria "van" separata da "business" (furgone). */
export const RENTHUB_TYPE_CODE: Record<string, string> = {
  economy: "1",
  premium: "3",
  van: "2",
  business: "2",
};

/** Sede di default quando non si arriva da un deep-link, per evitare che il
 * widget mostri i campi vuoti (e i relativi "Campo obbligatorio") al primo
 * caricamento — es. la home, o `/prenota` visitata direttamente. */
const DEFAULT_LOCATION_CODE: string = RENTHUB_LOCATION_CODE["CAG"] ?? "1";

export type RentHubParams = {
  from?: string;
  to?: string;
  date_from?: string;
  time_from?: string;
  date_to?: string;
  time_to?: string;
  class?: string;
};

export function buildRentHubSrc(params: RentHubParams): string {
  const search = new URLSearchParams(RENTHUB_IFRAME_PARAMS);

  const fromCode = (params.from ? RENTHUB_LOCATION_CODE[params.from] : undefined) ?? DEFAULT_LOCATION_CODE;
  const toCode = (params.to ? RENTHUB_LOCATION_CODE[params.to] : undefined) ?? fromCode;
  search.set("from", fromCode);
  search.set("to", toCode);

  // Data e ora NON vengono mai precompilate con un default, nemmeno "domani
  // alle 10:00": se il motore RentHub trova insieme from+to+date_from+date_to
  // nell'URL lancia subito una ricerca automatica, ma le select "Ora
  // Ritiro"/"Ora Consegna" restano sempre vuote al primo caricamento (le
  // loro opzioni vengono popolate via JS solo dopo un'interazione manuale
  // dell'utente col form) — quella ricerca fallisce quindi sempre e mostra
  // subito, a ogni visitatore, un banner rosso "Data Ritiro non è una data
  // valida...". Verificato direttamente sul motore RentHub il 2 settembre
  // 2026 (stessa combinazione di parametri, stesso errore, indipendente dal
  // nostro codice). Meglio lasciare il form vuoto — mostra il messaggio
  // neutro "Imposta i filtri di ricerca e clicca su cerca per iniziare" —
  // ed è comunque il comportamento atteso da un widget di prenotazione: le
  // date le sceglie l'utente. Se in futuro arriverà un vero deep-link con
  // date/ora già scelte da un flusso nostro, passano comunque qui sotto,
  // senza alcun default sintetico.
  if (params.date_from) search.set("date_from", params.date_from);
  if (params.date_to) search.set("date_to", params.date_to);
  if (params.time_from) search.set("time_from", params.time_from);
  if (params.time_to) search.set("time_to", params.time_to);

  const typeCode = params.class ? RENTHUB_TYPE_CODE[params.class] : undefined;
  if (typeCode) search.set("type", typeCode);

  return `${RENTHUB_BASE_URL}?${search.toString()}`;
}

let resizerScriptPromise: Promise<void> | undefined;

/** Carica clientResizer.js una sola volta anche se più embed sono montati. */
function loadResizerScript(): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  if (!resizerScriptPromise) {
    resizerScriptPromise = new Promise((resolve) => {
      if (document.querySelector(`script[src="${RESIZER_SRC}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = RESIZER_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => resolve();
      document.body.appendChild(script);
    });
  }
  return resizerScriptPromise;
}

type RentHubEmbedProps = {
  params?: RentHubParams;
  /** Variante compatta per l'hero della home: contenitore più basso. */
  compact?: boolean;
  frameId?: string;
  className?: string;
};

export function RentHubEmbed({ params = {}, compact = false, frameId = "renthub-frame", className }: RentHubEmbedProps) {
  const { t } = useI18n();
  const [loaded, setLoaded] = useState(false);
  const src = buildRentHubSrc(params);

  useEffect(() => {
    let cancelled = false;
    void loadResizerScript().then(() => {
      if (cancelled) return;
      const iFrameResize = (window as unknown as { iFrameResize?: (opts: object, selector: string) => void })
        .iFrameResize;
      iFrameResize?.({ checkOrigin: false, heightCalculationMethod: "lowestElement" }, `#${frameId}`);
    });
    return () => {
      cancelled = true;
    };
  }, [frameId, src]);

  // Altezza minima "di sicurezza": garantisce che il modulo non resti mai
  // schiacciato all'altezza di default del browser (150px) se per qualche
  // motivo clientResizer.js non riesce a ridimensionare l'iframe — il
  // ridimensionamento automatico, quando funziona, può solo farla crescere.
  const minHeight = compact ? "min-h-[440px] sm:min-h-[480px]" : "min-h-[640px] sm:min-h-[760px]";

  // Nessun bordo/ombra, e il bianco NON è puro (#fff) ma #f9f9f9: è lo
  // sfondo reale della pagina RentHub (rgb(249,249,249), verificato in modo
  // diretto il 2 settembre 2026, cross-origin quindi non modificabile da qui)
  // — usare il nostro bianco puro lasciava una differenza di tonalità visibile
  // esattamente sul bordo dell'iframe. Con lo stesso #f9f9f9 la card si
  // confonde davvero con l'iframe invece di leggersi come un riquadro separato.
  return (
    <div className={`rounded-3xl bg-[#f9f9f9] ${className ?? ""}`}>
      <div className="relative overflow-hidden rounded-3xl bg-[#f9f9f9]">
        {!loaded && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 p-10 text-center ${minHeight}`}>
            <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">
              {t("Caricamento disponibilità in corso…", "Loading availability…")}
            </p>
          </div>
        )}
        <iframe
          id={frameId}
          title={t("Motore di prenotazione We Rent", "We Rent booking engine")}
          src={src}
          onLoad={() => setLoaded(true)}
          className={`block w-full border-0 ${minHeight} ${loaded ? "" : "opacity-0"}`}
          scrolling="no"
        />
      </div>
    </div>
  );
}

/**
 * Tasti "Auto" / "Veicoli commerciali" sopra il modulo di ricerca — identici
 * a quelli del widget nativo (`search-widget.tsx`), replicati qui perché in
 * fase provvisoria il modulo è l'iframe RentHub e non il form nativo.
 */
export function BookingClassTabs({ fixedClass }: { fixedClass?: "business" | undefined }) {
  const { t } = useI18n();
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {fixedClass === "business" ? (
        <span className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground">
          <Truck className="size-3.5" aria-hidden />
          {t("Veicoli commerciali", "Commercial vehicles")}
        </span>
      ) : (
        <>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground">
            <Car className="size-3.5" aria-hidden />
            {t("Auto", "Cars")}
          </span>
          <Link
            to="/veicoli-commerciali"
            className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-xs font-bold text-secondary-foreground transition-colors hover:bg-accent"
          >
            <Truck className="size-3.5" aria-hidden />
            {t("Veicoli commerciali", "Commercial vehicles")}
          </Link>
        </>
      )}
    </div>
  );
}
