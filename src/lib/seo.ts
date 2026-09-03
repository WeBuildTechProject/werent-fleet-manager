import { branches, company } from "@/lib/company";
import { GOOGLE_REVIEWS_URL, TRUSTPILOT_REVIEWS_URL } from "@/components/reviews-carousel";

/**
 * Infrastruttura SEO condivisa: URL assoluto del sito, e costruttori di dati
 * strutturati JSON-LD (Organization, AutoRental per sede, FAQPage,
 * BreadcrumbList) usati da __root.tsx e dalle singole pagine. Un'unica fonte
 * di verità, coerente coi dati reali in company.ts/branches.
 */
export const SITE_URL = "https://www.werentsrl.com";

/** Costruisce un URL assoluto a partire da un path che parte con "/". */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Coordinate geografiche e orari strutturati per sede (per JSON-LD AutoRental). */
const BRANCH_GEO: Record<string, { lat: number; lng: number; opens: string; closes: string }> = {
  cagliari: { lat: 39.2515, lng: 9.0543, opens: "07:00", closes: "23:00" },
  olbia: { lat: 40.8987, lng: 9.5175, opens: "08:00", closes: "22:00" },
  linate: { lat: 45.4494, lng: 9.2769, opens: "08:00", closes: "21:00" },
};

export function buildOrganizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: company.name,
    legalName: company.name,
    url: SITE_URL,
    logo: absoluteUrl("/favicon.ico"),
    image: absoluteUrl("/favicon.ico"),
    telephone: company.phone,
    email: company.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Via Stamira 10",
      addressLocality: "Cagliari",
      postalCode: "09134",
      addressRegion: "CA",
      addressCountry: "IT",
    },
    parentOrganization: {
      "@type": "Organization",
      name: company.group,
    },
    sameAs: [GOOGLE_REVIEWS_URL, TRUSTPILOT_REVIEWS_URL],
  };
}

/** Un'entità AutoRental per sede, come richiesto per l'idoneità al pacchetto locale. */
export function buildAutoRentalJsonLd() {
  return branches.map((b) => {
    const geo = BRANCH_GEO[b.id];
    return {
      "@context": "https://schema.org",
      "@type": "AutoRental",
      "@id": `${SITE_URL}/#autorental-${b.id}`,
      name: `We Rent — ${b.name}`,
      url: absoluteUrl("/dove-siamo"),
      image: absoluteUrl("/favicon.ico"),
      telephone: company.phone,
      priceRange: "€€",
      parentOrganization: { "@id": `${SITE_URL}/#organization` },
      address: {
        "@type": "PostalAddress",
        streetAddress: b.address,
        addressLocality: b.city,
        addressCountry: "IT",
      },
      ...(geo
        ? {
            geo: { "@type": "GeoCoordinates", latitude: geo.lat, longitude: geo.lng },
            openingHoursSpecification: {
              "@type": "OpeningHoursSpecification",
              dayOfWeek: [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday",
              ],
              opens: geo.opens,
              closes: geo.closes,
            },
          }
        : {}),
    };
  });
}

export type FaqEntry = { q: string; a: string };

export function buildFaqJsonLd(faqs: FaqEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export type BreadcrumbEntry = { name: string; path: string };

export function buildBreadcrumbJsonLd(items: BreadcrumbEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
