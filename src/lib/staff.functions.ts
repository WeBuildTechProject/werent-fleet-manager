import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AppRole, Reservation, Vehicle } from "@/lib/gestionale";

/**
 * Ambito operativo dell'operatore (Lotto 25).
 *
 * `assigned_branch_id` è opt-in: se non valorizzato l'operatore continua a
 * vedere tutte le sedi. Admin e super admin non sono mai ristretti, servono per
 * la supervisione trasversale. Il filtro è applicato qui, nelle server
 * function di elenco, e non nelle RLS generali delle prenotazioni.
 */
export type StaffScope = {
  branchId: string | null;
  unrestricted: boolean;
  roles: AppRole[];
  active: boolean;
};

type AuthedContext = { supabase: any; userId: string };

async function resolveScope(context: AuthedContext): Promise<StaffScope> {
  const [roleRes, profileRes] = await Promise.all([
    context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
    context.supabase
      .from("profiles")
      .select("assigned_branch_id, active")
      .eq("id", context.userId)
      .maybeSingle(),
  ]);
  if (roleRes.error) throw new Error(roleRes.error.message);
  const roles = ((roleRes.data ?? []) as Array<{ role: AppRole }>).map((row) => row.role);
  const unrestricted = roles.includes("admin") || roles.includes("super_admin");
  const profile = profileRes.data as { assigned_branch_id: string | null; active: boolean } | null;
  // Account disattivato da un amministratore: nessun elenco operativo.
  if (profile && profile.active === false) {
    throw new Error("Account disattivato: contatta un amministratore.");
  }
  return {
    branchId: unrestricted ? null : (profile?.assigned_branch_id ?? null),
    unrestricted,
    roles,
    active: profile?.active ?? true,
  };
}

export const getStaffScope = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StaffScope> => resolveScope(context as AuthedContext));

export const listScopedReservations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Reservation[]> => {
    const scope = await resolveScope(context as AuthedContext);
    let query = context.supabase
      .from("reservations")
      .select("*")
      .order("date_from", { ascending: false });
    if (scope.branchId) query = query.eq("branch_id", scope.branchId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as Reservation[];
  });

export const listScopedVehicles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Vehicle[]> => {
    const scope = await resolveScope(context as AuthedContext);
    let query = context.supabase.from("vehicles").select("*").order("model");
    if (scope.branchId) query = query.eq("branch_id", scope.branchId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []) as Vehicle[];
  });

/* ------------------------- Dashboard utenti staff ------------------------ */

export type StaffMemberRow = {
  id: string;
  full_name: string;
  email: string;
  branch_id: string | null;
  assigned_branch_id: string | null;
  active: boolean;
  roles: AppRole[];
};

async function assertCanManageRoles(context: AuthedContext) {
  const { hasCapability } = await import("@/lib/roles");
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  if (error) throw new Error(error.message);
  const roles = ((data ?? []) as Array<{ role: AppRole }>).map((row) => row.role);
  if (!hasCapability(roles, "manage_roles")) throw new Error("Non autorizzato.");
}

export const listStaffMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StaffMemberRow[]> => {
    const ctx = context as AuthedContext;
    await assertCanManageRoles(ctx);
    const [profiles, userRoles] = await Promise.all([
      ctx.supabase
        .from("profiles")
        .select("id, full_name, email, branch_id, assigned_branch_id, active")
        .order("full_name"),
      ctx.supabase.from("user_roles").select("user_id, role"),
    ]);
    if (profiles.error) throw new Error(profiles.error.message);
    if (userRoles.error) throw new Error(userRoles.error.message);
    const rolesByUser = new Map<string, AppRole[]>();
    for (const row of (userRoles.data ?? []) as Array<{ user_id: string; role: AppRole }>) {
      rolesByUser.set(row.user_id, [...(rolesByUser.get(row.user_id) ?? []), row.role]);
    }
    return ((profiles.data ?? []) as Array<Omit<StaffMemberRow, "roles">>).map((profile) => ({
      ...profile,
      roles: rolesByUser.get(profile.id) ?? [],
    }));
  });

const updateSchema = z.object({
  userId: z.string().uuid(),
  assignedBranchId: z.string().uuid().nullable().optional(),
  active: z.boolean().optional(),
});

/** Solo Admin e Super Admin possono impostare sede assegnata e stato. */
export const updateStaffProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const ctx = context as AuthedContext;
    await assertCanManageRoles(ctx);
    const patch: Record<string, unknown> = {};
    if (data.assignedBranchId !== undefined) patch["assigned_branch_id"] = data.assignedBranchId;
    if (data.active !== undefined) patch["active"] = data.active;
    if (Object.keys(patch).length === 0) return { ok: true as const };
    const { error } = await ctx.supabase.from("profiles").update(patch).eq("id", data.userId);
    if (error) throw new Error(error.message);
    const { logAuditServer } = await import("@/lib/staff.server");
    await logAuditServer(ctx.userId, "staff_profile_update", "profiles", data.userId, patch);
    return { ok: true as const };
  });
