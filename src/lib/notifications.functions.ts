import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdminUser } from "@/lib/role-guards";

/**
 * Trigger manuale della coda notifiche dal gestionale (solo admin).
 * Il job schedulato usa la rotta cron; questa serve per invii immediati.
 */
export const runNotificationQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminUser(context.supabase, context.userId, "Forbidden");

    const { enqueueScheduledNotifications, processNotificationQueue } = await import(
      "@/lib/notifications.server"
    );
    const queued = await enqueueScheduledNotifications();
    const processed = await processNotificationQueue();
    return { queued, processed };
  });
