/** Dati aziendali ufficiali We Rent S.r.l. — unica fonte di verità. */
export const company = {
  name: "We Rent S.r.l.",
  group: "We Build Tech S.r.l.",
  vat: "04131090922",
  rea: "CA 365591",
  ateco: "77.11",
  shareCapital: "20.000 €",
  legalAddress: "Via Stamira 10, 09134 Cagliari (CA)",
  phone: "+39 389 286 5597",
  phoneHref: "tel:+393892865597",
  whatsapp: "https://wa.me/393892865597",
  email: "booking@werentsrl.com",
  site: "www.werentsrl.com",
} as const;

export type Branch = {
  id: string;
  code: string;
  city: string;
  name: string;
  address: string;
  area: { it: string; en: string };
  hours: { it: string; en: string };
  mapQuery: string;
};

export const branches: Branch[] = [
  {
    id: "cagliari",
    code: "CAG",
    city: "Cagliari — Elmas",
    name: "Cagliari Aeroporto (Elmas)",
    address: "Via Bacco 11, Z.I. Aeroporto, Elmas (CA)",
    area: { it: "Sede principale · Sud Sardegna", en: "Main branch · South Sardinia" },
    hours: { it: "Tutti i giorni 07:00 – 23:00 · assistenza 24/7", en: "Daily 7:00 am – 11:00 pm · 24/7 support" },
    mapQuery: "Via Bacco 11 Elmas Cagliari",
  },
  {
    id: "olbia",
    code: "OLB",
    city: "Olbia Aeroporto",
    name: "Olbia Costa Smeralda",
    address: "Via Ruanda 11, Olbia (SS)",
    area: { it: "Nord Sardegna", en: "North Sardinia" },
    hours: { it: "Tutti i giorni 08:00 – 22:00 · assistenza 24/7", en: "Daily 8:00 am – 10:00 pm · 24/7 support" },
    mapQuery: "Via Ruanda 11 Olbia",
  },
  {
    id: "linate",
    code: "LIN",
    city: "Milano Linate",
    name: "Milano Linate Aeroporto",
    address: "Aeroporto di Milano Linate, Segrate (MI)",
    area: { it: "Nord Italia", en: "Northern Italy" },
    hours: { it: "Tutti i giorni 08:00 – 21:00 · assistenza 24/7", en: "Daily 8:00 am – 9:00 pm · 24/7 support" },
    mapQuery: "Aeroporto di Milano Linate",
  },
];
