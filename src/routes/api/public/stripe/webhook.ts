import { createFileRoute } from "@tanstack/react-router";

/**
 * Webhook Stripe. La firma è verificata sul body grezzo con
 * STRIPE_WEBHOOK_SECRET: senza segreto valido nessun evento viene processato.
 * Solo qui la prenotazione passa da `bozza` a `confermata`.
 */
export const Route = createFileRoute("/api/public/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { verifyStripeSignature } = await import("@/lib/stripe.server");
        const rawBody = await request.text();
        const ok = await verifyStripeSignature(rawBody, request.headers.get("stripe-signature"));
        if (!ok) return new Response("Invalid signature", { status: 401 });

        const event = JSON.parse(rawBody) as {
          type: string;
          data: { object: Record<string, unknown> };
        };
        const object = event.data.object;
        const sessionId = typeof object["id"] === "string" ? object["id"] : null;
        const metadata = (object["metadata"] ?? {}) as Record<string, string>;
        const reservationId = metadata["reservation_id"] ?? null;
        const amountTotal = Number(object["amount_total"] ?? object["amount"] ?? 0) / 100;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const setStatus = async (status: string): Promise<string[]> => {
          if (!sessionId) return [];
          const { data } = await supabaseAdmin
            .from("payments")
            .update({ status, ...(amountTotal > 0 ? { amount: amountTotal } : {}) })
            .eq("provider", "stripe")
            .eq("provider_payment_id", sessionId)
            .select("id");
          return (data ?? []).map((row) => row.id);
        };

        switch (event.type) {
          case "checkout.session.completed":
          case "checkout.session.async_payment_succeeded": {
            const paymentIds = await setStatus("succeeded");
            // Ricevuta di pagamento: PDF su storage privato + email con link firmato.
            const { tryGenerateReceipt } = await import("@/lib/receipts.server");
            for (const paymentId of paymentIds) await tryGenerateReceipt(paymentId);
            if (reservationId) {
              await supabaseAdmin
                .from("reservations")
                .update({ status: "confermata" })
                .eq("id", reservationId)
                .eq("status", "bozza");
            }
            break;
          }
          case "checkout.session.async_payment_failed":
          case "checkout.session.expired":
            await setStatus("failed");
            break;
          case "charge.refunded":
          case "refund.created":
            if (reservationId) {
              await supabaseAdmin
                .from("payments")
                .update({ status: "refunded" })
                .eq("reservation_id", reservationId)
                .eq("status", "succeeded");
            }
            break;
          default:
            break;
        }

        return new Response("ok");
      },
    },
  },
});
