/**
 * Business intelligence: aggregazioni derivate dalle tabelle operative.
 * Nessun data warehouse, nessun ETL: tutte le funzioni qui sotto sono pure e
 * lavorano sugli stessi dati già caricati dal gestionale.
 *
 * Fonte di verità unica sui ricavi: `reservationRevenue` / `revenueBreakdown`,
 * usate sia da questa sezione sia dalla scheda di redditività per veicolo.
 */
import type { Invoice, Reservation, Vehicle, VehicleCategory } from "@/lib/gestionale";
import { rangesOverlap } from "@/lib/gestionale";
import type { MaintenanceRequest } from "@/lib/maintenance";

export const iso = (d: Date) => d.toISOString().slice(0, 10);

export function eachDay(from: string, to: string) {
  const days: string[] = [];
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  for (let d = start; d <= end; d = new Date(+d + 86_400_000)) days.push(iso(d));
  return days;
}

export function monthKey(day: string) {
  return day.slice(0, 7);
}

export function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("it-IT", {
    month: "short",
    year: "2-digit",
  });
}

/** Preset di periodo, coerenti con quelli di vehicle-profitability. */
export function periodPreset(preset: "mese" | "trimestre" | "anno") {
  const now = new Date();
  const to = iso(now);
  if (preset === "mese") return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to };
  if (preset === "trimestre") {
    const q = Math.floor(now.getMonth() / 3) * 3;
    return { from: iso(new Date(now.getFullYear(), q, 1)), to };
  }
  return { from: iso(new Date(now.getFullYear(), 0, 1)), to };
}

/* ------------------------------------------------------------------ */
/* Ricavi                                                              */
/* ------------------------------------------------------------------ */

export type RevenueBreakdown = {
  /** Noleggio puro: totale contratto al netto di accessori e assicurazione. */
  noleggio: number;
  /** Extra/accessori acquistati in fase di prenotazione. */
  accessori: number;
  /** Pacchetto assicurativo (Lotto 6). */
  assicurazioni: number;
  /** Addebiti di rientro: km extra, carburante mancante, danni (Lotto 5). */
  addebiti: number;
  totale: number;
};

const num = (v: unknown) => Number(v ?? 0) || 0;

/**
 * Ricavi di una prenotazione. Se esiste una fattura non annullata è lei a fare
 * fede sul valore del contratto; gli addebiti di rientro si sommano sempre
 * perché vengono incassati a parte.
 */
export function revenueBreakdown(
  r: Reservation,
  invoice?: { totale: number; stato: string } | null,
): RevenueBreakdown {
  const contratto = invoice && invoice.stato !== "annullata" ? num(invoice.totale) : num(r.total_amount);
  const base = num(r.total_amount);
  // Se la fattura differisce dal contratto, le componenti si riscalano in
  // proporzione: la somma resta uguale al totale mostrato.
  const factor = base > 0 ? contratto / base : 1;
  const accessori = num(r.extras_amount) * factor;
  const assicurazioni = num(r.insurance_amount) * factor;
  const addebiti = num(r.extra_km_amount) + num(r.fuel_penalty_amount) + num(r.damage_charge_amount);
  return {
    noleggio: Math.max(0, contratto - accessori - assicurazioni),
    accessori,
    assicurazioni,
    addebiti,
    totale: contratto + addebiti,
  };
}

export function invoiceIndex(invoices: Invoice[] | undefined) {
  const map = new Map<string, Invoice>();
  for (const i of invoices ?? []) if (i.stato !== "annullata") map.set(i.reservation_id, i);
  return map;
}

export function reservationRevenue(r: Reservation, invoices: Map<string, Invoice>) {
  return revenueBreakdown(r, invoices.get(r.id) ?? null).totale;
}

/* ------------------------------------------------------------------ */
/* Filtri comuni                                                       */
/* ------------------------------------------------------------------ */

export type AnalyticsFilters = {
  from: string;
  to: string;
  /** "all" oppure id sede. */
  branchId: string;
  /** "all" oppure id categoria. */
  categoryId: string;
};

export function filterVehicles(vehicles: Vehicle[], f: AnalyticsFilters) {
  return vehicles.filter(
    (v) =>
      (f.branchId === "all" || v.branch_id === f.branchId) &&
      (f.categoryId === "all" || v.category_id === f.categoryId),
  );
}

