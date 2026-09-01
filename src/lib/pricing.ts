/**
 * Motore di calcolo prezzo unico, condiviso tra il flusso pubblico /prenota
 * e il wizard del gestionale. Nessuna logica di prezzo va duplicata altrove.
 *
 * Ordine di calcolo:
 *  1. listino attivo (categoria/sede/periodo) → fallback vehicles.daily_rate
 *  2. sconto convenzione partner
 *  3. sconto coupon
 *  4. supplemento età conducente (19-24 e 70+)
 *  5. extra selezionati
 */

export type RatePlan = {
  id: string;
  name: string;
  category_id: string;
  branch_id: string | null;
  daily_rate: number;
  weekly_rate: number | null;
  valid_from: string;
  valid_to: string;
  active: boolean;
  /** Massimale km incluso al giorno (null = eredita dalla categoria). */
  included_km_per_day?: number | null;
  /** Tariffa €/km oltre il massimale (null = eredita dalla categoria). */
  extra_km_rate?: number | null;

};

export type Coupon = {
  id: string;
  code: string;
  discount_type: string; // percent | fixed
  discount_value: number;
  valid_from: string;
  valid_to: string;
  max_uses: number | null;
  used_count: number;
  active: boolean;
};

export type Extra = {
  id: string;
  code: string;
  label_it: string;
  label_en: string;
  price_per_day: number;
  price_type: string; // per_giorno | una_tantum
  max_qty: number;
  active: boolean;
};

export type SelectedExtra = { extra: Extra; qty: number };

/** Supplemento giornaliero per fascia d'età del conducente (€/giorno). */
export const ageSurchargePerDay: Record<string, number> = {
  "19-24": 9,
  "25+": 0,
  "70+": 7,
};

export type PriceInput = {
  days: number;
  /** Tariffa base di fallback (vehicles.daily_rate). */
  fallbackDailyRate: number;
  ratePlan?: RatePlan | null;
  partnerDiscountPct?: number;
  coupon?: Coupon | null;
  driverAge?: string;
  extras?: SelectedExtra[];
  /** Pacchetto assicurativo scelto (unico punto di calcolo della copertura). */
  insurancePackage?: InsurancePackage | null;
  /** Sconto fedeltà (%) del livello raggiunto dal cliente collegato. */
  loyaltyDiscountPct?: number;
  /** Nome del livello, solo per l'etichetta nel riepilogo. */
  loyaltyTierName?: string | null;
  /**
   * Regola di cumulabilità con il coupon (app_settings.loyalty_stacking):
   * "best" (default) applica solo lo sconto più favorevole al cliente,
   * "stack" li somma entrambi.
   */
  loyaltyStacking?: "best" | "stack";
};

export type PriceBreakdown = {
  days: number;
  dailyRate: number;
  base: number;
  partnerDiscount: number;
  couponDiscount: number;
  loyaltyDiscount: number;
  loyaltyTierName: string | null;
  ageSurcharge: number;
  extrasTotal: number;
  insuranceTotal: number;
  total: number;
};


const round2 = (n: number) => Math.round(n * 100) / 100;

/** Listino applicabile: categoria, sede (o listino globale), periodo, attivo. */
export function pickRatePlan(
  plans: RatePlan[],
  categoryId: string | null | undefined,
  branchId: string | null | undefined,
  dateFrom: string,
): RatePlan | null {
  if (!categoryId) return null;
  const eligible = plans.filter(
    (p) =>
      p.active &&
      p.category_id === categoryId &&
      (p.branch_id === null || p.branch_id === branchId) &&
      p.valid_from <= dateFrom &&
      p.valid_to >= dateFrom,
  );
  // Il listino specifico di sede vince su quello globale.
  return eligible.sort((a, b) => (a.branch_id ? -1 : 1) - (b.branch_id ? -1 : 1))[0] ?? null;
}

export function isCouponValid(coupon: Coupon | null | undefined, onDate: string): boolean {
  if (!coupon || !coupon.active) return false;
  if (coupon.valid_from > onDate || coupon.valid_to < onDate) return false;
  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) return false;
  return true;
}

