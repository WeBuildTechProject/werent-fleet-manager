/**
 * Servizio di invio notifiche transazionali (server-only).
 *
 * - `sendViaChannel` isola il canale: email implementato, whatsapp predisposto
 *   ma non attivo (errore esplicito).
 * - `enqueueScheduledNotifications` popola la coda dalle scadenze veicolo e
 *   dalle prenotazioni in rientro.
 * - `processNotificationQueue` invia le righe in stato `in_coda`.
 */
import {
  expirationThresholds,
  requiresMarketingConsent,
  type NotificationChannel,
  type NotificationType,
} from "./notifications";

type Payload = Record<string, unknown>;

const templateByType: Record<NotificationType, string> = {
  scadenza_veicolo: "scadenza-veicolo",
  fine_noleggio_imminente: "fine-noleggio-imminente",
  documento_in_scadenza: "documento-in-scadenza",
  conferma_prenotazione: "conferma-prenotazione",
  verbale_consegna: "verbale-consegna",
  verbale_rientro: "verbale-rientro",
  ricevuta_pagamento: "ricevuta-pagamento",
  altro: "conferma-prenotazione",
};

async function getSetting(key: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return data?.value?.trim() ? data.value.trim() : null;
}

type ChannelPayload = {
  to: string;
  tipo: NotificationType;
  data: Record<string, unknown>;
  idempotencyKey: string;
};

/** Unico punto di uscita verso i canali di consegna. */
export async function sendViaChannel(
  canale: NotificationChannel,
  payload: ChannelPayload,
): Promise<{ sent: boolean; reason?: string }> {
  switch (canale) {
    case "email": {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      const result = await sendTemplateEmail(templateByType[payload.tipo], payload.to, {
        templateData: payload.data,
        idempotencyKey: payload.idempotencyKey,
      });
      return result.sent ? { sent: true } : { sent: false, reason: result.reason };
    }
    case "whatsapp":
      throw new Error(
        "Canale WhatsApp non ancora attivo: nessun fornitore configurato.",
      );
    default: {
      const never: never = canale;
      throw new Error(`Canale sconosciuto: ${String(never)}`);
    }
  }
}

/* ------------------------ Ricevute di pagamento -------------------------- */

/**
 * Invio della ricevuta di pagamento al cliente: solo link firmato, mai allegato.
 * Dedupe per pagamento + destinatario, così un secondo tentativo non duplica
 * l'email già recapitata.
 */
export async function deliverReceiptNotification(params: {
  paymentId: string;
  reservationId: string;
  to: string;
  cliente: string;
  codice: string;
  importo: string;
  link: string;
}): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const tipo: NotificationType = "ricevuta_pagamento";
  const payload = {
    cliente: params.cliente,
    codice: params.codice,
    importo: params.importo,
    link: params.link,
  };
  const dedupeKey = `${tipo}:${params.paymentId}:${params.to}`;

  const { data: row, error } = await supabaseAdmin
    .from("notifications")
    .upsert(
      {
        tipo,
        canale: "email",
        destinatario_email: params.to,
        riferimento_tipo: "payment",
        riferimento_id: params.paymentId,
        dedupe_key: dedupeKey,
        payload,
      } as never,
      { onConflict: "dedupe_key", ignoreDuplicates: false },
    )
    .select("id, stato")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error("Notifica ricevuta non registrata.");
  if (row.stato === "inviata") return true;

  try {
    const outcome = await sendViaChannel("email", {
      to: params.to,
      tipo,
      data: payload,
      idempotencyKey: dedupeKey,
    });
    await supabaseAdmin
      .from("notifications")
      .update(
        outcome.sent
          ? { stato: "inviata", sent_at: new Date().toISOString(), errore: null }
          : { stato: "fallita", errore: `Invio non riuscito (${outcome.reason ?? "sconosciuto"})` },
      )
      .eq("id", row.id);
    return outcome.sent;
  } catch (err) {
    await supabaseAdmin
      .from("notifications")
      .update({ stato: "fallita", errore: err instanceof Error ? err.message : String(err) })
      .eq("id", row.id);
    return false;
  }
}

/* --------------------------- Verbali (Lotto 23) -------------------------- */

/**
 * Invio immediato del verbale di consegna/rientro: cliente + indirizzi interni.
 * L'email contiene solo un link firmato al PDF su storage privato, mai il file
 * in allegato. Ogni invio è tracciato in `notifications` (dedupe per
 * prenotazione + destinatario, così un secondo passaggio non duplica l'email).
 */
