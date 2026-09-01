import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Fatturazione semplificata: numerazione progressiva annuale calcolata lato
 * server, scorporo IVA 22% dal totale lordo della prenotazione.
 * Nessuna integrazione SDI in questa fase: il PDF generato è pronto per essere
 * caricato manualmente sul software di fatturazione elettronica.
 */

export const VAT_RATE = 0.22;

const round2 = (n: number) => Math.round(n * 100) / 100;

const schema = z.object({
  reservationId: z.string().uuid(),
  cliente_denominazione: z.string().trim().max(160).default(""),
  cliente_piva_cf: z.string().trim().max(32).default(""),
});

export const createInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data, context }) => {
    // Il ruolo è verificato dalle RLS della tabella invoices (admin/contabilità).
    const { data: reservation, error: rErr } = await context.supabase
      .from("reservations")
      .select("id, code, status, total_amount, customer_name, customer_email")
      .eq("id", data.reservationId)
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!reservation) throw new Error("Prenotazione non trovata.");
    if (!["confermata", "in_corso", "chiusa"].includes(reservation.status)) {
      throw new Error("La prenotazione deve essere confermata o chiusa.");
    }

    const { data: existing } = await context.supabase
      .from("invoices")
      .select("id, numero_fattura")
      .eq("reservation_id", reservation.id)
      .maybeSingle();
    if (existing) return { id: existing.id, numero_fattura: existing.numero_fattura };

    const anno = new Date().getFullYear();
    const totale = round2(Number(reservation.total_amount) || 0);
    const imponibile = round2(totale / (1 + VAT_RATE));
    const iva = round2(totale - imponibile);

    // Numerazione progressiva annuale: in caso di emissione simultanea il
    // vincolo unico (anno, progressivo) scatta e ritentiamo la lettura+inserimento
    // invece di mostrare all'operatore l'errore grezzo del database.
    let invoice: { id: string; numero_fattura: string } | null = null;
    let lastError: unknown = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { data: last } = await context.supabase
        .from("invoices")
        .select("progressivo")
        .eq("anno", anno)
        .order("progressivo", { ascending: false })
        .limit(1)
        .maybeSingle();
      const progressivo = (last?.progressivo ?? 0) + 1;

      const { data: created, error } = await context.supabase
        .from("invoices")
        .insert({
          reservation_id: reservation.id,
          numero_fattura: `${anno}/${String(progressivo).padStart(4, "0")}`,
          anno,
          progressivo,
          data_emissione: new Date().toISOString().slice(0, 10),
          imponibile,
          iva,
          totale,
          stato: "emessa",
          cliente_denominazione: data.cliente_denominazione || reservation.customer_name,
          cliente_piva_cf: data.cliente_piva_cf,
        })
        .select("id, numero_fattura")
        .single();

      if (!error && created) {
        invoice = created;
        break;
      }
      lastError = error;
      // 23505 = unique_violation: un altro operatore ha usato lo stesso numero.
      if (error?.code !== "23505") break;
      await new Promise((resolve) => setTimeout(resolve, 60 * (attempt + 1)));
    }

    if (!invoice) {
      const err = lastError as { code?: string; message?: string } | null;
      throw new Error(
        err?.code === "23505"
          ? "Un'altra fattura è stata emessa in questo istante: riprova."
          : err?.message || "Impossibile emettere la fattura.",
      );
    }

    return { id: invoice.id, numero_fattura: invoice.numero_fattura };
  });

const statusSchema = z.object({
  invoiceId: z.string().uuid(),
  stato: z.enum(["bozza", "emessa", "pagata", "annullata"]),
});

export const updateInvoiceStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => statusSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("invoices")
      .update({ stato: data.stato })
      .eq("id", data.invoiceId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
