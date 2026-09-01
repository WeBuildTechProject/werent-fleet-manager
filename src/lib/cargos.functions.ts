import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdminUser } from "@/lib/role-guards";
import { cargosSettingKeys } from "@/lib/cargos";

/**
 * Comunicazioni CaRGOS: server functions del gestionale.
 * Tutte protette da autenticazione; le operazioni di invio, mapping e scarico
 * tabelle richiedono un amministratore (le RLS di `cargos_transmissions` e
 * `cargos_tabelle_codifica` fanno da secondo controllo).
 */

async function assertAdmin(context: { supabase: any; userId: string }) {
  await assertAdminUser(
    context.supabase,
    context.userId,
    "Solo un amministratore può gestire le comunicazioni CaRGOS.",
  );
}

export type CargosTransmissionRow = {
  id: string;
  reservation_id: string;
  stato: string;
  transaction_id: string | null;
  errore: { messaggi?: string[]; mapping_mancante?: string[] } | null;
  tentativi: number;
  ambiente: string;
  last_attempt_at: string | null;
  next_attempt_at: string | null;
  sent_at: string | null;
  created_at: string;
  reservation_code: string;
  customer_name: string;
  date_from: string;
  date_to: string;
};

/** Stato delle comunicazioni + contratti conclusi ancora senza trasmissione. */
export const getCargosOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: rows, error }, { data: reservations }, { data: settings }, { data: tabelle }] =
      await Promise.all([
        context.supabase
          .from("cargos_transmissions")
          .select("*, reservations!inner(code, customer_name, date_from, date_to)")
          .order("created_at", { ascending: false })
          .limit(200),
        context.supabase
          .from("reservations")
          .select("id, code, customer_name, date_from, date_to, status, checkout_at, is_demo")
          .in("status", ["in_corso", "chiusa"])
          .order("date_from", { ascending: false })
          .limit(200),
        context.supabase.from("app_settings").select("key, value"),
        context.supabase.from("cargos_tabelle_codifica").select("tabella_id, updated_at"),
      ]);
    if (error) throw new Error(error.message);

    const transmissions: CargosTransmissionRow[] = (rows ?? []).map((r: any) => ({
      id: r.id,
      reservation_id: r.reservation_id,
      stato: r.stato,
      transaction_id: r.transaction_id,
      errore: r.errore,
      tentativi: r.tentativi,
      ambiente: r.ambiente,
      last_attempt_at: r.last_attempt_at,
      next_attempt_at: r.next_attempt_at,
      sent_at: r.sent_at,
      created_at: r.created_at,
      reservation_code: r.reservations?.code ?? "",
      customer_name: r.reservations?.customer_name ?? "",
      date_from: r.reservations?.date_from ?? "",
      date_to: r.reservations?.date_to ?? "",
    }));

    const known = new Set(transmissions.map((t) => t.reservation_id));
    const pending = (reservations ?? [])
      .filter((r: any) => !known.has(r.id))
      .map((r: any) => ({
        id: r.id,
        code: r.code,
        customer_name: r.customer_name,
        date_from: r.date_from,
        date_to: r.date_to,
        status: r.status,
        // Le demo restano visibili in elenco, ma senza pulsante di invio.
        is_demo: Boolean(r.is_demo),
      }));

    const tabelleAggiornate: Record<number, { righe: number; updated_at: string | null }> = {};
    for (const row of (tabelle ?? []) as { tabella_id: number; updated_at: string }[]) {
      const entry = tabelleAggiornate[row.tabella_id] ?? { righe: 0, updated_at: null };
      entry.righe += 1;
      if (!entry.updated_at || row.updated_at > entry.updated_at) entry.updated_at = row.updated_at;
      tabelleAggiornate[row.tabella_id] = entry;
    }

    return {
      // L'adapter attivo è il mock fino a `CARGOS_MODE=live` con credenziali complete.
      mode: process.env["CARGOS_MODE"] === "live" ? "live" : "mock",
      tracciatoVerificato: process.env["CARGOS_TRACCIATO_VERIFICATO"] === "true",
      cifraturaVerificata: process.env["CARGOS_CIFRATURA_VERIFICATA"] === "true",
      transmissions,
      pending,
      settings: (settings ?? []).filter((s: { key: string }) => s.key.startsWith("cargos.")),
      tabelle: tabelleAggiornate,
    };
  });

/** Anteprima del tracciato di una prenotazione: nessun invio, solo diagnostica. */
export const previewCargosRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ reservationId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { prepareTransmission } = await import("@/lib/cargos.server");
    const prepared = await prepareTransmission(context.supabase as never, data.reservationId);
    return {
      record: prepared.record,
      issues: prepared.issues,
      missingMappings: prepared.missingMappings,
      length: prepared.record?.length ?? 0,
    };
  });

/** Validazione formale (api/Check) senza acquisizione del contratto. */
export const checkCargosReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ reservationId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { transmitReservation } = await import("@/lib/cargos.server");
    return transmitReservation(context.supabase as never, data.reservationId, {
      send: false,
      userId: context.userId,
    });
  });

/** Invio definitivo (api/Send), anche come retry manuale di una trasmissione fallita. */
export const sendCargosReservation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ reservationId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { transmitReservation } = await import("@/lib/cargos.server");
    return transmitReservation(context.supabase as never, data.reservationId, {
      send: true,
      userId: context.userId,
    });
  });

const mappingSchema = z.object({
  entries: z
    .array(
      z.object({
        key: z.string().trim().regex(/^cargos\.[a-z_]+(\.[A-Za-z0-9_-]+)?$/, "chiave di mapping non valida"),
        value: z.string().trim().max(32),
        description: z.string().trim().max(200).optional(),
      }),
    )
    .min(1)
    .max(200),
});

/** Salvataggio del mapping: i codici stanno in `app_settings`, non nel codice. */
export const saveCargosMapping = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => mappingSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    for (const entry of data.entries) {
      const { error } = await context.supabase.from("app_settings").upsert(
        {
          key: entry.key,
          value: entry.value,
          description: entry.description ?? "Mapping CaRGOS",
        },
        { onConflict: "key" },
      );
      if (error) throw new Error(error.message);
    }
    await context.supabase.from("audit_log").insert({
      user_id: context.userId,
      action: "cargos_mapping_update",
      entity: "app_settings",
      payload: { keys: data.entries.map((e) => e.key) },
    });
    return { saved: data.entries.length };
  });

/** Scarico di una tabella di codifica ufficiale (api/Tabella). */
export const refreshCargosTabella = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ tabellaId: z.number().int().min(0).max(20) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { getCargosClient } = await import("@/lib/cargos.server");
    const client = await getCargosClient();
    const rows = await client.getTabella(data.tabellaId);
    if (rows.length === 0) {
      return {
        mode: client.mode,
        imported: 0,
        message:
          client.mode === "mock"
            ? "Adapter mock attivo: nessuna tabella scaricata (nessun codice viene inventato)."
            : "Il portale non ha restituito righe per questa tabella.",
      };
    }
    for (const row of rows) {
      const { error } = await context.supabase.from("cargos_tabelle_codifica").upsert(
        {
          tabella_id: data.tabellaId,
          codice: row.codice,
          descrizione: row.descrizione,
          raw: row.raw,
        },
        { onConflict: "tabella_id,codice" },
      );
      if (error) throw new Error(error.message);
    }
    return { mode: client.mode, imported: rows.length, message: null as string | null };
  });

export const cargosMappingKeys = cargosSettingKeys;