export async function deliverVerbaleNotifications(params: {
  reservationId: string;
  kind: "consegna" | "rientro";
  link: string;
  codice: string;
  targa: string;
  cliente: string;
  recipients: string[];
}): Promise<{ inviate: number; fallite: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const tipo: NotificationType =
    params.kind === "consegna" ? "verbale_consegna" : "verbale_rientro";
  const payload = {
    cliente: params.cliente,
    codice: params.codice,
    targa: params.targa,
    link: params.link,
  };

  let inviate = 0;
  let fallite = 0;
  const destinatari = [...new Set(params.recipients.map((e) => e.trim()).filter(Boolean))];

  for (const to of destinatari) {
    const dedupeKey = `${tipo}:${params.reservationId}:${to}`;
    const { data: row, error: queueError } = await supabaseAdmin
      .from("notifications")
      .upsert(
        {
          tipo,
          canale: "email",
          destinatario_email: to,
          riferimento_tipo: "reservation",
          riferimento_id: params.reservationId,
          dedupe_key: dedupeKey,
          payload,
        } as never,
        { onConflict: "dedupe_key", ignoreDuplicates: false },
      )
      .select("id, stato")
      .maybeSingle();
    if (queueError) throw new Error(queueError.message);
    if (!row) throw new Error("Notifica verbale non registrata.");

    // Già inviata in precedenza: non si spedisce due volte lo stesso verbale.
    if (row.stato === "inviata") continue;

    try {
      const outcome = await sendViaChannel("email", {
        to,
        tipo,
        data: payload,
        idempotencyKey: dedupeKey,
      });
      if (!outcome.sent) {
        if (row?.id) {
          await supabaseAdmin
            .from("notifications")
            .update({
              stato: "fallita",
              errore: `Destinatario non contattabile (${outcome.reason ?? "soppresso"})`,
            })
            .eq("id", row.id);
        }
        fallite += 1;
        continue;
      }
      if (row?.id) {
        await supabaseAdmin
          .from("notifications")
          .update({ stato: "inviata", sent_at: new Date().toISOString(), errore: null })
          .eq("id", row.id);
      }
      inviate += 1;
    } catch (error) {
      if (row?.id) {
        await supabaseAdmin
          .from("notifications")
          .update({
            stato: "fallita",
            errore: error instanceof Error ? error.message : String(error),
          })
          .eq("id", row.id);
      }
      fallite += 1;
    }
  }

  return { inviate, fallite };
}

/* ------------------------------ Accodamento ----------------------------- */

type NewNotification = {
  tipo: NotificationType;
  canale?: NotificationChannel;
  destinatario_email: string;
  riferimento_tipo: string;
  riferimento_id: string;
  dedupe_key: string;
  payload: Payload;
};

const fmtDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("it-IT") : "—";

const addDays = (days: number) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

async function staffRecipients(branchId: string | null): Promise<string[]> {
  const configured = await getSetting("notifiche_email_staff");
  if (configured) {
    return configured
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
  }
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: roles } = await supabaseAdmin
    .from("user_roles")
    .select("user_id, role")
    .in("role", ["responsabile_sede", "admin", "super_admin"]);
  const ids = (roles ?? []).map((r) => r.user_id);
  if (ids.length === 0) return [];
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, email, branch_id")
    .in("id", ids);
  const all = (profiles ?? []).filter((pr) => pr.email);
  const managerIds = new Set(
    (roles ?? []).filter((r) => r.role === "responsabile_sede").map((r) => r.user_id),
  );
  const managers = all.filter(
    (pr) => managerIds.has(pr.id) && (!branchId || pr.branch_id === branchId),
  );
  const chosen = managers.length > 0 ? managers : all;
  return [...new Set(chosen.map((pr) => pr.email))];
}

