import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  isVehicleAvailable,
  type MaintenanceBlock,
  type Reservation,
} from "@/lib/gestionale";
import { daysOf, resolveBranchId } from "@/lib/booking.helpers";
import { DOCUMENT_TYPES } from "@/lib/documents";
import { attachReservationDocuments } from "@/lib/documents.functions";
import { loadLoyaltyStatus, readLoyaltyStacking } from "@/lib/loyalty";
import {
  computePrice,
  frozenUnitPrice,
  isCouponValid,
  pickRatePlan,
  pickInsurancePackages,
  type Coupon,
  type Extra,
  type InsurancePackage,
  type RatePlan,
} from "@/lib/pricing";

/**
 * Motore di prenotazione nativo (nessun fornitore esterno).
 * Le tabelle flotta/prenotazioni non sono leggibili dal pubblico via RLS:
 * la ricerca disponibilità e la creazione della richiesta passano da qui,
 * con proiezione esplicita dei soli campi sicuri e ricalcolo del prezzo
 * lato server (il totale inviato dal browser non viene mai considerato).
 */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida");

const branchCode = z.string().trim().min(2).max(8);

const searchSchema = z.object({
  categoryId: z.string().uuid().optional().nullable(),
  branchCode,
  dateFrom: isoDate,
  dateTo: isoDate,
  driverAge: z.string().max(10).default("25+"),
  couponCode: z.string().trim().max(24).optional().nullable(),
  /** Email del cliente, se già inserita: abilita lo sconto fedeltà nel preventivo. */
  customerEmail: z.string().trim().toLowerCase().email().max(160).optional().nullable(),
});

export type AvailableVehicle = {
  id: string;
  model: string;
  branch_id: string | null;
  category_id: string | null;
  macro_class: string;
  category_label_it: string;
  category_label_en: string;
  daily_rate: number;
  total: number;
  /** Sconto fedeltà incluso nel totale, mostrato come riga distinta. */
  loyalty_discount: number;
  /** Sconto coupon effettivamente applicato (0 se scartato dalla regola). */
  coupon_discount: number;
  days: number;
};

export const searchAvailability = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => searchSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const days = daysOf(data.dateFrom, data.dateTo);
    const branchId = await resolveBranchId(supabaseAdmin, data.branchCode);

    const [vehiclesRes, reservationsRes, plansRes, categoriesRes, maintenanceRes] = await Promise.all([
      supabaseAdmin
        .from("vehicles")
        .select("id, model, branch_id, category_id, daily_rate, status")
        .eq("branch_id", branchId)
        .neq("status", "fuori_servizio"),
      supabaseAdmin
        .from("reservations")
        .select("id, vehicle_id, date_from, date_to, status"),
      supabaseAdmin.from("rate_plans").select("*").eq("active", true),
      // Solo categorie attive: una categoria messa a storico non è prenotabile.
      supabaseAdmin.from("vehicle_categories").select("*").eq("active", true),
      // Fermi tecnici: una manutenzione aperta rende il veicolo non prenotabile.
      supabaseAdmin
        .from("maintenance_requests")
        .select("vehicle_id, stato, fermo_dal, fermo_al")
        .neq("stato", "chiusa"),
    ]);

    if (vehiclesRes.error) throw new Error(vehiclesRes.error.message);
    if (reservationsRes.error) throw new Error(reservationsRes.error.message);

    const plans = (plansRes.data ?? []) as unknown as RatePlan[];
    const categories = categoriesRes.data ?? [];
    const reservations = reservationsRes.data ?? [];
    const maintenanceBlocks = (maintenanceRes.data ?? []) as unknown as MaintenanceBlock[];

    let coupon: Coupon | null = null;
    if (data.couponCode) {
      const { data: c } = await supabaseAdmin
        .from("coupons")
        .select("*")
        .ilike("code", data.couponCode)
        .maybeSingle();
      const candidate = c as unknown as Coupon | null;
      coupon = isCouponValid(candidate, data.dateFrom) ? candidate : null;
    }

    // Sconto fedeltà del cliente (se già identificato dall'email): il livello
    // è ricalcolato lato server, il browser non può dichiararlo.
    const { data: knownCustomer } = data.customerEmail
      ? await supabaseAdmin
          .from("customers")
          .select("id")
          .ilike("email", data.customerEmail)
          .maybeSingle()
      : { data: null };
    const [loyalty, loyaltyStacking] = await Promise.all([
      loadLoyaltyStatus(supabaseAdmin as never, knownCustomer?.id ?? null),
      readLoyaltyStacking(supabaseAdmin as never),
    ]);

    const results: AvailableVehicle[] = [];
    for (const v of vehiclesRes.data ?? []) {
      if (data.categoryId && v.category_id !== data.categoryId) continue;
      if (!categories.some((c) => c.id === v.category_id)) continue;
      // Disponibilità: unico punto di verità in src/lib/gestionale.ts.
      if (
        !isVehicleAvailable(
          v.id,
          data.dateFrom,
          data.dateTo,
          reservations as unknown as Reservation[],
          maintenanceBlocks,
        )
      )
        continue;

      const plan = pickRatePlan(plans, v.category_id, v.branch_id, data.dateFrom);
      const price = computePrice({
        days,
        fallbackDailyRate: Number(v.daily_rate),
        ratePlan: plan,
        coupon,
        driverAge: data.driverAge,
        loyaltyDiscountPct: loyalty.tier?.sconto_percentuale ?? 0,
        loyaltyTierName: loyalty.tier?.nome ?? null,
        loyaltyStacking,
      });
      const category = categories.find((c) => c.id === v.category_id);
      results.push({
        id: v.id,
        model: v.model,
        branch_id: v.branch_id,
        category_id: v.category_id,
        macro_class: category?.macro_class ?? "economy",
        category_label_it: category?.label_it ?? "",
        category_label_en: category?.label_en ?? "",
        daily_rate: price.dailyRate,
        total: price.total,
        loyalty_discount: price.loyaltyDiscount,
        coupon_discount: price.couponDiscount,
        days,
      });
    }

    return {
      days,
      couponApplied: coupon ? coupon.code : null,
      // Endpoint pubblico non autenticato: espone solo la percentuale di sconto
      // applicabile al preventivo. Nome del livello e numero di noleggi sono
      // dati personali di terzi e restano al gestionale / portale autenticato.
      loyalty: {
        discountPct: Number(loyalty.tier?.sconto_percentuale ?? 0),
        stacking: loyaltyStacking,
      },
      vehicles: results.sort((a, b) => a.total - b.total),
    };
  });

