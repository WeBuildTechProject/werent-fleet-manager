/**
 * Controlli di ruolo lato server function.
 *
 * Le funzioni `is_admin`/`is_staff`/`has_role` esposte nello schema `public` non
 * sono più eseguibili da `anon`/`authenticated` (irrobustimento del Lotto 25):
 * le RLS usano le omonime in `private`. Di conseguenza `supabase.rpc("is_admin")`
 * dal client autenticato restituisce 403. Qui il controllo passa dalla tabella
 * `user_roles`, leggibile da `authenticated` e comunque protetta da RLS.
 */
import type { AppRole } from "@/lib/gestionale";

type MinimalClient = { from: (table: string) => any };

export async function readUserRoles(
  supabase: MinimalClient,
  userId: string,
): Promise<AppRole[]> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: { role: AppRole }) => r.role);
}

export async function isAdminUser(supabase: MinimalClient, userId: string): Promise<boolean> {
  const roles = await readUserRoles(supabase, userId);
  return roles.includes("super_admin") || roles.includes("admin");
}

export async function assertAdminUser(
  supabase: MinimalClient,
  userId: string,
  message = "Accesso non consentito: servono privilegi di amministratore.",
): Promise<void> {
  if (!(await isAdminUser(supabase, userId))) throw new Error(message);
}