export function computePrice(input: PriceInput): PriceBreakdown {
  const days = Math.max(1, Math.round(input.days));
  const plan = input.ratePlan;
  const dailyRate = Number(plan?.daily_rate ?? input.fallbackDailyRate) || 0;

  // Tariffa settimanale: applicata quando conviene al cliente.
  const weekly = plan?.weekly_rate ? Number(plan.weekly_rate) : 0;
  let base = days * dailyRate;
  if (weekly > 0 && days >= 7) {
    const weeks = Math.floor(days / 7);
    const rest = days % 7;
    base = Math.min(base, weeks * weekly + rest * dailyRate);
  }
  base = round2(base);

  const partnerPct = Number(input.partnerDiscountPct ?? 0);
  const partnerDiscount = round2(base * (partnerPct / 100));
  let subtotal = base - partnerDiscount;

  // Coupon e sconto fedeltà sono calcolati sulla stessa base (subtotale dopo
  // sconto convenzione) e poi conciliati secondo la regola di cumulabilità.
  const coupon = input.coupon;
  let couponDiscount = coupon
    ? coupon.discount_type === "percent"
      ? round2(subtotal * (Number(coupon.discount_value) / 100))
      : round2(Math.min(subtotal, Number(coupon.discount_value)))
    : 0;

  const loyaltyPct = Math.max(0, Number(input.loyaltyDiscountPct ?? 0));
  let loyaltyDiscount = round2(subtotal * (loyaltyPct / 100));

  const stacking = input.loyaltyStacking ?? "best";
  if (stacking === "best" && couponDiscount > 0 && loyaltyDiscount > 0) {
    // Regola predefinita: mai sconti doppi, si applica il più favorevole.
    if (loyaltyDiscount >= couponDiscount) couponDiscount = 0;
    else loyaltyDiscount = 0;
  }
  const totalDiscount = Math.min(subtotal, round2(couponDiscount + loyaltyDiscount));
  subtotal = round2(subtotal - totalDiscount);
  const loyaltyTierName = loyaltyDiscount > 0 ? (input.loyaltyTierName ?? null) : null;

  const ageSurcharge = round2(days * (ageSurchargePerDay[input.driverAge ?? "25+"] ?? 0));

  const extrasTotal = round2(
    (input.extras ?? []).reduce((sum, item) => {
      const unit = Number(item.extra.price_per_day) || 0;
      const qty = Math.max(0, item.qty);
      return sum + (item.extra.price_type === "una_tantum" ? unit * qty : unit * qty * days);
    }, 0),
  );

  const insuranceTotal = insuranceCost(input.insurancePackage, days);

  return {
    days,
    dailyRate,
    base,
    partnerDiscount,
    couponDiscount,
    loyaltyDiscount,
    loyaltyTierName,
    ageSurcharge,
    extrasTotal,
    insuranceTotal,
    total: round2(Math.max(0, subtotal + ageSurcharge + extrasTotal + insuranceTotal)),
  };

}

/** Prezzo unitario congelato in reservation_extras. */
export function frozenUnitPrice(extra: Extra, days: number): number {
  return extra.price_type === "una_tantum"
    ? Number(extra.price_per_day)
    : round2(Number(extra.price_per_day) * days);
}

/* ------------------------------------------------------------------ */
/* Rientro veicolo: km extra e carburante mancante                     */
/* ------------------------------------------------------------------ */

/**
 * Politica km applicata al contratto: il listino applicato vince, la categoria
 * veicolo fa da fallback. Nessun valore hardcoded nelle schermate.
 */
export type KmPolicyCategory = {
  included_km_per_day: number;
  extra_km_rate: number;
  fuel_price_per_liter: number;
};

export type KmPolicy = { includedKmPerDay: number; extraKmRate: number };

export function resolveKmPolicy(
  plan: RatePlan | null | undefined,
  category: KmPolicyCategory | null | undefined,
): KmPolicy {
  const includedFromPlan = plan?.included_km_per_day;
  const rateFromPlan = plan?.extra_km_rate;
  return {
    includedKmPerDay:
      includedFromPlan !== null && includedFromPlan !== undefined
        ? Number(includedFromPlan)
        : Number(category?.included_km_per_day ?? 0),
    extraKmRate:
      rateFromPlan !== null && rateFromPlan !== undefined
        ? Number(rateFromPlan)
        : Number(category?.extra_km_rate ?? 0),
  };
}

export type ReturnChargeInput = {
  days: number;
  kmOut: number;
  kmIn: number;
  includedKmPerDay: number;
  extraKmRate: number;
  /** Litri assoluti: unica unità di misura del carburante in tutta l'app. */
  fuelOut: number;
  fuelIn: number;
  fuelPricePerLiter: number;
  damageCharge?: number;
};

export type ReturnCharges = {
  kmDriven: number;
  includedKm: number;
  extraKm: number;
  extraKmAmount: number;
  missingLiters: number;
  fuelPenalty: number;
  damageCharge: number;
  total: number;
};

