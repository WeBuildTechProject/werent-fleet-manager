import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { VERBALE_LABELS, type VerbaleKind } from "@/lib/verbali";

const schema = z.object({ reservationId: z.string().uuid() });

export type VerbaleLink = { kind: VerbaleKind; label: string; url: string };

export const getReservationVerbali = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data, context }): Promise<VerbaleLink[]> => {
    const { data: reservation, error } = await context.supabase
      .from("reservations")
      .select("id, verbale_consegna_url, verbale_rientro_url")
      .eq("id", data.reservationId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!reservation) throw new Error("Non sei autorizzato a consultare questi verbali.");
    const { createVerbaleSignedUrl } = await import("@/lib/verbali.server");
    const out: VerbaleLink[] = [];
    for (const kind of ["consegna", "rientro"] as const) {
      const stored = kind === "consegna" ? reservation.verbale_consegna_url : reservation.verbale_rientro_url;
      if (!stored) continue;
      const url = await createVerbaleSignedUrl(data.reservationId, kind, 300);
      if (url) out.push({ kind, label: VERBALE_LABELS[kind], url });
    }
    return out;
  });

const regenSchema = z.object({ reservationId: z.string().uuid(), kind: z.enum(["consegna", "rientro"]) });

export const regenerateVerbale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => regenSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { hasCapability } = await import("@/lib/roles");
    const { data: roleRows } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    if (!hasCapability((roleRows ?? []).map((row) => row.role), "write_reservations")) {
      throw new Error("Non hai i permessi per rigenerare il verbale.");
    }
    const { data: reservation, error } = await context.supabase
      .from("reservations")
      .select("id, signed_at, checkin_signed_at")
      .eq("id", data.reservationId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!reservation) throw new Error("Prenotazione non trovata.");
    if (!(data.kind === "consegna" ? reservation.signed_at : reservation.checkin_signed_at)) {
      throw new Error("L'operazione non è ancora stata firmata: nulla da verbalizzare.");
    }
    const { generateAndDeliverVerbale } = await import("@/lib/verbali.server");
    const result = await generateAndDeliverVerbale(data.reservationId, data.kind);
    if (!result.ok) throw new Error(result.reason ?? "Generazione del verbale non riuscita.");
    return { ok: true as const };
  });

export type VerbaleCommunicationRow = {
  id: string;
  tipo: string;
  canale: string;
  destinatario_email: string | null;
  riferimento_id: string | null;
  reservation_code: string | null;
  branch_id: string | null;
  branch_name: string | null;
  stato: string;
  scheduled_for: string;
  sent_at: string | null;
  errore: string | null;
};

export const getVerbaliCommunications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<VerbaleCommunicationRow[]> => {
    // Allineato alla visibilità di menu della sezione "Verbali e comunicazioni":
    // la dashboard di monitoraggio è riservata ad admin/super_admin.
    const { canAccess } = await import("@/lib/roles");
    const { data: roleRows, error: roleError } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    if (roleError) throw new Error(roleError.message);
    if (!canAccess((roleRows ?? []).map((row) => row.role), "verbali")) throw new Error("Non autorizzato.");
    const { data, error } = await context.supabase
      .from("notifications")
      .select("id, tipo, canale, destinatario_email, riferimento_id, stato, scheduled_for, sent_at, errore")
      .in("tipo", ["verbale_consegna", "verbale_rientro"])
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    const reservationIds = [...new Set((data ?? []).map((row) => row.riferimento_id).filter((id): id is string => Boolean(id)))];
    const reservations = reservationIds.length > 0
      ? await context.supabase.from("reservations").select("id, code, branch_id, branches(name)").in("id", reservationIds)
      : { data: [], error: null };
    if (reservations.error) throw new Error(reservations.error.message);
    const reservationById = new Map((reservations.data ?? []).map((reservation) => {
      const branch = reservation.branches as unknown as { name: string } | null;
      return [reservation.id, { code: reservation.code, branchId: reservation.branch_id, branchName: branch?.name ?? null }] as const;
    }));

    return (data ?? []).map((row) => {
      const reservation = row.riferimento_id ? reservationById.get(row.riferimento_id) : undefined;
      return {
        id: row.id,
        tipo: row.tipo,
        canale: row.canale,
        destinatario_email: row.destinatario_email,
        riferimento_id: row.riferimento_id,
        reservation_code: reservation?.code ?? null,
        branch_id: reservation?.branchId ?? null,
        branch_name: reservation?.branchName ?? null,
        stato: row.stato,
        scheduled_for: row.scheduled_for,
        sent_at: row.sent_at,
        errore: row.errore,
      };
    });
  });

export const retryVerbaleCommunication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ notificationId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { canAccess } = await import("@/lib/roles");
    const { data: roleRows } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    if (!canAccess((roleRows ?? []).map((row) => row.role), "verbali")) throw new Error("Non autorizzato.");
    const { data: row, error } = await context.supabase.from("notifications").select("id, riferimento_id, tipo").eq("id", data.notificationId).in("tipo", ["verbale_consegna", "verbale_rientro"]).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row?.riferimento_id) throw new Error("Comunicazione non collegata a una prenotazione.");
    const kind = row.tipo === "verbale_consegna" ? "consegna" : "rientro";
    const { generateAndDeliverVerbale } = await import("@/lib/verbali.server");
    const result = await generateAndDeliverVerbale(row.riferimento_id, kind);
    if (!result.ok) throw new Error(result.reason ?? "Nuovo invio non riuscito.");
    return { ok: true as const };
  });
