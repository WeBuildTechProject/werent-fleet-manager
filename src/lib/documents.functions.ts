import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ACCEPTED_DOCUMENT_MIME,
  DOCUMENT_BUCKET,
  DOCUMENT_TYPES,
  MAX_DOCUMENT_BYTES,
  extensionFor,
  type DocumentType,
} from "@/lib/documents";

/**
 * Upload dei documenti cliente in fase di prenotazione.
 *
 * Il visitatore non è autenticato, quindi non può scrivere direttamente nel
 * bucket privato: il server rilascia un signed upload URL a uso singolo su un
 * percorso che decide lui (`pending/<sessione>/...`). Alla creazione della
 * prenotazione i file vengono spostati sotto `reservations/<id>/` e registrati
 * in `documenti_prenotazione`. Il bucket resta privato: nessuna URL pubblica.
 */

const ticketSchema = z.object({
  sessionId: z.string().uuid().optional().nullable(),
  tipo: z.enum(DOCUMENT_TYPES),
  contentType: z.enum(ACCEPTED_DOCUMENT_MIME),
  sizeBytes: z.number().int().positive().max(MAX_DOCUMENT_BYTES),
});

export const createDocumentUploadTicket = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ticketSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sessionId = data.sessionId ?? crypto.randomUUID();
    const ext = extensionFor(data.contentType)!;
    // Nome imprevedibile: il percorso non è indovinabile e non contiene il nome
    // originale del file caricato dall'utente.
    const path = `pending/${sessionId}/${data.tipo}-${crypto.randomUUID()}.${ext}`;

    const { data: signed, error } = await supabaseAdmin.storage
      .from(DOCUMENT_BUCKET)
      .createSignedUploadUrl(path);
    if (error || !signed) throw new Error(error?.message ?? "Upload non disponibile.");

    return { sessionId, path, token: signed.token };
  });

/**
 * Sposta i file caricati sotto la prenotazione e registra i riferimenti.
 * Usata solo lato server da createBookingRequest (client admin).
 */
export async function attachReservationDocuments(
  admin: {
    storage: {
      from: (bucket: string) => {
        list: (
          prefix: string,
          options?: Record<string, unknown>,
        ) => Promise<{ data: { name: string }[] | null; error: { message: string } | null }>;
        move: (from: string, to: string) => Promise<{ error: { message: string } | null }>;
        remove: (paths: string[]) => Promise<{ error: { message: string } | null }>;
      };
    };
    from: (table: string) => {
      insert: (rows: unknown) => Promise<{ error: { message: string } | null }>;
    };
  },
  params: {
    reservationId: string;
    sessionId: string;
    documents: { tipo: DocumentType; path: string }[];
  },
) {
  const { reservationId, sessionId, documents } = params;
  const prefix = `pending/${sessionId}/`;
  const rows: { reservation_id: string; tipo: DocumentType; storage_path: string }[] = [];

  // I file devono esistere davvero e appartenere alla sessione dichiarata:
  // il percorso arriva dal browser e non è mai considerato attendibile.
  const { data: listed, error: listError } = await admin.storage
    .from(DOCUMENT_BUCKET)
    .list(`pending/${sessionId}`, { limit: 100 });
  if (listError) throw new Error(listError.message);
  const available = new Set((listed ?? []).map((f) => `${prefix}${f.name}`));

  for (const doc of documents) {
    if (!doc.path.startsWith(prefix) || doc.path.includes("..")) {
      throw new Error("Documento non valido: ricarica i file richiesti.");
    }
    if (!available.has(doc.path)) {
      throw new Error("Un documento caricato non è più disponibile: ricaricalo e riprova.");
    }
    const ext = doc.path.split(".").pop() ?? "bin";
    const target = `reservations/${reservationId}/${doc.tipo}.${ext}`;
    const { error: moveError } = await admin.storage.from(DOCUMENT_BUCKET).move(doc.path, target);
    if (moveError) throw new Error(moveError.message);
    rows.push({ reservation_id: reservationId, tipo: doc.tipo, storage_path: target });
  }

  const { error: insertError } = await admin.from("documenti_prenotazione").insert(rows);
  if (insertError) throw new Error(insertError.message);

  // Pulizia degli eventuali residui della sessione (file sostituiti).
  const leftovers = [...available].filter((p) => !documents.some((d) => d.path === p));
  if (leftovers.length > 0) await admin.storage.from(DOCUMENT_BUCKET).remove(leftovers);

  return rows;
}

const listSchema = z.object({ reservationId: z.string().uuid() });

export type ReservationDocument = {
  id: string;
  tipo: DocumentType;
  storage_path: string;
  caricato_at: string;
  url: string;
  isPdf: boolean;
};

/**
 * Documenti di una prenotazione con URL firmata temporanea.
 * La visibilità è decisa dalle RLS di `documenti_prenotazione` lette con il
 * client dell'utente: staff del gestionale oppure cliente proprietario.
 */
export const getReservationDocuments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => listSchema.parse(input))
  .handler(async ({ data, context }): Promise<ReservationDocument[]> => {
    const { data: allowedRole, error: roleError } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["super_admin", "admin", "responsabile_sede", "front_desk"])
      .limit(1)
      .maybeSingle();
    if (roleError) throw new Error(roleError.message);
    if (!allowedRole) {
      // Il cliente mantiene l'accesso esclusivamente alla propria prenotazione;
      // la relativa policy RLS rende invisibile qualsiasi prenotazione altrui.
      const { data: ownedReservation, error: ownerError } = await context.supabase
        .from("reservations")
        .select("id")
        .eq("id", data.reservationId)
        .maybeSingle();
      if (ownerError || !ownedReservation) {
        throw new Error("Non sei autorizzato a consultare questi documenti.");
      }
    }

    const { data: rows, error } = await context.supabase
      .from("documenti_prenotazione")
      .select("id, tipo, storage_path, caricato_at")
      .eq("reservation_id", data.reservationId)
      .order("tipo");
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) return [];

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const out: ReservationDocument[] = [];
    for (const row of rows) {
      const { data: signed } = await supabaseAdmin.storage
        .from(DOCUMENT_BUCKET)
        .createSignedUrl(row.storage_path, 300);
      if (!signed?.signedUrl) continue;
      out.push({
        id: row.id,
        tipo: row.tipo as DocumentType,
        storage_path: row.storage_path,
        caricato_at: row.caricato_at,
        url: signed.signedUrl,
        isPdf: row.storage_path.endsWith(".pdf"),
      });
    }
    return out;
  });
