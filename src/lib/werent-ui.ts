import { heroImage, vehicles as fleetVehicles } from "@/lib/fleet";

/** Aiuti di presentazione per la prenotazione collegata al gestionale (lotto 7b). */

export const eur = (cents: number, lang: "it" | "en" = "it") =>
  new Intl.NumberFormat(lang === "en" ? "en-IE" : "it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);

/** Foto rappresentativa della categoria (le foto del sito, per modello di esempio). */
const CATEGORY_PHOTO: Record<string, string> = {
  ECONOMY: "panda",
  COMPATTE: "c3",
  FAM_MAN: "alfa-junior",
  FAM_AUT: "alfa-junior",
  SUV_SPORT: "bmw-x4",
  MINIBUS_9: "spacetourer",
  FURGONE_L2: "ducato",
  FURGONE_COMPATTO: "transit",
};
export function categoryPhoto(code: string) {
  const v = fleetVehicles.find((x) => x.id === CATEGORY_PHOTO[code]);
  return { src: v?.image ?? heroImage, srcSet: v?.imageSrcSet };
}

export function fmtDay(iso: string, lang: "it" | "en") {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
