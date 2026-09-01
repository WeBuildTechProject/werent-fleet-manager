/** Tracciamento server-only delle modifiche amministrative sul profilo staff. */
export async function logAuditServer(
  userId: string,
  action: string,
  entity: string,
  entityId: string,
  payload: Record<string, unknown>,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("audit_log").insert({
    user_id: userId,
    action,
    entity,
    entity_id: entityId,
    payload: payload as never,
  });
}