export function computeReturnCharges(input: ReturnChargeInput): ReturnCharges {
  const days = Math.max(1, Math.round(input.days));
  const kmDriven = Math.max(0, Math.round(input.kmIn - input.kmOut));
  const includedKm = Math.max(0, Math.round(days * Number(input.includedKmPerDay || 0)));
  const extraKm = includedKm > 0 ? Math.max(0, kmDriven - includedKm) : 0;
  const extraKmAmount = round2(extraKm * Number(input.extraKmRate || 0));
  const missingLiters = round2(Math.max(0, Number(input.fuelOut) - Number(input.fuelIn)));
  const fuelPenalty = round2(missingLiters * Number(input.fuelPricePerLiter || 0));
  const damageCharge = round2(Math.max(0, Number(input.damageCharge ?? 0)));
  return {
    kmDriven,
    includedKm,
    extraKm,
    extraKmAmount,
    missingLiters,
    fuelPenalty,
    damageCharge,
    total: round2(extraKmAmount + fuelPenalty + damageCharge),
  };
}

/* ------------------------------------------------------------------ */
/* Assicurazioni a pacchetti                                           */
/* ------------------------------------------------------------------ */

/** Componente assicurativo riutilizzabile (franchigia, deposito, servizi…). */
export type InsuranceSpec = {
  id: string;
  tipo: string;
  label_it: string;
  valore_default: number;
  active: boolean;
};

export type InsurancePackage = {
  id: string;
  nome: string;
  descrizione: string | null;
  /** null = pacchetto valido per tutte le categorie veicolo. */
  category_id: string | null;
  prezzo_giorno: number;
  franchigia_residua: number;
  sort_order: number;
  active: boolean;
};

export type InsurancePackageComponent = {
  id: string;
  insurance_package_id: string;
  insurance_spec_id: string;
  valore_override: number | null;
};

/** Etichette dei tipi di componente: unico punto, riusato da sito e gestionale. */
export const insuranceSpecTypeLabels: Record<string, string> = {
  franchigia_danni: "Franchigia danni",
  franchigia_furto: "Franchigia furto e incendio",
  deposito: "Deposito cauzionale",
  glass_tyre: "Cristalli, pneumatici e cerchi",
  assistenza_stradale: "Assistenza stradale",
  guidatore_aggiuntivo: "Guidatore aggiuntivo",
};

/** I componenti con valore monetario mostrano l'importo, gli altri "incluso". */
const monetarySpecTypes = new Set(["franchigia_danni", "franchigia_furto", "deposito"]);

export function isMonetarySpec(tipo: string) {
  return monetarySpecTypes.has(tipo);
}

/**
 * Pacchetti proponibili per una categoria veicolo: quelli specifici della
 * categoria vincono, i pacchetti globali (category_id null) fanno da base.
 */
export function pickInsurancePackages(
  packages: InsurancePackage[],
  categoryId: string | null | undefined,
): InsurancePackage[] {
  const active = packages.filter((p) => p.active);
  const specific = active.filter((p) => categoryId && p.category_id === categoryId);
  const global = active.filter((p) => p.category_id === null);
  const list = specific.length > 0 ? specific : global;
  return [...list].sort(
    (a, b) => a.sort_order - b.sort_order || Number(a.prezzo_giorno) - Number(b.prezzo_giorno),
  );
}

/** Valore effettivo di un componente dentro un pacchetto (override o default). */
export function specValueInPackage(
  spec: InsuranceSpec,
  link: InsurancePackageComponent | undefined,
): number {
  const override = link?.valore_override;
  return override === null || override === undefined ? Number(spec.valore_default) : Number(override);
}

export function insuranceCost(pkg: InsurancePackage | null | undefined, days: number): number {
  if (!pkg) return 0;
  return round2(Number(pkg.prezzo_giorno || 0) * Math.max(1, Math.round(days)));
}

/* ------------------------------------------------------------------ */
/* Prezzario danni                                                     */
/* ------------------------------------------------------------------ */

export type DamagePriceConfig = {
  id: string;
  category_id: string;
  component_id: string;
  severity_id: string;
  prezzo_min: number;
  prezzo_consigliato: number;
  prezzo_max: number;
};

/** Range configurato per categoria veicolo + componente + gravità. */
export function findDamagePrice(
  configs: DamagePriceConfig[],
  categoryId: string | null | undefined,
  componentId: string | null | undefined,
  severityId: string | null | undefined,
): DamagePriceConfig | null {
  if (!categoryId || !componentId || !severityId) return null;
  return (
    configs.find(
      (c) =>
        c.category_id === categoryId &&
        c.component_id === componentId &&
        c.severity_id === severityId,
    ) ?? null
  );
}

/** L'importo è dentro il range configurato? (fuori range non blocca, va motivato) */
export function isChargeInRange(config: DamagePriceConfig | null, amount: number): boolean {
  if (!config) return true;
  return amount >= Number(config.prezzo_min) && amount <= Number(config.prezzo_max);
}
