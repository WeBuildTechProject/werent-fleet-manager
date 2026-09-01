import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * Consent Mode v2 + Google Ads.
 * STATO NOTO E DICHIARATO: senza VITE_GOOGLE_ADS_ID nessun tag viene caricato
 * e nessuna conversione viene inviata; l'app funziona identicamente.
 */
export const GOOGLE_ADS_ID = (import.meta.env["VITE_GOOGLE_ADS_ID"] as string | undefined) ?? "";

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
  if (tagLoaded || !GOOGLE_ADS_ID || typeof document === "undefined") return;
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
  w.gtag("config", GOOGLE_ADS_ID);
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`;
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
  if (!GOOGLE_ADS_ID) return;
  if (!input.consent?.marketing) return;
  if (firedConversions.has(input.reservationCode)) return;
  firedConversions.add(input.reservationCode);
  gtag("event", "conversion", {
    send_to: GOOGLE_ADS_ID,
    value: input.value,
    currency: "EUR",
    transaction_id: input.reservationCode,
  });
}