const bookSchema = z.object({
  vehicleId: z.string().uuid(),
  branchCode,
  dropoffBranchCode: branchCode.optional().nullable(),
  dateFrom: isoDate,
  dateTo: isoDate,
  driverAge: z.string().max(10).default("25+"),
  couponCode: z.string().trim().max(24).optional().nullable(),
  extras: z.array(z.object({ extraId: z.string().uuid(), qty: z.number().int().min(1).max(9) })).default([]),
  insurancePackageId: z.string().uuid().optional().nullable(),
  customer: z.object({
    full_name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(255),
    phone: z.string().trim().max(30).default(""),
    fiscal_code: z.string().trim().max(32).default(""),
    driving_license_number: z.string().trim().max(32).default(""),
    birth_date: isoDate.optional().nullable(),
    address: z.string().trim().max(255).default(""),
  }),
  notes: z.string().trim().max(1000).default(""),
  // Le accettazioni vincolanti sono obbligatorie anche server-side: il client
  // non è l'unico punto di controllo. I timestamp devono essere ISO validi.
  consensoPrivacy: z.literal(true, {
    message: "È necessario accettare l'Informativa Privacy.",
  }),
  termsVersion: z.number().int().positive(),
  contractVersion: z.number().int().positive(),
  termsAcceptedAt: z.string().datetime(),
  privacyAcceptedAt: z.string().datetime(),
  contractAcceptedAt: z.string().datetime(),
  vexatiousAcceptedAt: z.string().datetime(),
  consensoMarketing: z.boolean().default(false),
  consensoProfilazione: z.boolean().default(false),
  // Documenti obbligatori: l'elenco deve coprire tutti e quattro i tipi, con i
  // percorsi rilasciati dal server nella stessa sessione di upload.
  documentSessionId: z.string().uuid(),
  documents: z
    .array(
      z.object({
        tipo: z.enum(DOCUMENT_TYPES),
        path: z.string().trim().min(8).max(300),
      }),
    )
    .refine(
      (docs) => DOCUMENT_TYPES.every((tipo) => docs.some((d) => d.tipo === tipo)),
      { message: "Carica tutti i documenti obbligatori." },
    ),
  utm_source: z.string().trim().max(120).optional().nullable(),
  utm_medium: z.string().trim().max(120).optional().nullable(),
  utm_campaign: z.string().trim().max(120).optional().nullable(),
});

