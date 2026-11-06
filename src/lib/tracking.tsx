import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * Consent Mode v2 + GA4 + Google Ads (tag Google caricato dal nostro dominio, così la provenienza
 * dall'annuncio — gclid — resta su werentsrl.com anche quando la prenotazione avviene nell'iframe RentHub).
 * Configurazione nella build (.env):
 *   VITE_GA4_ID=G-XXXXXXX                      proprietà GA4 (eventi e «purchase»)
 *   VITE_GOOGLE_ADS_ID=AW-XXXXXXX              account Google Ads
 *   VITE_GOOGLE_ADS_PURCHASE_LABEL=xxxxxxxx    etichetta della conversione «prenotazione» (facoltativa:
 *                                              in alternativa si importa in Ads il «purchase» di GA4)
 * Se le variabili non arrivano alla build, valgono gli ID di We Rent scritti qui sotto (comunicati il 06/11/2026):
 * sono ID pubblici, compaiono comunque nel codice della pagina. Il tag si carica su tutte le pagine con
 * consenso predefinito NEGATO (Consent Mode v2): senza consenso Google riceve solo segnali anonimi senza cookie.
 */
const DEFAULT_GA4_ID = "G-THX7GBFP8E";
const DEFAULT_GOOGLE_ADS_ID = "AW-11360633325";
const DEFAULT_GOOGLE_ADS_PURCHASE_LABEL = "7kGKCPCOpbMdEO2Dlqkq";
const envOr = (v: unknown, fallback: string) =>
  typeof v === "string" && v.trim() ? v.trim() : fallback;
export const GA4_ID = envOr(import.meta.env["VITE_GA4_ID"], DEFAULT_GA4_ID);
export const GOOGLE_ADS_ID = envOr(import.meta.env["VITE_GOOGLE_ADS_ID"], DEFAULT_GOOGLE_ADS_ID);
export const GOOGLE_ADS_PURCHASE_LABEL = envOr(
  import.meta.env["VITE_GOOGLE_ADS_PURCHASE_LABEL"],
  DEFAULT_GOOGLE_ADS_PURCHASE_LABEL,
);
const TAG_ID = GA4_ID || GOOGLE_ADS_ID;

const CONSENT_KEY = "werent.consent";
const UTM_KEY = "werent.utm";

export type Consent = { necessary: true; analytics: boolean; marketing: boolean };

const denied: Consent = { necessary: true, analytics: false, marketing: false };

type Gtag = (...args: unknown[]) => void;

function dataLayerPush(...args: unknown[]) {
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer ?? [];
  w.dataLayer.push(args);
}

function gtag(...args: unknown[]) {
  const w = window as unknown as { gtag?: Gtag };
  if (w.gtag) w.gtag(...args);
  else dataLayerPush(...args);
}

export function readConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Consent>;
    return { necessary: true, analytics: !!parsed.analytics, marketing: !!parsed.marketing };
  } catch {
    return null;
  }
}

function applyConsent(consent: Consent) {
  gtag("consent", "update", {
    ad_storage: consent.marketing ? "granted" : "denied",
    ad_user_data: consent.marketing ? "granted" : "denied",
    ad_personalization: consent.marketing ? "granted" : "denied",
    analytics_storage: consent.analytics ? "granted" : "denied",
  });
}

let tagLoaded = false;

