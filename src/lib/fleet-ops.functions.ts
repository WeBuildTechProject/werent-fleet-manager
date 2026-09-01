import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  isVehicleAvailable,
  type MaintenanceBlock,
  type Reservation,
} from "@/lib/gestionale";
import { daysOf } from "@/lib/booking.helpers";
import {
  computeReturnCharges,
  pickRatePlan,
  resolveKmPolicy,
  type RatePlan,
} from "@/lib/pricing";

/**
 * Operatività di flotta: consegna (check-out) e rientro (check-in) del veicolo.
 * Tutti i controlli di stato e i calcoli stanno qui: le schermate mostrano solo
 * l'anteprima. Il permesso effettivo è garantito dalle RLS (can_operate).
 */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/**
 * Emissione del verbale + invio email. Un errore di generazione o di consegna
 * non deve annullare l'operazione di flotta già registrata: viene riportato
 * all'operatore, che può rigenerare il documento dal dettaglio prenotazione.
 */
async function generateVerbaleSafely(
  reservationId: string,
  kind: "consegna" | "rientro",
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { generateAndDeliverVerbale } = await import("@/lib/verbali.server");
    const result = await generateAndDeliverVerbale(reservationId, kind);
    return result.ok ? { ok: true } : { ok: false, error: result.reason ?? "generazione_fallita" };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

const damageSchema = z.object({
  view: z.string().max(20),
  pos_x: z.number().min(0).max(100),
  pos_y: z.number().min(0).max(100),
  damage_type: z.string().max(40),
  severity: z.string().max(20),
  /** Tassonomia danni: riferimenti al dizionario (facoltativi sui casi legacy). */
  component_id: z.string().uuid().optional().nullable(),
  severity_id: z.string().uuid().optional().nullable(),
  /** Motivazione obbligatoria quando l'importo esce dal prezzario. */
  charge_note: z.string().trim().max(300).optional().nullable(),
  description: z.string().trim().max(400).optional().nullable(),
  charge_amount: z.number().min(0).max(100000).default(0),
  out_of_service: z.boolean().default(false),
});

/**
 * Firma del cliente: obbligatoria e acquisita sul dispositivo in quel momento
 * (data URL PNG del canvas). Nessun percorso alternativo per lo staff.
 */
const signatureRequired = z
  .string()
  .min(500)
  .max(500_000)
  .refine((v) => v.startsWith("data:image/png;base64,"), {
    message: "Firma del cliente non acquisita.",
  });

/** Conferma esplicita dei dati, distinta dalla firma: deve valere `true`. */
const confirmRequired = z.literal(true, {
  message: "Conferma i dati rilevati prima di procedere.",
});

const checkoutSchema = z.object({
  reservationId: z.string().uuid(),
  km: z.number().int().min(0).max(3_000_000),
  fuelLiters: z.number().min(0).max(500),
  equipment: z.array(z.string().min(1).max(80)).min(1).max(30),
  signatureDataUrl: signatureRequired,
  dataConfirmed: confirmRequired,
  damages: z.array(damageSchema).max(40).default([]),
});

export const checkoutVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => checkoutSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: reservation, error } = await supabase
      .from("reservations")
      .select("id, code, status, vehicle_id, date_from, date_to")
      .eq("id", data.reservationId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!reservation) throw new Error("Prenotazione non trovata.");
    if (reservation.status !== "confermata")
      throw new Error("La consegna è possibile solo su una prenotazione confermata.");
    if (!reservation.vehicle_id) throw new Error("Assegna un veicolo prima della consegna.");

    // Il veicolo non deve essere impegnato da un altro contratto nello stesso periodo.
    const { data: others } = await supabase
      .from("reservations")
      .select("id, vehicle_id, date_from, date_to, status")
      .eq("vehicle_id", reservation.vehicle_id)
      .neq("id", reservation.id);
    const { data: fermi } = await supabase
      .from("maintenance_requests")
      .select("vehicle_id, stato, fermo_dal, fermo_al")
      .eq("vehicle_id", reservation.vehicle_id)
      .neq("stato", "chiusa");
    if (
      !isVehicleAvailable(
        reservation.vehicle_id,
        reservation.date_from,
        reservation.date_to,
        (others ?? []) as unknown as Reservation[],
        (fermi ?? []) as unknown as MaintenanceBlock[],
      )
    ) {
      throw new Error("Il veicolo risulta già impegnato in un altro contratto nello stesso periodo.");
    }

    const now = new Date().toISOString();

    const { error: uErr } = await supabase
      .from("reservations")
      .update({
        status: "in_corso",
        checkout_at: now,
        checkout_km: data.km,
        checkout_fuel_liters: data.fuelLiters,
        checkout_equipment: data.equipment,
        signature_data_url: data.signatureDataUrl,
        signed_at: now,
        // Prova distinta dalla firma: conferma esplicita dei dati rilevati.
        checkout_data_confirmed_at: now,
      })
      .eq("id", reservation.id);
    if (uErr) throw new Error(uErr.message);

    const { error: vErr } = await supabase
      .from("vehicles")
      .update({ status: "noleggiato", mileage: data.km })
      .eq("id", reservation.vehicle_id);
    if (vErr) throw new Error(vErr.message);

    if (data.damages.length > 0) {
      const { error: dErr } = await supabase.from("vehicle_damages").insert(
        data.damages.map((d) => ({
          vehicle_id: reservation.vehicle_id!,
          reservation_id: reservation.id,
          view: d.view,
          pos_x: d.pos_x,
          pos_y: d.pos_y,
          damage_type: d.damage_type,
          severity: d.severity,
          component_id: d.component_id ?? null,
          severity_id: d.severity_id ?? null,
          charge_note: d.charge_note ?? null,
          description: d.description ?? null,
          status: "aperto",
          phase: "preesistente",
          charge_amount: 0,
          reported_by: userId,
        })),
      );
      if (dErr) throw new Error(dErr.message);
    }

    await supabase.from("audit_log").insert({
      user_id: userId,
      action: "checkout",
      entity: "reservation",
      entity_id: reservation.id,
      payload: { km: data.km, fuel_liters: data.fuelLiters },
    });

    // Verbale firmato: generato solo ora, con compilazione + conferma + firma
    // tutte verificate e già salvate sulla prenotazione.
    const verbale = await generateVerbaleSafely(reservation.id, "consegna");

    return { ok: true, code: reservation.code, verbale };
  });

