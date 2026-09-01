import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { paymentTypeLabels } from "@/lib/receipts";

const schema = z.object({ reservationId: z.string().uuid() });

export type ReceiptLink = {
  paymentId: string;
  label: string;
  amount: number;
  paidAt: string;
  url: string;
};

/**
 * Ricevute scaricabili di una prenotazione.
 * L'autorizzazione passa dal client autenticato (RLS): se il chiamante non può
 * leggere la prenotazione — cliente proprietario o staff — non ottiene nulla.
 * Solo dopo quel controllo si leggono i pagamenti con il client privilegiato,
 * perché la tabella pagamenti non è esposta ai clienti.
 */
export const getReservationReceipts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data, context }): Promise<ReceiptLink[]> => {
    const { data: reservation, error } = await context.supabase
      .from("reservations")
      .select("id")
      .eq("id", data.reservationId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!reservation) throw new Error("Non sei autorizzato a consultare queste ricevute.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: payments, error: payErr } = await supabaseAdmin
      .from("payments")
      .select("id, amount, type, receipt_path, updated_at, created_at")
      .eq("reservation_id", data.reservationId)
      .eq("status", "succeeded")
      .not("receipt_path", "is", null)
      .order("created_at", { ascending: true });
    if (payErr) throw new Error(payErr.message);

    const { createReceiptSignedUrl } = await import("@/lib/receipts.server");
    const out: ReceiptLink[] = [];
    for (const payment of payments ?? []) {
      if (!payment.receipt_path) continue;
      const url = await createReceiptSignedUrl(payment.receipt_path, 300);
      if (!url) continue;
      out.push({
        paymentId: payment.id,
        label: `Ricevuta · ${paymentTypeLabels[payment.type] ?? payment.type}`,
        amount: Number(payment.amount ?? 0),
        paidAt: payment.updated_at ?? payment.created_at,
        url,
      });
    }
    return out;
  });

/** Rigenerazione manuale dal gestionale quando il PDF risulta mancante. */
export const regenerateReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ paymentId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { hasCapability } = await import("@/lib/roles");
    const { data: roleRows } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (!hasCapability((roleRows ?? []).map((row) => row.role), "write_reservations")) {
      throw new Error("Non hai i permessi per rigenerare la ricevuta.");
    }
    const { generateAndDeliverReceipt } = await import("@/lib/receipts.server");
    const result = await generateAndDeliverReceipt(data.paymentId);
    if (!result.ok) throw new Error(result.reason ?? "Generazione della ricevuta non riuscita.");
    return { ok: true as const };
  });
