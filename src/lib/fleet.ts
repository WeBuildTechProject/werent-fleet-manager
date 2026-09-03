import aygo from "@/assets/car-aygo.jpg";
import aygo480 from "@/assets/car-aygo-480w.jpg";
import aygo960 from "@/assets/car-aygo-960w.jpg";
import panda from "@/assets/car-panda.jpg";
import panda480 from "@/assets/car-panda-480w.jpg";
import panda960 from "@/assets/car-panda-960w.jpg";
import c3 from "@/assets/car-c3.jpg";
import c3_480 from "@/assets/car-c3-480w.jpg";
import c3_960 from "@/assets/car-c3-960w.jpg";
import bmwX4 from "@/assets/car-bmw-x4.jpg";
import bmwX4_480 from "@/assets/car-bmw-x4-480w.jpg";
import bmwX4_960 from "@/assets/car-bmw-x4-960w.jpg";
import alfaJunior from "@/assets/car-alfa-junior.jpg";
import alfaJunior480 from "@/assets/car-alfa-junior-480w.jpg";
import alfaJunior960 from "@/assets/car-alfa-junior-960w.jpg";
import spacetourer from "@/assets/car-spacetourer.jpg";
import spacetourer480 from "@/assets/car-spacetourer-480w.jpg";
import spacetourer960 from "@/assets/car-spacetourer-960w.jpg";
import ducato from "@/assets/car-ducato.jpg";
import ducato480 from "@/assets/car-ducato-480w.jpg";
import ducato960 from "@/assets/car-ducato-960w.jpg";
import transit from "@/assets/car-transit.jpg";
import transit480 from "@/assets/car-transit-480w.jpg";
import transit960 from "@/assets/car-transit-960w.jpg";
import hero from "@/assets/hero-car.jpg";
import hero640 from "@/assets/hero-car-640w.jpg";
import hero1200 from "@/assets/hero-car-1200w.jpg";

export const heroImage = hero;
/** srcset completo per l'immagine hero (usato con l'attributo HTML srcSet). */
export const heroImageSrcSet = `${hero640} 640w, ${hero1200} 1200w, ${hero} 1920w`;

/** Costruisce la stringa srcset "url 480w, url 960w, url-originale 1536w" per le foto veicoli. */
function vehicleSrcSet(w480: string, w960: string, full: string): string {
  return `${w480} 480w, ${w960} 960w, ${full} 1536w`;
}

export type CategoryId = "economy" | "premium" | "van" | "business";

export type Vehicle = {
  id: string;
  model: string;
  category: CategoryId;
  image: string;
  imageSrcSet: string;
  seats: number;
  doors: number;
  luggage: number;
  gearbox: "manuale" | "automatico";
  fuel: "benzina" | "diesel" | "ibrida" | "elettrica";
  ac: boolean;
  pricePerDay: number;
  popularity: number;
};

export const categories: {
  id: CategoryId;
  label: { it: string; en: string };
  tagline: { it: string; en: string };
  description: { it: string; en: string };
  image: string;
  imageSrcSet: string;
  fromPrice: number;
  models: string[];
  searchTab: "auto" | "van" | "business";
}[] = [
  {
    id: "economy",
    label: { it: "Economy", en: "Economy" },
    tagline: { it: "Compatta e agile", en: "Compact and agile" },
    description: {
      it: "Compatta, agile e perfetta per la città come per la costa. Consumi ridotti e parcheggio facile.",
      en: "Compact, agile and perfect both in town and along the coast. Low running costs, easy parking.",
    },
    image: aygo,
    imageSrcSet: vehicleSrcSet(aygo480, aygo960, aygo),
    fromPrice: 29,
    models: ["Toyota Aygo X", "Fiat Panda", "Citroën C3"],
    searchTab: "auto",
  },
  {
    id: "premium",
    label: { it: "Premium", en: "Premium" },
    tagline: { it: "SUV e crossover di gamma alta", en: "High-end SUVs and crossovers" },
    description: {
      it: "SUV e crossover di gamma alta per viaggi di lavoro e piacere, con dotazioni complete e cambio automatico.",
      en: "High-end SUVs and crossovers for business and leisure, fully equipped and automatic.",
    },
    image: bmwX4,
    imageSrcSet: vehicleSrcSet(bmwX4_480, bmwX4_960, bmwX4),
    fromPrice: 79,
    models: ["BMW X4", "Alfa Romeo Junior", "Audi Q3"],
    searchTab: "auto",
  },
  {
    id: "van",
    label: { it: "Van", en: "Passenger van" },
    tagline: { it: "Fino a 9 posti", en: "Up to 9 seats" },
    description: {
      it: "Van passeggeri fino a 9 posti: ideali per gruppi, team in trasferta e transfer aeroportuali.",
      en: "Passenger vans up to 9 seats: ideal for groups, travelling teams and airport transfers.",
    },
    image: spacetourer,
    imageSrcSet: vehicleSrcSet(spacetourer480, spacetourer960, spacetourer),
    fromPrice: 89,
    models: ["Citroën SpaceTourer", "Peugeot Traveller", "Ford Tourneo"],
    searchTab: "van",
  },
  {
    id: "business",
    label: { it: "Business", en: "Commercial" },
    tagline: { it: "Veicoli commerciali fino a 15 m³", en: "Commercial vehicles up to 15 m³" },
    description: {
      it: "Furgoni cargo fino a 15 m³ per logistica, cantieri e traslochi, disponibili anche per il lungo periodo.",
      en: "Cargo vans up to 15 m³ for logistics, construction sites and moving, also on long-term rental.",
    },
    image: ducato,
    imageSrcSet: vehicleSrcSet(ducato480, ducato960, ducato),
    fromPrice: 69,
    models: ["Fiat Ducato", "Ford Transit", "Peugeot Boxer"],
    searchTab: "business",
  },
];