export const createBookingRequest = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => bookSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const days = daysOf(data.dateFrom, data.dateTo);
    const branchId = await resolveBranchId(supabaseAdmin, data.branchCode);
    const dropoffBranchId = data.dropoffBranchCode
      ? await resolveBranchId(supabaseAdmin, data.dropoffBranchCode)
      : branchId;

    // Le versioni accettate devono corrispondere ai documenti pubblicati più
    // recenti: impedisce di inviare dal browser una versione non più vigente.
    const { data: legalRows, error: legalError } = await supabaseAdmin
      .from("legal_documents")
      .select("slug, version")
      .in("slug", ["termini-e-condizioni", "condizioni-generali"])
      .eq("published", true)
      .order("version", { ascending: false });
    if (legalError) throw new Error(legalError.message);
    const latestLegal = new Map<string, number>();
    for (const row of legalRows ?? []) {
      if (!latestLegal.has(row.slug)) latestLegal.set(row.slug, row.version);
    }
    if (
      latestLegal.get("termini-e-condizioni") !== data.termsVersion ||
      latestLegal.get("condizioni-generali") !== data.contractVersion
    ) {
      throw new Error("I documenti legali sono stati aggiornati: ricarica la pagina e accettali nuovamente.");
    }

    // 1. blacklist: verifica server-side, mai delegata al browser
    const { data: existing } = await supabaseAdmin
      .from("customers")
      .select("id, blacklisted")
      .ilike("email", data.customer.email)
      .maybeSingle();
    if (existing?.blacklisted) {
      throw new Error("Non è possibile completare la prenotazione online: contatta il nostro staff.");
    }

    // 2. veicolo ancora libero?
    const { data: vehicleReservations } = await supabaseAdmin
      .from("reservations")
      .select("id, vehicle_id, date_from, date_to, status")
      .eq("vehicle_id", data.vehicleId);
    const { data: vehicleMaintenance } = await supabaseAdmin
      .from("maintenance_requests")
      .select("vehicle_id, stato, fermo_dal, fermo_al")
      .eq("vehicle_id", data.vehicleId)
      .neq("stato", "chiusa");
    if (
      !isVehicleAvailable(
        data.vehicleId,
        data.dateFrom,
        data.dateTo,
        (vehicleReservations ?? []) as unknown as Reservation[],
        (vehicleMaintenance ?? []) as unknown as MaintenanceBlock[],
      )
    ) {
      throw new Error("Il veicolo è stato appena prenotato: scegli un'altra soluzione.");
    }

    const { data: vehicle, error: vErr } = await supabaseAdmin
      .from("vehicles")
      .select("id, category_id, branch_id, daily_rate")
      .eq("id", data.vehicleId)
      .single();
    if (vErr || !vehicle) throw new Error("Veicolo non disponibile.");

    // 3. prezzo ricalcolato lato server
    const [plansRes, extrasRes, insuranceRes] = await Promise.all([
      supabaseAdmin.from("rate_plans").select("*").eq("active", true),
      supabaseAdmin.from("extras").select("*").eq("active", true),
      supabaseAdmin.from("insurance_packages").select("*").eq("active", true),
    ]);
    const plans = (plansRes.data ?? []) as unknown as RatePlan[];
    const allExtras = (extrasRes.data ?? []) as unknown as Extra[];

    // Il pacchetto assicurativo è validato lato server: deve essere attivo e
    // proponibile per la categoria del veicolo scelto.
    const eligiblePackages = pickInsurancePackages(
      (insuranceRes.data ?? []) as unknown as InsurancePackage[],
      vehicle.category_id,
    );
    const insurancePackage = data.insurancePackageId
      ? (eligiblePackages.find((p) => p.id === data.insurancePackageId) ?? null)
      : null;

    let coupon: Coupon | null = null;
    if (data.couponCode) {
      const { data: c } = await supabaseAdmin
        .from("coupons")
        .select("*")
        .ilike("code", data.couponCode)
        .maybeSingle();
      const candidate = c as unknown as Coupon | null;
      coupon = isCouponValid(candidate, data.dateFrom) ? candidate : null;
    }

    const selected = data.extras
      .map((sel) => {
        const extra = allExtras.find((e) => e.id === sel.extraId);
        return extra ? { extra, qty: Math.min(sel.qty, extra.max_qty) } : null;
      })
      .filter((x): x is { extra: Extra; qty: number } => x !== null);

    // Sconto fedeltà: livello ricalcolato lato server dai noleggi conclusi
    // negli ultimi 12 mesi del cliente già in anagrafica.
    const [loyalty, loyaltyStacking] = await Promise.all([
      loadLoyaltyStatus(supabaseAdmin as never, existing?.id ?? null),
      readLoyaltyStacking(supabaseAdmin as never),
    ]);

    const price = computePrice({
      days,
      fallbackDailyRate: Number(vehicle.daily_rate),
      ratePlan: pickRatePlan(plans, vehicle.category_id, vehicle.branch_id, data.dateFrom),
      coupon,
      driverAge: data.driverAge,
      extras: selected,
      insurancePackage,
      loyaltyDiscountPct: loyalty.tier?.sconto_percentuale ?? 0,
      loyaltyTierName: loyalty.tier?.nome ?? null,
      loyaltyStacking,
    });

    // 4. cliente (anagrafica riutilizzabile) + snapshot testuale sul contratto
    let customerId = existing?.id ?? null;
    if (customerId) {
      await supabaseAdmin
        .from("customers")
        .update({
          full_name: data.customer.full_name,
          phone: data.customer.phone,
          fiscal_code: data.customer.fiscal_code,
          driving_license_number: data.customer.driving_license_number,
          birth_date: data.customer.birth_date ?? null,
          address: data.customer.address,
        })
        .eq("id", customerId);
    } else {
      const { data: created, error: cErr } = await supabaseAdmin
        .from("customers")
        .insert({
          full_name: data.customer.full_name,
          email: data.customer.email,
          phone: data.customer.phone,
          fiscal_code: data.customer.fiscal_code,
          driving_license_number: data.customer.driving_license_number,
          birth_date: data.customer.birth_date ?? null,
          address: data.customer.address,
        })
        .select("id")
        .single();
      if (cErr) throw new Error(cErr.message);
      customerId = created.id;
    }

    // 5. prenotazione in stato bozza ("Richiesta prenotazione") — il pagamento
    //    arriverà nel lotto 2; l'operatore la vede subito in gestionale.
    const code = `WR-${new Date().getFullYear().toString().slice(2)}${String(
      new Date().getMonth() + 1,
    ).padStart(2, "0")}-${Math.floor(1000 + Math.random() * 9000)}`;

    const noteParts = [data.notes, `Richiesta online · età conducente ${data.driverAge}`];
    if (dropoffBranchId !== branchId) {
      const { data: dropoff } = await supabaseAdmin
        .from("branches")
        .select("name")
        .eq("id", dropoffBranchId)
        .maybeSingle();
      if (dropoff) noteParts.push(`Riconsegna: ${dropoff.name}`);
    }

    const { data: reservation, error: rErr } = await supabaseAdmin
      .from("reservations")
      .insert({
        code,
        vehicle_id: data.vehicleId,
        branch_id: branchId,
        customer_id: customerId,
        customer_name: data.customer.full_name,
        customer_email: data.customer.email,
        customer_phone: data.customer.phone,
        date_from: data.dateFrom,
        date_to: data.dateTo,
        status: "bozza",
        total_amount: price.total,
        discount_amount: price.partnerDiscount + price.couponDiscount + price.loyaltyDiscount,
        extras_amount: price.extrasTotal,
        insurance_package_id: insurancePackage?.id ?? null,
        insurance_amount: price.insuranceTotal,
        coupon_code: coupon?.code ?? null,
        driver_age: data.driverAge,
        utm_source: data.utm_source ?? null,
        utm_medium: data.utm_medium ?? null,
        utm_campaign: data.utm_campaign ?? null,
        consenso_privacy: true,
        consenso_marketing: data.consensoMarketing,
        consenso_profilazione: data.consensoProfilazione,
        terms_version: data.termsVersion,
        terms_accepted_at: data.termsAcceptedAt,
        privacy_accepted_at: data.privacyAcceptedAt,
        contract_version: data.contractVersion,
        contract_accepted_at: data.contractAcceptedAt,
        vexatious_accepted_at: data.vexatiousAcceptedAt,
        notes: noteParts.filter(Boolean).join(" · "),
      })
      .select("id, code")
      .single();
    if (rErr) throw new Error(rErr.message);

    // Documenti cliente: spostati sotto la prenotazione e registrati. Se il
    // passaggio fallisce la richiesta viene annullata: nessuna prenotazione
    // senza documenti.
    try {
      await attachReservationDocuments(supabaseAdmin as never, {
        reservationId: reservation.id,
        sessionId: data.documentSessionId,
        documents: data.documents,
      });
    } catch (e) {
      await supabaseAdmin.from("reservations").delete().eq("id", reservation.id);
      throw e instanceof Error ? e : new Error("Documenti non registrati.");
    }


    if (selected.length > 0) {
      await supabaseAdmin.from("reservation_extras").insert(
        selected.map((s) => ({
          reservation_id: reservation.id,
          extra_id: s.extra.id,
          qty: s.qty,
          unit_price: frozenUnitPrice(s.extra, days),
        })),
      );
    }

    // Il coupon si consuma solo se ha effettivamente inciso sul prezzo
    // (con la regola "best" può essere stato scartato a favore della fedeltà).
    if (coupon && price.couponDiscount > 0) {
      await supabaseAdmin
        .from("coupons")
        .update({ used_count: coupon.used_count + 1 })
        .eq("id", coupon.id);
    }

    return { code: reservation.code, total: price.total, breakdown: price };
  });

const leadSchema = z.object({
  company_name: z.string().trim().min(2).max(120),
  contact_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(30).default(""),
  fleet_size: z.string().trim().max(60).default(""),
  message: z.string().trim().max(1500).default(""),
});

export const createPartnerLead = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => leadSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("partner_leads")
      .insert({ ...data, status: "in_valutazione" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
