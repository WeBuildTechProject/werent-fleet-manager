import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * Consent Mode v2 + GA4 + Google Ads (tag Google caricato dal nostro dominio, così la provenienza
 * dall'annuncio — gclid — resta su werentsrl.com anche quando la prenotazione avviene nell'iframe RentHub).
 * Configurazione nella build (.env):
 *   VITE_GA4_ID=G-XXXXXXX                      proprietà GA4 (eventi e «purchase»)
 *   VITE_GOOGLE_ADS_ID=AW-XXXXXXX              account Google Ads
 *   VITE_GOOGLE_ADS_PURCHASE_LABEL=xxxxxxxx    etichetta della conversione «prenotazione» (facoltativa:
 *                                              in alternativa si importa in Ads il «purchase» di GA4)
 * Senza ID nessun tag viene caricato e nessun evento inviato; il sito funziona identicamente.
 */
export const GA4_ID = ((import.meta.env["VITE_GA4_ID"] as string | undefined) ?? "").trim();
export const GOOGLE_ADS_ID = (
  (import.meta.env["VITE_GOOGLE_ADS_ID"] as string | undefined) ?? ""
).trim();
export const GOOGLE_ADS_PURCHASE_LABEL = (
  (import.meta.env["VITE_GOOGLE_ADS_PURCHASE_LABEL"] as string | undefined) ?? ""
).trim();
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
    const stored = readConsent();
    if (stored) {
      setConsent(stored);
      if (stored.marketing || stored.analytics) {
        loadGoogleTag();
        applyConsent(stored);
      }
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
    if (next.marketing || next.analytics) {
      loadGoogleTag();
      applyConsent(next);
    } else {
      applyConsent(denied);
    }
  }, []);

  const reopen = useCallback(() => setBannerOpen(true), []);

  return <Ctx.Provider value={{ consent, save, reopen, bannerOpen }}>{children}</Ctx.Provider>;
}

export function useConsent() {
  return useContext(Ctx);
}

/* ---------------------------------- UTM ---------------------------------- */

export type Utm = {
  utm_source?: string | undefined;
  utm_medium?: string | undefined;
  utm_campaign?: string | undefined;
};

/** Salva le UTM di atterraggio così da poterle attaccare alla prenotazione. */
export function captureUtm() {
  if (typeof window === "undefined") return;
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

/**
 * Conversione Google Ads: inviata SOLO su pagamento realmente riuscito
 * (mai sulla semplice creazione della bozza) e solo con consenso marketing.
 */
export function trackBookingConversion(input: {
  reservationCode: string;
  value: number;
  consent: Consent | null;
}) {
  if (!tagLoaded) return;
  if (firedConversions.has(input.reservationCode)) return;
  firedConversions.add(input.reservationCode);
  // GA4: «purchase» con valore e codice (da importare in Google Ads come conversione).
  if (GA4_ID)
    gtag("event", "purchase", {
      transaction_id: input.reservationCode,
      value: input.value,
      currency: "EUR",
    });
  // Google Ads diretto: solo con l'etichetta della conversione e il consenso marketing.
  if (GOOGLE_ADS_ID && GOOGLE_ADS_PURCHASE_LABEL && input.consent?.marketing) {
    gtag("event", "conversion", {
      send_to: `${GOOGLE_ADS_ID}/${GOOGLE_ADS_PURCHASE_LABEL}`,
      value: input.value,
      currency: "EUR",
      transaction_id: input.reservationCode,
    });
  }
}