/** Prenotazioni attive nel periodo, filtrate per sede e categoria del veicolo. */
export function filterReservations(
  reservations: Reservation[],
  vehicles: Vehicle[],
  f: AnalyticsFilters,
) {
  const byId = new Map(vehicles.map((v) => [v.id, v]));
  return reservations.filter((r) => {
    if (r.status === "annullata") return false;
    if (!rangesOverlap(r.date_from, r.date_to, f.from, f.to)) return false;
    const vehicle = r.vehicle_id ? byId.get(r.vehicle_id) : undefined;
    if (f.branchId !== "all" && r.branch_id !== f.branchId && vehicle?.branch_id !== f.branchId) {
      return false;
    }
    if (f.categoryId !== "all" && vehicle?.category_id !== f.categoryId) return false;
    return true;
  });
}

/* ------------------------------------------------------------------ */
/* 1. Tasso di utilizzo flotta                                         */
/* ------------------------------------------------------------------ */

export type UtilizationRow = {
  key: string;
  label: string;
  /** Giorni-veicolo noleggiati. */
  rented: number;
  /** Giorni-veicolo disponibili (fermi manutenzione esclusi). */
  available: number;
  /** Giorni-veicolo di fermo tecnico, esclusi dal denominatore. */
  maintenance: number;
  utilization: number;
};

type Grouping = "categoria" | "sede";

function maintenanceDays(requests: MaintenanceRequest[], vehicleId: string, days: string[]) {
  const blocks = requests.filter(
    (m) => m.vehicle_id === vehicleId && m.stato !== "chiusa" && m.fermo_dal && m.fermo_al,
  );
  return new Set(
    days.filter((d) => blocks.some((b) => rangesOverlap(b.fermo_dal!, b.fermo_al!, d, d))),
  );
}

export function utilizationBy(
  grouping: Grouping,
  vehicles: Vehicle[],
  reservations: Reservation[],
  requests: MaintenanceRequest[],
  categories: VehicleCategory[],
  branches: { id: string; name: string }[],
  f: AnalyticsFilters,
): UtilizationRow[] {
  const days = eachDay(f.from, f.to);
  const fleet = filterVehicles(vehicles, f);
  const active = reservations.filter((r) => r.status !== "annullata");
  const buckets = new Map<string, UtilizationRow>();

  const labelFor = (v: Vehicle) => {
    if (grouping === "categoria") {
      const cat = categories.find((c) => c.id === v.category_id);
      return { key: v.category_id ?? "senza-categoria", label: cat?.label_it ?? v.category ?? "Senza categoria" };
    }
    const branch = branches.find((b) => b.id === v.branch_id);
    return { key: v.branch_id ?? "senza-sede", label: branch?.name ?? "Senza sede" };
  };

  for (const v of fleet) {
    const { key, label } = labelFor(v);
    const row =
      buckets.get(key) ?? { key, label, rented: 0, available: 0, maintenance: 0, utilization: 0 };
    const stopped = maintenanceDays(requests, v.id, days);
    const booked = active.filter((r) => r.vehicle_id === v.id);
    for (const day of days) {
      if (stopped.has(day)) {
        row.maintenance += 1;
        continue;
      }
      row.available += 1;
      if (booked.some((r) => rangesOverlap(r.date_from, r.date_to, day, day))) row.rented += 1;
    }
    buckets.set(key, row);
  }

  return [...buckets.values()]
    .map((r) => ({ ...r, utilization: r.available ? Math.round((r.rented / r.available) * 1000) / 10 : 0 }))
    .sort((a, b) => b.utilization - a.utilization);
}

/* ------------------------------------------------------------------ */
/* 2. Trend ricavi                                                     */
/* ------------------------------------------------------------------ */

export type RevenueTrendRow = {
  month: string;
  label: string;
  noleggio: number;
  accessori: number;
  assicurazioni: number;
  addebiti: number;
  totale: number;
  contratti: number;
};

