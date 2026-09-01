import aygo from "@/assets/car-aygo.jpg.asset.json";
import panda from "@/assets/car-panda.jpg.asset.json";
import c3 from "@/assets/car-c3.jpg.asset.json";
import bmwX4 from "@/assets/car-bmw-x4.jpg.asset.json";
import alfaJunior from "@/assets/car-alfa-junior.jpg.asset.json";
import spacetourer from "@/assets/car-spacetourer.jpg.asset.json";
import ducato from "@/assets/car-ducato.jpg.asset.json";
import transit from "@/assets/car-transit.jpg.asset.json";
import hero from "@/assets/hero-car.jpg.asset.json";

export const heroImage = hero.url;

export type CategoryId = "economy" | "premium" | "van" | "business";

export type Vehicle = {
  id: string;
  model: string;
  category: CategoryId;
  image: string;
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
    image: aygo.url,
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
    image: bmwX4.url,
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
    image: spacetourer.url,
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
    image: ducato.url,
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
    image: aygo.url,
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
    image: panda.url,
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
    image: c3.url,
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
    image: alfaJunior.url,
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
    image: bmwX4.url,
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
    image: spacetourer.url,
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
    image: ducato.url,
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
    image: transit.url,
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