function loadGoogleTag() {
  if (tagLoaded || !TAG_ID || typeof document === "undefined") return;
  tagLoaded = true;
  const w = window as unknown as { dataLayer?: unknown[]; gtag?: Gtag };
  w.dataLayer = w.dataLayer ?? [];
  w.gtag = function gtagShim(...args: unknown[]) {
    w.dataLayer!.push(args);
  };
  w.gtag("js", new Date());
  w.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    wait_for_update: 500,
  });
  if (GA4_ID) w.gtag("config", GA4_ID);
  if (GOOGLE_ADS_ID) w.gtag("config", GOOGLE_ADS_ID);
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${TAG_ID}`;
  document.head.appendChild(script);
}

type ConsentContext = {
  consent: Consent | null;
  save: (consent: Consent) => void;
  reopen: () => void;
  bannerOpen: boolean;
};

const Ctx = createContext<ConsentContext>({
  consent: null,
  save: () => {},
  reopen: () => {},
  bannerOpen: false,
});

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<Consent | null>(null);
  const [bannerOpen, setBannerOpen] = useState(false);

  useEffect(() => {
    // Tag Google su tutte le pagine, con consenso predefinito negato (Consent Mode v2).
    loadGoogleTag();
    const stored = readConsent();
    if (stored) {
      setConsent(stored);
      applyConsent(stored);
    } else {
      setBannerOpen(true);
    }
    captureUtm();
    return listenForContactsAndRentHub();
  }, []);

  const save = useCallback((next: Consent) => {
    setConsent(next);
    setBannerOpen(false);
    try {
      window.localStorage.setItem(CONSENT_KEY, JSON.stringify(next));
    } catch {
      /* storage non disponibile: il consenso resta valido per la sessione */
    }
    loadGoogleTag();
    applyConsent(next.marketing || next.analytics ? next : denied);
  }, []);

  const reopen = useCallback(() => setBannerOpen(true), []);

  return <Ctx.Provider value={{ consent, save, reopen, bannerOpen }}>{children}</Ctx.Provider>;
}

export function useConsent() {
  return useContext(Ctx);
}

/* ---------------------------------- UTM ---------------------------------- */

const ATTRIBUTION_KEY = "werent.attribution";
const CLICK_IDS = ["gclid", "gbraid", "wbraid"];

function pickAttribution(search: URLSearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  search.forEach((v, k) => {
    if (v && (CLICK_IDS.includes(k) || k.startsWith("utm_"))) out[k] = v.slice(0, 500);
  });
  return out;
}

/**
 * Parametri di provenienza dell'annuncio da inoltrare al motore RentHub: gclid, gbraid, wbraid e utm_*.
 * Quelli nell'URL della pagina; se mancano (atterraggio su una landing, poi /prenota), quelli salvati
 * all'atterraggio nella stessa sessione.
 */
export function attributionParams(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const fromUrl = pickAttribution(new URLSearchParams(window.location.search));
  if (Object.keys(fromUrl).length) return fromUrl;
  try {
    const raw = window.sessionStorage.getItem(ATTRIBUTION_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export type Utm = {
  utm_source?: string | undefined;
  utm_medium?: string | undefined;
  utm_campaign?: string | undefined;
};

/** Salva le UTM di atterraggio così da poterle attaccare alla prenotazione. */
export function captureUtm() {
  if (typeof window === "undefined") return;
  const attribution = pickAttribution(new URLSearchParams(window.location.search));
  if (Object.keys(attribution).length) {
    try {
      window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
    } catch {
      /* ignora */
    }
  }
  const params = new URLSearchParams(window.location.search);
  const found: Utm = {
    utm_source: params.get("utm_source") ?? undefined,
    utm_medium: params.get("utm_medium") ?? undefined,
    utm_campaign: params.get("utm_campaign") ?? undefined,
  };
  if (!found.utm_source && !found.utm_medium && !found.utm_campaign) return;
  try {
    window.sessionStorage.setItem(UTM_KEY, JSON.stringify(found));
  } catch {
    /* ignora */
  }
}

export function storedUtm(): Utm {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(UTM_KEY);
    return raw ? (JSON.parse(raw) as Utm) : {};
  } catch {
    return {};
  }
}

/* --------------------------------- Eventi ---------------------------------- */

/** Evento GA4 (e Ads, se importato). Parte solo se il tag è caricato, cioè dopo il consenso cookie. */
export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (!tagLoaded) return;
  gtag("event", name, params);
}

/**
 * Clic su telefono e WhatsApp in qualunque punto del sito (eventi «click_phone» e «click_whatsapp»,
 * con la sede se il link la indica: data-branch="LIN"). Messaggi dal motore RentHub nell'iframe:
 * registrati nel dataLayer («renthub_message») per capire, nel test, se RentHub segnala la prenotazione conclusa.
 */
function listenForContactsAndRentHub() {
  if (typeof document === "undefined") return undefined;
  const onClick = (e: MouseEvent) => {
    const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (!a) return;
    const href = a.getAttribute("href") ?? "";
    const branch =
      a.dataset["branch"] ?? a.closest("[data-branch]")?.getAttribute("data-branch") ?? "generale";
    const base = { branch, page_path: window.location.pathname };
    if (href.startsWith("tel:"))
      trackEvent("click_phone", { ...base, phone_number: href.slice(4) });
    else if (/^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(href))
      trackEvent("click_whatsapp", {
        ...base,
        whatsapp_number: /wa\.me\/(\d+)/.exec(href)?.[1] ?? "",
      });
  };
  const onMessage = (e: MessageEvent) => {
    let host = "";
    try {
      host = new URL(e.origin).hostname;
    } catch {
      return;
    }
    if (!host.endsWith("renthubsoftware.com")) return;
    const data =
      typeof e.data === "string"
        ? e.data
        : (() => {
            try {
              return JSON.stringify(e.data);
            } catch {
              return String(e.data);
            }
          })();
    // Prenotazione conclusa nel motore RentHub:
    // { type: "werent_booking_completed", reservationCode, value, currency } (oggetto o stringa JSON).
    const booking = parseBookingCompleted(e.data);
    if (booking) trackBookingConversion({ ...booking, consent: readConsent() });
    const w = window as unknown as { dataLayer?: unknown[]; __renthubMessages?: string[] };
    w.__renthubMessages = [...(w.__renthubMessages ?? []), data.slice(0, 500)].slice(-50);
    w.dataLayer = w.dataLayer ?? [];
    w.dataLayer.push({ event: "renthub_message", renthub_data: data.slice(0, 500) });
  };
  document.addEventListener("click", onClick, true);
  window.addEventListener("message", onMessage);
  return () => {
    document.removeEventListener("click", onClick, true);
    window.removeEventListener("message", onMessage);
  };
}

/** Messaggio «werent_booking_completed» → codice, valore e valuta della prenotazione; null se non lo è. */
export function parseBookingCompleted(
  raw: unknown,
): { reservationCode: string; value: number; currency: string } | null {
  let d: unknown = raw;
  if (typeof d === "string") {
    try {
      d = JSON.parse(d);
    } catch {
      return null;
    }
  }
  if (!d || typeof d !== "object") return null;
  const o = d as Record<string, unknown>;
  if (o["type"] !== "werent_booking_completed") return null;
  const reservationCode = String(o["reservationCode"] ?? "")
    .trim()
    .slice(0, 100);
  const value =
    typeof o["value"] === "number"
      ? o["value"]
      : Number(String(o["value"] ?? "").replace(",", "."));
  if (!reservationCode || !Number.isFinite(value)) return null;
  const c = o["currency"];
  const currency = typeof c === "string" && /^[A-Za-z]{3}$/.test(c) ? c.toUpperCase() : "EUR";
  return { reservationCode, value, currency };
}

/** Inizio prenotazione: apertura del motore (RentHub o nativo), con la sede se scelta. */
export function trackBeginCheckout(engine: "renthub" | "werent", branch?: string | null) {
  trackEvent("begin_checkout", {
    booking_engine: engine,
    branch: branch ?? "non_indicata",
    currency: "EUR",
  });
}

/* ------------------------------- Conversioni ------------------------------ */

const firedConversions = new Set<string>();

const FIRED_KEY = "werent.conversions";

/** Deduplica per codice prenotazione, anche se la pagina viene ricaricata nella stessa sessione. */
function alreadyFired(code: string): boolean {
  if (firedConversions.has(code)) return true;
  firedConversions.add(code);
  try {
    const list = JSON.parse(window.sessionStorage.getItem(FIRED_KEY) ?? "[]") as string[];
    if (list.includes(code)) return true;
    window.sessionStorage.setItem(FIRED_KEY, JSON.stringify([...list, code].slice(-50)));
  } catch {
    /* storage non disponibile: resta la deduplica in memoria */
  }
  return false;
}

/**
 * Prenotazione conclusa: «purchase» a GA4 e «conversion» a Google Ads, una sola volta per codice.
 * Inviata SOLO su prenotazione realmente conclusa (mai sulla semplice bozza). Anche senza consenso
 * marketing: con Consent Mode v2 (default «denied») Google riceve un segnale anonimo per la modellazione.
 */
export function trackBookingConversion(input: {
  reservationCode: string;
  value: number;
  currency?: string;
  consent: Consent | null;
}) {
  if (!tagLoaded) return;
  if (alreadyFired(input.reservationCode)) return;
  const currency = input.currency ?? "EUR";
  // GA4: «purchase» con valore e codice (da importare in Google Ads come conversione).
  if (GA4_ID)
    gtag("event", "purchase", {
      transaction_id: input.reservationCode,
      value: input.value,
      currency,
    });
  if (GOOGLE_ADS_ID && GOOGLE_ADS_PURCHASE_LABEL) {
    gtag("event", "conversion", {
      send_to: `${GOOGLE_ADS_ID}/${GOOGLE_ADS_PURCHASE_LABEL}`,
      value: input.value,
      currency,
      transaction_id: input.reservationCode,
    });
  }
}