export function revenueTrend(
  reservations: Reservation[],
  invoices: Map<string, Invoice>,
): RevenueTrendRow[] {
  const buckets = new Map<string, RevenueTrendRow>();
  for (const r of reservations) {
    const key = monthKey(r.date_from);
    const row =
      buckets.get(key) ??
      {
        month: key,
        label: monthLabel(key),
        noleggio: 0,
        accessori: 0,
        assicurazioni: 0,
        addebiti: 0,
        totale: 0,
        contratti: 0,
      };
    const b = revenueBreakdown(r, invoices.get(r.id) ?? null);
    row.noleggio += b.noleggio;
    row.accessori += b.accessori;
    row.assicurazioni += b.assicurazioni;
    row.addebiti += b.addebiti;
    row.totale += b.totale;
    row.contratti += 1;
    buckets.set(key, row);
  }
  const round = (n: number) => Math.round(n * 100) / 100;
  return [...buckets.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((r) => ({
      ...r,
      noleggio: round(r.noleggio),
      accessori: round(r.accessori),
      assicurazioni: round(r.assicurazioni),
      addebiti: round(r.addebiti),
      totale: round(r.totale),
    }));
}

/* ------------------------------------------------------------------ */
/* 3. Clienti top                                                      */
/* ------------------------------------------------------------------ */

export type TopCustomerRow = {
  key: string;
  name: string;
  email: string;
  noleggi: number;
  fatturato: number;
};

export function topCustomers(
  reservations: Reservation[],
  invoices: Map<string, Invoice>,
  limit = 10,
): TopCustomerRow[] {
  const buckets = new Map<string, TopCustomerRow>();
  for (const r of reservations) {
    const key = r.customer_id ?? r.customer_email.toLowerCase();
    const row =
      buckets.get(key) ??
      { key, name: r.customer_name, email: r.customer_email, noleggi: 0, fatturato: 0 };
    row.noleggi += 1;
    row.fatturato += reservationRevenue(r, invoices);
    buckets.set(key, row);
  }
  return [...buckets.values()]
    .map((r) => ({ ...r, fatturato: Math.round(r.fatturato * 100) / 100 }))
    .sort((a, b) => b.fatturato - a.fatturato)
    .slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* 4. Andamento addebiti extra                                         */
/* ------------------------------------------------------------------ */

export type ExtraChargesRow = {
  month: string;
  label: string;
  rientri: number;
  kmExtra: number;
  carburante: number;
  danni: number;
  quotaKmExtra: number;
  quotaCarburante: number;
  quotaDanni: number;
  importoKmExtra: number;
  importoCarburante: number;
  importoDanni: number;
};

/** Solo prenotazioni con rientro registrato: prima del check-in non ci sono addebiti. */
export function extraChargesTrend(reservations: Reservation[]): ExtraChargesRow[] {
  const buckets = new Map<string, ExtraChargesRow>();
  for (const r of reservations) {
    if (!r.checkin_at) continue;
    const key = monthKey(r.checkin_at.slice(0, 10));
    const row =
      buckets.get(key) ??
      {
        month: key,
        label: monthLabel(key),
        rientri: 0,
        kmExtra: 0,
        carburante: 0,
        danni: 0,
        quotaKmExtra: 0,
        quotaCarburante: 0,
        quotaDanni: 0,
        importoKmExtra: 0,
        importoCarburante: 0,
        importoDanni: 0,
      };
    row.rientri += 1;
    if (num(r.extra_km_amount) > 0) row.kmExtra += 1;
    if (num(r.fuel_penalty_amount) > 0) row.carburante += 1;
    if (num(r.damage_charge_amount) > 0) row.danni += 1;
    row.importoKmExtra += num(r.extra_km_amount);
    row.importoCarburante += num(r.fuel_penalty_amount);
    row.importoDanni += num(r.damage_charge_amount);
    buckets.set(key, row);
  }
  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 0);
  return [...buckets.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((r) => ({
      ...r,
      quotaKmExtra: pct(r.kmExtra, r.rientri),
      quotaCarburante: pct(r.carburante, r.rientri),
      quotaDanni: pct(r.danni, r.rientri),
      importoKmExtra: Math.round(r.importoKmExtra * 100) / 100,
      importoCarburante: Math.round(r.importoCarburante * 100) / 100,
      importoDanni: Math.round(r.importoDanni * 100) / 100,
    }));
}

/* ------------------------------------------------------------------ */
/* 5. Occupazione per sede (heatmap giorno × sede)                     */
/* ------------------------------------------------------------------ */

export type OccupancyGrid = {
  days: string[];
  rows: {
    branchId: string;
    branchName: string;
    fleet: number;
    cells: { day: string; rented: number; available: number; occupancy: number }[];
    average: number;
  }[];
};

export function occupancyByBranch(
  vehicles: Vehicle[],
  reservations: Reservation[],
  requests: MaintenanceRequest[],
  branches: { id: string; name: string }[],
  f: AnalyticsFilters,
): OccupancyGrid {
  const days = eachDay(f.from, f.to);
  const fleet = filterVehicles(vehicles, f);
  const active = reservations.filter((r) => r.status !== "annullata");
  const groups = new Map<string, Vehicle[]>();
  for (const v of fleet) {
    const key = v.branch_id ?? "senza-sede";
    groups.set(key, [...(groups.get(key) ?? []), v]);
  }

  const rows = [...groups.entries()].map(([branchId, list]) => {
    const stopped = new Map(list.map((v) => [v.id, maintenanceDays(requests, v.id, days)]));
    const cells = days.map((day) => {
      let rented = 0;
      let available = 0;
      for (const v of list) {
        if (stopped.get(v.id)?.has(day)) continue;
        available += 1;
        if (active.some((r) => r.vehicle_id === v.id && rangesOverlap(r.date_from, r.date_to, day, day))) {
          rented += 1;
        }
      }
      return {
        day,
        rented,
        available,
        occupancy: available ? Math.round((rented / available) * 1000) / 10 : 0,
      };
    });
    const withFleet = cells.filter((c) => c.available > 0);
    const average = withFleet.length
      ? Math.round((withFleet.reduce((s, c) => s + c.occupancy, 0) / withFleet.length) * 10) / 10
      : 0;
    return {
      branchId,
      branchName: branches.find((b) => b.id === branchId)?.name ?? "Senza sede",
      fleet: list.length,
      cells,
      average,
    };
  });

  return { days, rows: rows.sort((a, b) => a.branchName.localeCompare(b.branchName)) };
}

/* ------------------------------------------------------------------ */
/* Export CSV dei dati aggregati                                       */
/* ------------------------------------------------------------------ */

function cell(value: string | number) {
  const s = String(value ?? "");
  return /[";\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

const dec = (n: number) => Number(n).toFixed(2).replace(".", ",");

/** CSV con separatore ";" e BOM: apribile direttamente in Excel italiano. */
export function toCsv(headers: string[], rows: (string | number)[][]) {
  const lines = [headers.map(cell).join(";")];
  for (const r of rows) lines.push(r.map(cell).join(";"));
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function utilizationCsv(rows: UtilizationRow[], grouping: Grouping) {
  return toCsv(
    [grouping === "categoria" ? "Categoria" : "Sede", "Giorni noleggiati", "Giorni disponibili", "Giorni fermo tecnico", "Utilizzo %"],
    rows.map((r) => [r.label, r.rented, r.available, r.maintenance, dec(r.utilization)]),
  );
}

export function revenueTrendCsv(rows: RevenueTrendRow[]) {
  return toCsv(
    ["Mese", "Contratti", "Noleggio", "Accessori", "Assicurazioni", "Addebiti rientro", "Totale"],
    rows.map((r) => [
      r.month,
      r.contratti,
      dec(r.noleggio),
      dec(r.accessori),
      dec(r.assicurazioni),
      dec(r.addebiti),
      dec(r.totale),
    ]),
  );
}

export function topCustomersCsv(rows: TopCustomerRow[]) {
  return toCsv(
    ["Cliente", "Email", "Noleggi", "Fatturato"],
    rows.map((r) => [r.name, r.email, r.noleggi, dec(r.fatturato)]),
  );
}

export function extraChargesCsv(rows: ExtraChargesRow[]) {
  return toCsv(
    [
      "Mese",
      "Rientri",
      "Con km extra",
      "Quota km extra %",
      "Importo km extra",
      "Con carburante mancante",
      "Quota carburante %",
      "Importo carburante",
      "Con danni",
      "Quota danni %",
      "Importo danni",
    ],
    rows.map((r) => [
      r.month,
      r.rientri,
      r.kmExtra,
      dec(r.quotaKmExtra),
      dec(r.importoKmExtra),
      r.carburante,
      dec(r.quotaCarburante),
      dec(r.importoCarburante),
      r.danni,
      dec(r.quotaDanni),
      dec(r.importoDanni),
    ]),
  );
}

export function occupancyCsv(grid: OccupancyGrid) {
  const rows: (string | number)[][] = [];
  for (const row of grid.rows) {
    for (const c of row.cells) {
      rows.push([row.branchName, c.day, c.rented, c.available, dec(c.occupancy)]);
    }
  }
  return toCsv(["Sede", "Giorno", "Veicoli noleggiati", "Veicoli disponibili", "Occupazione %"], rows);
}

export function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
