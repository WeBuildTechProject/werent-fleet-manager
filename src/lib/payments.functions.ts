import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Pagamenti: la modalità (pagamento completo o caparra %) è configurata per
 * categoria veicolo, l'importo è sempre ricalcolato lato server dalla
 * prenotazione (mai dal browser). Se Stripe non è configurato, le funzioni
 * dichiarano `stripeEnabled: false` e il flusso pubblico mostra solo
 * "pagamento in sede".
 */

const round2 = (n: number) => Math.round(n * 100) / 100;

export type PaymentContext = {
  stripeEnabled: boolean;
  code: string;
  total: number;
  /** pagamento_completo | caparra */
  mode: "pagamento_completo" | "caparra";
  depositPct: number;
  /** Importo da pagare online adesso. */
  amountNow: number;
  /** Saldo da incassare al ritiro (0 se pagamento completo). */
  balanceAtPickup: number;
  alreadyPaid: boolean;
};

async function loadContext(code: string): Promise<PaymentContext> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { isStripeConfigured } = await import("@/lib/stripe.server");

  const { data: reservation, error } = await supabaseAdmin
    .from("reservations")
    .select("id, code, status, total_amount, vehicle_id")
    .eq("code", code)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!reservation) throw new Error("Prenotazione non trovata.");

  let mode: "pagamento_completo" | "caparra" = "pagamento_completo";
  let depositPct = 100;

  if (reservation.vehicle_id) {
    const { data: vehicle } = await supabaseAdmin
      .from("vehicles")
      .select("category_id")
      .eq("id", reservation.vehicle_id)
      .maybeSingle();
    if (vehicle?.category_id) {
      const { data: category } = await supabaseAdmin
        .from("vehicle_categories")
        .select("payment_mode, deposit_pct")
        .eq("id", vehicle.category_id)
        .maybeSingle();
      if (category?.payment_mode === "caparra") {
        mode = "caparra";
        depositPct = Math.min(100, Math.max(1, Number(category.deposit_pct) || 30));
      }
    }
  }

  const total = round2(Number(reservation.total_amount) || 0);
  const amountNow = mode === "caparra" ? round2((total * depositPct) / 100) : total;

  const { data: succeeded } = await supabaseAdmin
    .from("payments")
    .select("id")
    .eq("reservation_id", reservation.id)
    .eq("status", "succeeded")
    .limit(1);

  return {
    stripeEnabled: isStripeConfigured(),
    code: reservation.code,
    total,
    mode,
    depositPct,
    amountNow,
    balanceAtPickup: round2(total - amountNow),
    alreadyPaid: (succeeded ?? []).length > 0,
  };
}

export const getPaymentContext = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ code: z.string().trim().min(4).max(32) }).parse(input))
  .handler(async ({ data }) => loadContext(data.code));

const checkoutSchema = z.object({
  code: z.string().trim().min(4).max(32),
  origin: z.string().trim().url().max(255),
});

/** Crea la sessione Stripe Checkout e la riga `payments` in stato pending. */
export const createCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => checkoutSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { isStripeConfigured, stripeRequest } = await import("@/lib/stripe.server");

    if (!isStripeConfigured()) {
      // STATO NOTO E DICHIARATO: nessuna chiave configurata → pagamento in sede.
      return { stripeEnabled: false as const, url: null };
    }

    const ctx = await loadContext(data.code);
    if (ctx.alreadyPaid) throw new Error("Questa prenotazione risulta già pagata.");
    if (ctx.amountNow <= 0) throw new Error("Importo non valido.");

    const { data: reservation } = await supabaseAdmin
      .from("reservations")
      .select("id, code, customer_email, date_from, date_to")
      .eq("code", data.code)
      .single();
    if (!reservation) throw new Error("Prenotazione non trovata.");

    const type = ctx.mode === "caparra" ? "caparra" : "pagamento_completo";
    const label =
      type === "caparra"
        ? `Caparra ${ctx.depositPct}% noleggio ${reservation.code}`
        : `Noleggio ${reservation.code}`;

    const session = await stripeRequest<{ id: string; url: string }>("/checkout/sessions", {
      mode: "payment",
      success_url: `${data.origin}/prenota?pagamento=ok&code=${reservation.code}`,
      cancel_url: `${data.origin}/prenota?pagamento=annullato&code=${reservation.code}`,
      customer_email: reservation.customer_email || undefined,
      client_reference_id: reservation.code,
      metadata: { reservation_id: reservation.id, reservation_code: reservation.code, type },
      payment_intent_data: { metadata: { reservation_id: reservation.id, type } },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: Math.round(ctx.amountNow * 100),
            product_data: { name: label },
          },
        },
      ],
    });

    await supabaseAdmin.from("payments").insert({
      reservation_id: reservation.id,
      provider: "stripe",
      provider_payment_id: session.id,
      amount: ctx.amountNow,
      currency: "eur",
      status: "pending",
      type,
      notes: label,
    });

    return { stripeEnabled: true as const, url: session.url };
  });

const manualSchema = z.object({
  reservationId: z.string().uuid(),
  amount: z.number().min(0.01).max(100000),
  type: z.enum(["caparra", "saldo", "pagamento_completo"]).default("saldo"),
  notes: z.string().trim().max(255).default(""),
});

/**
 * Saldo (o incasso in sede) registrato manualmente dall'operatore.
 * Il ruolo è verificato dalle RLS tramite il client autenticato.
 */
export const registerManualPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => manualSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: inserted, error } = await context.supabase
      .from("payments")
      .insert({
        reservation_id: data.reservationId,
        provider: "contanti_pos",
        amount: data.amount,
        currency: "eur",
        status: "succeeded",
        type: data.type,
        notes: data.notes || "Incasso registrato in sede",
      })
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);

    const { data: reservation } = await context.supabase
      .from("reservations")
      .select("status")
      .eq("id", data.reservationId)
      .maybeSingle();
    if (reservation?.status === "bozza") {
      await context.supabase
        .from("reservations")
        .update({ status: "confermata" })
        .eq("id", data.reservationId);
    }

    // Ricevuta di pagamento (Lotto 25): PDF su storage privato + email con link.
    if (inserted?.id) {
      const { tryGenerateReceipt } = await import("@/lib/receipts.server");
      await tryGenerateReceipt(inserted.id);
    }
    return { ok: true };
  });
