import { createFileRoute } from "@tanstack/react-router";

import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/** Token condiviso col job pg_cron, custodito in una tabella non esposta all'API. */
async function authenticateDbCron(request: Request): Promise<boolean> {
  const match = /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "");
  const token = match?.[1];
  if (!token) return false;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // Lo schema `internal` non è esposto all'API pubblica, quindi non compare nei tipi generati.
  const { data } = await (
    supabaseAdmin as unknown as {
      rpc: (
        fn: string,
        args: Record<string, string>,
      ) => Promise<{ data: string | null }>;
    }
  ).rpc("cron_token", { _name: "notifications" });
  const expected = data ?? undefined;
  if (!expected || expected.length !== token.length) return false;
  const { timingSafeEqual } = await import("node:crypto");
  return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

/**
 * Job giornaliero: accoda le notifiche previste (scadenze veicolo a 7/3/1
 * giorni, rientri entro 24 ore) e processa immediatamente la coda.
 */
export const Route = createFileRoute("/api/public/cron/notifications")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const lovableDenied = await authenticateCronRequest(request);
        if (lovableDenied && !(await authenticateDbCron(request))) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { enqueueScheduledNotifications, processNotificationQueue } =
          await import("@/lib/notifications.server");

        try {
          const queued = await enqueueScheduledNotifications();
          const processed = await processNotificationQueue();
          return Response.json({ ok: true, queued, processed });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error("[cron/notifications]", message);
          return Response.json({ ok: false, error: message }, { status: 500 });
        }
      },
    },
  },
});