export const vehicles: Vehicle[] = [
  {
    id: "aygo-x",
    model: "Toyota Aygo X",
    category: "economy",
    image: aygo,
    imageSrcSet: vehicleSrcSet(aygo480, aygo960, aygo),
    seats: 4,
    doors: 5,
    luggage: 1,
    gearbox: "manuale",
    fuel: "benzina",
    ac: true,
    pricePerDay: 29,
    popularity: 92,
  },
  {
    id: "panda",
    model: "Fiat Panda",
    category: "economy",
    image: panda,
    imageSrcSet: vehicleSrcSet(panda480, panda960, panda),
    seats: 5,
    doors: 5,
    luggage: 1,
    gearbox: "manuale",
    fuel: "ibrida",
    ac: true,
    pricePerDay: 32,
    popularity: 96,
  },
  {
    id: "c3",
    model: "Citroën C3",
    category: "economy",
    image: c3,
    imageSrcSet: vehicleSrcSet(c3_480, c3_960, c3),
    seats: 5,
    doors: 5,
    luggage: 2,
    gearbox: "manuale",
    fuel: "benzina",
    ac: true,
    pricePerDay: 35,
    popularity: 88,
  },
  {
    id: "alfa-junior",
    model: "Alfa Romeo Junior",
    category: "premium",
    image: alfaJunior,
    imageSrcSet: vehicleSrcSet(alfaJunior480, alfaJunior960, alfaJunior),
    seats: 5,
    doors: 5,
    luggage: 2,
    gearbox: "automatico",
    fuel: "ibrida",
    ac: true,
    pricePerDay: 75,
    popularity: 81,
  },
  {
    id: "bmw-x4",
    model: "BMW X4",
    category: "premium",
    image: bmwX4,
    imageSrcSet: vehicleSrcSet(bmwX4_480, bmwX4_960, bmwX4),
    seats: 5,
    doors: 5,
    luggage: 3,
    gearbox: "automatico",
    fuel: "diesel",
    ac: true,
    pricePerDay: 119,
    popularity: 74,
  },
  {
    id: "spacetourer",
    model: "Citroën SpaceTourer 9 posti",
    category: "van",
    image: spacetourer,
    imageSrcSet: vehicleSrcSet(spacetourer480, spacetourer960, spacetourer),
    seats: 9,
    doors: 5,
    luggage: 5,
    gearbox: "manuale",
    fuel: "diesel",
    ac: true,
    pricePerDay: 89,
    popularity: 69,
  },
  {
    id: "ducato",
    model: "Fiat Ducato 12 m³",
    category: "business",
    image: ducato,
    imageSrcSet: vehicleSrcSet(ducato480, ducato960, ducato),
    seats: 3,
    doors: 4,
    luggage: 0,
    gearbox: "manuale",
    fuel: "diesel",
    ac: true,
    pricePerDay: 69,
    popularity: 66,
  },
  {
    id: "transit",
    model: "Ford Transit 15 m³",
    category: "business",
    image: transit,
    imageSrcSet: vehicleSrcSet(transit480, transit960, transit),
    seats: 3,
    doors: 4,
    luggage: 0,
    gearbox: "manuale",
    fuel: "diesel",
    ac: true,
    pricePerDay: 79,
    popularity: 61,
  },
];

export const includedItems: { it: string; en: string }[] = [
  { it: "RCA e copertura assicurativa base inclusa", en: "Third-party liability insurance included" },
  { it: "Assistenza stradale 24/7 in tutta Italia", en: "24/7 roadside assistance across Italy" },
  { it: "Km illimitati* sulle tariffe settimanali", en: "Unlimited mileage* on weekly rates" },
  { it: "IVA inclusa, nessun costo nascosto", en: "VAT included, no hidden fees" },
  { it: "Cancellazione gratuita fino a 48h prima", en: "Free cancellation up to 48h before pick-up" },
  { it: "Secondo conducente su richiesta", en: "Additional driver on request" },
];