const checkinSchema = z.object({
  reservationId: z.string().uuid(),
  km: z.number().int().min(0).max(3_000_000),
  fuelLiters: z.number().min(0).max(500),
  signatureDataUrl: signatureRequired,
  dataConfirmed: confirmRequired,
  equipment: z.array(z.string().min(1).max(80)).min(1).max(30),
  damages: z.array(damageSchema).max(40).default([]),
});

export const checkinVehicle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => checkinSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: reservation, error } = await supabase
      .from("reservations")
      .select(
        "id, code, status, vehicle_id, branch_id, date_from, date_to, total_amount, checkout_km, checkout_fuel_liters, extra_km_amount, fuel_penalty_amount, damage_charge_amount",
      )
      .eq("id", data.reservationId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!reservation) throw new Error("Prenotazione non trovata.");
    if (reservation.status !== "in_corso")
      throw new Error("Il rientro è possibile solo su un contratto in corso.");
    const kmOut = Number(reservation.checkout_km ?? 0);
    if (data.km < kmOut)
      throw new Error(`Il chilometraggio di rientro non può essere inferiore a ${kmOut} km.`);

    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("id, category_id")
      .eq("id", reservation.vehicle_id ?? "")
      .maybeSingle();

    const [{ data: plans }, { data: category }] = await Promise.all([
      supabase.from("rate_plans").select("*").eq("active", true),
      vehicle?.category_id
        ? supabase
            .from("vehicle_categories")
            .select("included_km_per_day, extra_km_rate, fuel_price_per_liter")
            .eq("id", vehicle.category_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const plan = pickRatePlan(
      (plans ?? []) as unknown as RatePlan[],
      vehicle?.category_id ?? null,
      reservation.branch_id,
      reservation.date_from,
    );
    const policy = resolveKmPolicy(plan, category ?? null);

    const damageCharge = data.damages.reduce((sum, d) => sum + Number(d.charge_amount || 0), 0);
    const charges = computeReturnCharges({
      days: daysOf(reservation.date_from, reservation.date_to),
      kmOut,
      kmIn: data.km,
      includedKmPerDay: policy.includedKmPerDay,
      extraKmRate: policy.extraKmRate,
      fuelOut: Number(reservation.checkout_fuel_liters ?? 0),
      fuelIn: data.fuelLiters,
      fuelPricePerLiter: Number(category?.fuel_price_per_liter ?? 0),
      damageCharge,
    });

    // Gli addebiti di rientro entrano nel totale fatturabile della prenotazione:
    // nessun secondo importo scollegato dalla fattura.
    const previousCharges =
      Number(reservation.extra_km_amount ?? 0) +
      Number(reservation.fuel_penalty_amount ?? 0) +
      Number(reservation.damage_charge_amount ?? 0);
    const newTotal =
      Math.round((Number(reservation.total_amount) - previousCharges + charges.total) * 100) / 100;

    const now = new Date().toISOString();
    const { error: uErr } = await supabase
      .from("reservations")
      .update({
        status: "chiusa",
        checkin_at: now,
        checkin_km: data.km,
        checkin_fuel_liters: data.fuelLiters,
        checkin_equipment: data.equipment,
        checkin_signature_data_url: data.signatureDataUrl,
        checkin_signed_at: now,
        checkin_data_confirmed_at: now,
        extra_km_amount: charges.extraKmAmount,
        fuel_penalty_amount: charges.fuelPenalty,
        damage_charge_amount: charges.damageCharge,
        total_amount: newTotal,
      })
      .eq("id", reservation.id);
    if (uErr) throw new Error(uErr.message);

    if (data.damages.length > 0 && reservation.vehicle_id) {
      const { error: dErr } = await supabase.from("vehicle_damages").insert(
        data.damages.map((d) => ({
          vehicle_id: reservation.vehicle_id!,
          reservation_id: reservation.id,
          view: d.view,
          pos_x: d.pos_x,
          pos_y: d.pos_y,
          damage_type: d.damage_type,
          severity: d.severity,
          component_id: d.component_id ?? null,
          severity_id: d.severity_id ?? null,
          charge_note: d.charge_note ?? null,
          description: d.description ?? null,
          status: "aperto",
          phase: "rientro",
          charge_amount: d.charge_amount,
          out_of_service: d.out_of_service,
          reported_by: userId,
        })),
      );
      if (dErr) throw new Error(dErr.message);
    }

    const needsService = data.damages.some((d) => d.out_of_service);
    if (reservation.vehicle_id) {
      const { error: vErr } = await supabase
        .from("vehicles")
        .update({ status: needsService ? "manutenzione" : "disponibile", mileage: data.km })
        .eq("id", reservation.vehicle_id);
      if (vErr) throw new Error(vErr.message);
    }

    await supabase.from("audit_log").insert({
      user_id: userId,
      action: "checkin",
      entity: "reservation",
      entity_id: reservation.id,
      payload: { km: data.km, charges },
    });

    const verbale = await generateVerbaleSafely(reservation.id, "rientro");

    return { ok: true, code: reservation.code, charges, total: newTotal, needsService, verbale };
  });

const expirationSchema = z.object({
  expirationId: z.string().uuid(),
  dataEsecuzione: isoDate,
  next: z
    .object({
      data_scadenza: isoDate.optional().nullable(),
      km_scadenza: z.number().int().min(0).max(3_000_000).optional().nullable(),
      priorita: z.enum(["alta", "media", "bassa"]).default("media"),
      note: z.string().trim().max(400).optional().nullable(),
    })
    .refine((n) => Boolean(n.data_scadenza) || typeof n.km_scadenza === "number", {
      message: "Indica la data o i km della prossima scadenza.",
    }),
});

export const completeExpiration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => expirationSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: current, error } = await supabase
      .from("vehicle_expirations")
      .select("id, vehicle_id, tipo, eseguita")
      .eq("id", data.expirationId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!current) throw new Error("Scadenza non trovata.");
    if (current.eseguita) throw new Error("Scadenza già marcata come eseguita.");

    const { error: uErr } = await supabase
      .from("vehicle_expirations")
      .update({ eseguita: true, data_esecuzione: data.dataEsecuzione })
      .eq("id", current.id);
    if (uErr) throw new Error(uErr.message);

    // La scadenza successiva viene creata automaticamente: la flotta non resta
    // senza il prossimo controllo pianificato.
    const { error: iErr } = await supabase.from("vehicle_expirations").insert({
      vehicle_id: current.vehicle_id,
      tipo: current.tipo,
      data_scadenza: data.next.data_scadenza ?? null,
      km_scadenza: data.next.km_scadenza ?? null,
      priorita: data.next.priorita,
      note: data.next.note ?? null,
    });
    if (iErr) throw new Error(iErr.message);

    await supabase.from("audit_log").insert({
      user_id: userId,
      action: "complete",
      entity: "vehicle_expiration",
      entity_id: current.id,
    });

    return { ok: true };
  });
