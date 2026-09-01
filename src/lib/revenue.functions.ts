import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdminUser } from "@/lib/role-guards";
import type { MaintenanceBlock, Reservation } from "@/lib/gestionale";
import { pickRatePlan, type RatePlan } from "@/lib/pricing";
import {
  computeOccupancy,
  horizonDates,
  readRevenueSettings,
  suggestRate,
  type OccupancyForecast,
  type RateSuggestion,
} from "@/lib/revenue";

/**
 * Revenue management assistito: calcolo occupazione prevista e suggerimenti di
 * adeguamento tariffario. Nessuna tariffa viene mai modificata da qui in
 * automatico: `applyRateSuggestion` scrive solo su richiesta dell'operatore.
 */

const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * Capability `manage_pricing` (Lotto 8: solo admin/super_admin). Vale anche in
 * lettura: l'occupazione prevista e i listini attivi non sono dati che ogni
 * utente autenticato deve poter vedere.
 */
async function assertManagePricing(supabase: { from: (t: string) => any }, userId: string) {
  await assertAdminUser(supabase, userId, "Accesso non consentito: serve la gestione dei listini.");
}

/** Dati condivisi per il calcolo: flotta, prenotazioni impegnative, fermi. */
async function loadOccupancyInputs(
  supabase: { from: (t: string) => any },
  fromDay: string,
  toDay: string,
) {
  const [vehicles, reservations, maintenance] = await Promise.all([
    supabase.from("vehicles").select("id, category_id, branch_id, status"),
    supabase
      .from("reservations")
      .select("id, vehicle_id, branch_id, date_from, date_to, status")
      // Solo impegni reali: confermate e in corso (bozze e annullate non occupano).
      .in("status", ["confermata", "in_corso"])
      .lte("date_from", toDay)
      .gte("date_to", fromDay),
    supabase.from("maintenance_requests").select("vehicle_id, stato, fermo_dal, fermo_al"),
  ]);
  return {
    vehicles: (vehicles.data ?? []) as {
      id: string;
      category_id: string | null;
      branch_id: string | null;
      status: string;
    }[],
    reservations: (reservations.data ?? []) as unknown as Reservation[],
    maintenance: (maintenance.data ?? []) as MaintenanceBlock[],
  };
}

