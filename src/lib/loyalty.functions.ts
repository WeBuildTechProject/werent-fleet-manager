import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  loadLoyaltyStatus,
  readLoyaltyStacking,
  toLoyaltyPreview,
  type LoyaltyPreview,
} from "@/lib/loyalty";

export type { LoyaltyPreview };

/** Stato fedeltà del cliente collegato all'utente autenticato (portale). */
export const getMyLoyaltyStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LoyaltyPreview | null> => {
    const { data: customer } = await context.supabase
      .from("customers")
      .select("id")
      .eq("auth_user_id", context.userId)
      .maybeSingle();
    if (!customer) return null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [status, stacking] = await Promise.all([
      loadLoyaltyStatus(supabaseAdmin as never, customer.id),
      readLoyaltyStacking(supabaseAdmin as never),
    ]);
    return toLoyaltyPreview(status, stacking);
  });
