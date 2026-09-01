import { createFileRoute } from "@tanstack/react-router";

import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/** Token condiviso col job pg_cron, custodito in una tabella non esposta all'API. */
async function authenticateDbCron(request: Request): Promise<boolean> {
  const match = /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "");
  const token = match?.[1];
  if (!token) return false;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await (
    supabaseAdmin as unknown as {
      rpc: (fn: string, args: Record<string, string>) => Promise<{ data: string | null }>;
    }
  ).rpc("cron_token", { _name: "cargos" });
  const expected = data ?? undefined;
  if (!expected || expected.length !== token.length) return false;
  const { timingSafeEqual } = await import("node:crypto");
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

const MAX_TENTATIVI = 8;

/**
 * Job CaRGOS: accoda i contratti conclusi non ancora comunicati e ripete gli
 * invii in errore la cui prossima finestra di tentativo è scaduta.
 * Con l'adapter mock attivo (default) nulla lascia l'applicazione.
 */
export const Route = createFileRoute("/api/public/cron/cargos")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const lovableDenied = await authenticateCronRequest(request);
        if (lovableDenied && !(await authenticateDbCron(request))) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { transmitReservation } = await import("@/lib/cargos.server");
        const db = supabaseAdmin as never;

        try {
          const nowIso = new Date().toISOString();
          const [{ data: contracts }, { data: retries }] = await Promise.all([
            supabaseAdmin
              .from("reservations")
              .select("id")
              .in("status", ["in_corso", "chiusa"])
              // Barriera strutturale: le prenotazioni demo/test non escono mai.
              .eq("is_demo", false)
              .not("checkout_at", "is", null)
              .limit(50),
            supabaseAdmin
              .from("cargos_transmissions")
              .select("reservation_id, tentativi, next_attempt_at")
              .eq("stato", "errore")
              .lte("next_attempt_at", nowIso)
              .lt("tentativi", MAX_TENTATIVI)
              .limit(50),
          ]);

          const { data: known } = await supabaseAdmin
            .from("cargos_transmissions")
            .select("reservation_id");
          const seen = new Set((known ?? []).map((r) => r.reservation_id));

          const targets = new Set<string>([
            ...(contracts ?? []).filter((r) => !seen.has(r.id)).map((r) => r.id),
            ...(retries ?? []).map((r) => r.reservation_id),
          ]);

          // Anche i retry vengono ricontrollati: nessun id demo può passare.
          const { data: demoRows } = await supabaseAdmin
            .from("reservations")
            .select("id")
            .eq("is_demo", true)
            .in("id", [...targets]);
          for (const row of demoRows ?? []) {
            console.error(
              `[cron/cargos] BLOCCO DEMO — prenotazione ${row.id} marcata come demo trovata in coda: esclusa dall'invio.`,
            );
            targets.delete(row.id);
          }

          const results = [];
          for (const reservationId of targets) {
            results.push(await transmitReservation(db, reservationId, { send: true }));
          }

          return Response.json({
            ok: true,
            processed: results.length,
            inviati: results.filter((r) => r.stato === "inviato").length,
            errori: results.filter((r) => r.stato === "errore").length,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error("[cron/cargos]", message);
          return Response.json({ ok: false, error: message }, { status: 500 });
        }
      },
    },
  },
});