export const computeOccupancyForecast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { categoryId: string; branchId?: string | null; days?: number }) =>
    z
      .object({
        categoryId: z.string().uuid(),
        branchId: z.string().uuid().optional().nullable(),
        days: z.number().int().min(1).max(90).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<OccupancyForecast> => {
    await assertManagePricing(context.supabase as never, context.userId);
    const { data: settingsRows } = await context.supabase
      .from("app_settings")
      .select("key, value");
    const settings = readRevenueSettings(settingsRows ?? []);
    const days = data.days ?? settings.horizonDays;
    const dates = horizonDates(todayIso(), days);
    const inputs = await loadOccupancyInputs(
      context.supabase as never,
      dates[0]!,
      dates[dates.length - 1]!,
    );

    const vehicleIds = inputs.vehicles
      .filter(
        (v) =>
          v.category_id === data.categoryId &&
          (!data.branchId || v.branch_id === data.branchId) &&
          v.status !== "fuori_servizio",
      )
      .map((v) => v.id);

    const { days: perDay, averagePct } = computeOccupancy({
      vehicleIds,
      dates,
      reservations: inputs.reservations,
      maintenanceBlocks: inputs.maintenance,
    });

    return {
      categoryId: data.categoryId,
      branchId: data.branchId ?? null,
      fleetSize: vehicleIds.length,
      days: perDay,
      averagePct,
    };
  });

export type RevenueRow = {
  categoryId: string;
  categoryLabel: string;
  branchId: string;
  branchName: string;
  fleetSize: number;
  averagePct: number;
  peakPct: number;
  planId: string | null;
  planName: string | null;
  planIsGlobal: boolean;
  /** Tariffa giornaliera attualmente in vigore (anche senza suggerimento). */
  currentDailyRate: number | null;
  suggestion: RateSuggestion | null;
};

/** Panoramica completa: una riga per ogni categoria × sede attiva. */
export const getRevenueOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertManagePricing(context.supabase as never, context.userId);
    const [{ data: settingsRows }, { data: categories }, { data: branches }, { data: plans }] =
      await Promise.all([
        context.supabase.from("app_settings").select("key, value"),
        context.supabase.from("vehicle_categories").select("id, label_it, active").eq("active", true),
        context.supabase.from("branches").select("id, name, active").eq("active", true),
        context.supabase.from("rate_plans").select("*"),
      ]);

    const settings = readRevenueSettings(settingsRows ?? []);
    const dates = horizonDates(todayIso(), settings.horizonDays);
    const inputs = await loadOccupancyInputs(
      context.supabase as never,
      dates[0]!,
      dates[dates.length - 1]!,
    );

    const rows: RevenueRow[] = [];
    for (const category of categories ?? []) {
      for (const branch of branches ?? []) {
        const vehicleIds = inputs.vehicles
          .filter(
            (v) =>
              v.category_id === category.id &&
              v.branch_id === branch.id &&
              v.status !== "fuori_servizio",
          )
          .map((v) => v.id);
        // Senza veicoli di quella categoria in sede non c'è nulla da suggerire.
        if (vehicleIds.length === 0) continue;

        const { days: perDay, averagePct } = computeOccupancy({
          vehicleIds,
          dates,
          reservations: inputs.reservations,
          maintenanceBlocks: inputs.maintenance,
        });
        const plan = pickRatePlan(
          ((plans ?? []) as unknown as RatePlan[]),
          category.id,
          branch.id,
          dates[0]!,
        );

        rows.push({
          categoryId: category.id,
          categoryLabel: category.label_it,
          branchId: branch.id,
          branchName: branch.name,
          fleetSize: vehicleIds.length,
          averagePct,
          peakPct: perDay.reduce((max, d) => Math.max(max, d.pct), 0),
          planId: plan?.id ?? null,
          planName: plan?.name ?? null,
          planIsGlobal: plan ? plan.branch_id === null : false,
          currentDailyRate: plan ? Number(plan.daily_rate) : null,
          suggestion: plan ? suggestRate(averagePct, Number(plan.daily_rate), settings) : null,
        });
      }
    }

    rows.sort((a, b) => b.averagePct - a.averagePct);
    return { horizonDays: settings.horizonDays, from: dates[0]!, settings, rows };
  });

/**
 * Applica un suggerimento: richiede un click esplicito dell'operatore e la
 * capability di catalogo (admin/super_admin). Traccia valore prima/dopo in
 * audit_log.
 */
export const applyRateSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { planId: string; newDailyRate: number; reason?: string }) =>
    z
      .object({
        planId: z.string().uuid(),
        newDailyRate: z.number().positive().max(100000),
        reason: z.string().trim().max(300).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdminUser(
      context.supabase,
      context.userId,
      "Solo un amministratore può modificare i listini attivi.",
    );

    const { data: plan, error: readError } = await context.supabase
      .from("rate_plans")
      .select("id, name, daily_rate, category_id, branch_id")
      .eq("id", data.planId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!plan) throw new Error("Listino non trovato.");

    const previous = Number(plan.daily_rate);
    const next = Math.round(data.newDailyRate * 100) / 100;

    const { error } = await context.supabase
      .from("rate_plans")
      .update({ daily_rate: next })
      .eq("id", data.planId);
    if (error) throw new Error(error.message);

    await context.supabase.from("audit_log").insert({
      user_id: context.userId,
      action: "revenue_apply_suggestion",
      entity: "rate_plans",
      entity_id: data.planId,
      payload: {
        plan_name: plan.name,
        daily_rate_before: previous,
        daily_rate_after: next,
        motivo: data.reason ?? null,
      },
    });

    return { planId: data.planId, previous, next };
  });