/** Inserisce le notifiche previste per oggi, saltando i duplicati. */
export async function enqueueScheduledNotifications(): Promise<{
  scadenze: number;
  rientri: number;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const rows: NewNotification[] = [];

  // 1. Scadenze veicolo a 7/3/1 giorni.
  const { data: expirations } = await supabaseAdmin
    .from("vehicle_expirations")
    .select(
      "id, tipo, data_scadenza, priorita, vehicle_id, vehicles(plate, model, branch_id, branches(name))",
    )
    .eq("eseguita", false)
    .not("data_scadenza", "is", null)
    .lte("data_scadenza", addDays(Math.max(...expirationThresholds)))
    .gte("data_scadenza", addDays(0));

  for (const exp of expirations ?? []) {
    const target = expirationThresholds.find((t) => exp.data_scadenza === addDays(t));
    if (!target) continue;
    const vehicle = exp.vehicles as unknown as
      | {
          plate: string;
          model: string;
          branch_id: string | null;
          branches: { name: string } | null;
        }
      | null;
    const recipients = await staffRecipients(vehicle?.branch_id ?? null);
    for (const email of recipients) {
      rows.push({
        tipo: "scadenza_veicolo",
        destinatario_email: email,
        riferimento_tipo: "vehicle_expiration",
        riferimento_id: exp.id,
        dedupe_key: `scadenza_veicolo:${exp.id}:${target}:${email}`,
        payload: {
          targa: vehicle?.plate ?? "—",
          modello: vehicle?.model ?? "—",
          sede: vehicle?.branches?.name ?? "—",
          tipo_scadenza: exp.tipo,
          data_scadenza: fmtDate(exp.data_scadenza),
          giorni: target,
          priorita: exp.priorita,
        },
      });
    }
  }
  const scadenze = rows.length;

  // 2. Prenotazioni in corso con rientro entro 24 ore.
  const { data: reservations } = await supabaseAdmin
    .from("reservations")
    .select(
      "id, code, customer_name, customer_email, date_to, vehicles(model), branches(name)",
    )
    .eq("status", "in_corso")
    .gte("date_to", addDays(0))
    .lte("date_to", addDays(1));

  for (const res of reservations ?? []) {
    if (!res.customer_email) continue;
    rows.push({
      tipo: "fine_noleggio_imminente",
      destinatario_email: res.customer_email,
      riferimento_tipo: "reservation",
      riferimento_id: res.id,
      dedupe_key: `fine_noleggio_imminente:${res.id}`,
      payload: {
        codice: res.code,
        cliente: res.customer_name,
        modello: (res.vehicles as unknown as { model: string } | null)?.model ?? "—",
        sede: (res.branches as unknown as { name: string } | null)?.name ?? "—",
        data_rientro: fmtDate(res.date_to),
      },
    });
  }

  for (const row of rows) {
    await supabaseAdmin
      .from("notifications")
      .upsert({ ...row, canale: row.canale ?? "email" } as never, {
        onConflict: "dedupe_key",
        ignoreDuplicates: true,
      });
  }

  return { scadenze, rientri: rows.length - scadenze };
}

/* -------------------------------- Invio -------------------------------- */

export async function processNotificationQueue(limit = 50): Promise<{
  inviate: number;
  fallite: number;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: queued } = await supabaseAdmin
    .from("notifications")
    .select("id, tipo, canale, destinatario_email, payload")
    .eq("stato", "in_coda")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(limit);

  let inviate = 0;
  let fallite = 0;

  for (const row of queued ?? []) {
    const tipo = row.tipo as NotificationType;
    try {
      // Punto di controllo consenso marketing (oggi nessun tipo lo richiede).
      if (requiresMarketingConsent(tipo)) {
        throw new Error("Consenso marketing richiesto e non verificato.");
      }
      if (!row.destinatario_email) {
        throw new Error("Destinatario email mancante.");
      }
      const outcome = await sendViaChannel(row.canale as NotificationChannel, {
        to: row.destinatario_email,
        tipo,
        data: (row.payload ?? {}) as Payload,
        idempotencyKey: `${tipo}-${row.id}`,
      });
      if (!outcome.sent) {
        // Destinatario soppresso lato provider (bounce/reclamo/disiscrizione):
        // esito atteso, non un errore da ritentare.
        await supabaseAdmin
          .from("notifications")
          .update({ stato: "fallita", errore: `Destinatario non contattabile (${outcome.reason ?? "soppresso"})` })
          .eq("id", row.id);
        fallite += 1;
        continue;
      }
      await supabaseAdmin
        .from("notifications")
        .update({ stato: "inviata", sent_at: new Date().toISOString(), errore: null })
        .eq("id", row.id);
      inviate += 1;
    } catch (error) {
      await supabaseAdmin
        .from("notifications")
        .update({
          stato: "fallita",
          errore: error instanceof Error ? error.message : String(error),
        })
        .eq("id", row.id);
      fallite += 1;
    }
  }

  return { inviate, fallite };
}
