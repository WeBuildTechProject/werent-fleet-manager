/**
 * Revenue management assistito — logica pura, volutamente semplice e leggibile.
 *
 * Non è un modello previsionale: è una regola a soglie che un responsabile può
 * verificare a mano ("quanti veicoli sono impegnati nei prossimi giorni?").
 * L'occupazione è calcolata riusando `isVehicleAvailable`, la stessa funzione
 * che alimenta il calendario gestionale e la ricerca disponibilità pubblica.
 */

import { isVehicleAvailable, type MaintenanceBlock, type Reservation } from "@/lib/gestionale";

/** Impostazioni configurabili (chiavi in app_settings). */
export const REVENUE_SETTING_KEYS = {
  highThreshold: "revenue_soglia_alta_occupazione",
  increasePct: "revenue_incremento_perc",
  lowThreshold: "revenue_soglia_bassa_occupazione",
  decreasePct: "revenue_decremento_perc",
  horizonDays: "revenue_orizzonte_giorni",
} as const;

export type RevenueSettings = {
  highThreshold: number;
  increasePct: number;
  lowThreshold: number;
  decreasePct: number;
  horizonDays: number;
};

export const REVENUE_DEFAULTS: RevenueSettings = {
  highThreshold: 85,
  increasePct: 10,
  lowThreshold: 40,
  decreasePct: 10,
  horizonDays: 14,
};

/** Legge le soglie dalle coppie chiave/valore, con fallback ai default. */
export function readRevenueSettings(
  settings: { key: string; value: string }[] | undefined,
): RevenueSettings {
  const get = (key: string, fallback: number) => {
    const raw = (settings ?? []).find((s) => s.key === key)?.value;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  };
  return {
    highThreshold: get(REVENUE_SETTING_KEYS.highThreshold, REVENUE_DEFAULTS.highThreshold),
    increasePct: get(REVENUE_SETTING_KEYS.increasePct, REVENUE_DEFAULTS.increasePct),
    lowThreshold: get(REVENUE_SETTING_KEYS.lowThreshold, REVENUE_DEFAULTS.lowThreshold),
    decreasePct: get(REVENUE_SETTING_KEYS.decreasePct, REVENUE_DEFAULTS.decreasePct),
    horizonDays: Math.max(1, Math.round(get(REVENUE_SETTING_KEYS.horizonDays, REVENUE_DEFAULTS.horizonDays))),
  };
}

/** Elenco di N giorni ISO a partire da `start` incluso. */
export function horizonDates(start: string, days: number) {
  const out: string[] = [];
  const base = new Date(`${start}T00:00:00Z`);
  for (let i = 0; i < days; i++) {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() + i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export type DayOccupancy = { day: string; fleet: number; busy: number; pct: number };

export type OccupancyForecast = {
  categoryId: string;
  branchId: string | null;
  fleetSize: number;
  days: DayOccupancy[];
  /** Media dell'occupazione giornaliera sull'orizzonte considerato (%). */
  averagePct: number;
};

/**
 * Occupazione giorno per giorno: un veicolo è "impegnato" quando la logica di
 * disponibilità condivisa lo considera non prenotabile in quel giorno.
 */
export function computeOccupancy(input: {
  vehicleIds: string[];
  dates: string[];
  reservations: Reservation[];
  maintenanceBlocks?: MaintenanceBlock[];
}): { days: DayOccupancy[]; averagePct: number } {
  const fleet = input.vehicleIds.length;
  const days = input.dates.map((day) => {
    const busy = input.vehicleIds.filter(
      (id) => !isVehicleAvailable(id, day, day, input.reservations, input.maintenanceBlocks),
    ).length;
    return { day, fleet, busy, pct: fleet > 0 ? Math.round((busy / fleet) * 1000) / 10 : 0 };
  });
  const averagePct =
    days.length > 0 ? Math.round((days.reduce((s, d) => s + d.pct, 0) / days.length) * 10) / 10 : 0;
  return { days, averagePct };
}

export type RateSuggestion = {
  direction: "aumento" | "riduzione";
  /** Variazione suggerita in percentuale (positiva per l'aumento). */
  deltaPct: number;
  currentRate: number;
  suggestedRate: number;
};

/**
 * Regola di suggerimento: sopra la soglia alta si propone un aumento, sotto la
 * soglia bassa una riduzione, in mezzo la tariffa è considerata adeguata.
 */
export function suggestRate(
  averagePct: number,
  currentRate: number,
  settings: RevenueSettings,
): RateSuggestion | null {
  if (!Number.isFinite(currentRate) || currentRate <= 0) return null;
  const round2 = (v: number) => Math.round(v * 100) / 100;
  if (averagePct >= settings.highThreshold && settings.increasePct > 0) {
    return {
      direction: "aumento",
      deltaPct: settings.increasePct,
      currentRate,
      suggestedRate: round2(currentRate * (1 + settings.increasePct / 100)),
    };
  }
  if (averagePct <= settings.lowThreshold && settings.decreasePct > 0) {
    return {
      direction: "riduzione",
      deltaPct: -settings.decreasePct,
      currentRate,
      suggestedRate: round2(currentRate * (1 - settings.decreasePct / 100)),
    };
  }
  return null;
}
