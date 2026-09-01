/**
 * Generazione, archiviazione e consegna delle ricevute di pagamento (Lotto 25).
 *
 * Stesso percorso già usato per i verbali (`verbali.server.ts`): PDF creato con
 * jsPDF, caricato nel bucket privato `ricevute`, collegato al pagamento e
 * recapitato al cliente via email con link firmato — mai in allegato.
 */
import { receiptPdfBytes, type ReceiptData } from "@/lib/receipt-pdf";
import { RICEVUTE_BUCKET, receiptPath } from "@/lib/receipts";

/** Validità del link inviato per email: 7 giorni, poi si rigenera dall'area clienti. */
const EMAIL_LINK_TTL_SECONDS = 7 * 24 * 60 * 60;

export async function createReceiptSignedUrl(
  storagePath: string,
  ttlSeconds = 300,
): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage
    .from(RICEVUTE_BUCKET)
    .createSignedUrl(storagePath, ttlSeconds);
  return data?.signedUrl ?? null;
}

/**
 * Genera (idempotente) la ricevuta di un pagamento incassato e la invia al
 * cliente. La fonte di verità è il database, non il payload del chiamante.
 */
export async function generateAndDeliverReceipt(
  paymentId: string,
): Promise<{ ok: boolean; path?: string; reason?: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: payment, error } = await supabaseAdmin
    .from("payments")
    .select(
      "id, reservation_id, provider, amount, status, type, created_at, updated_at, receipt_path, receipt_sent_at",
    )
    .eq("id", paymentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!payment) return { ok: false, reason: "pagamento_non_trovato" };
  if (payment.status !== "succeeded") return { ok: false, reason: "pagamento_non_incassato" };

  const { data: reservation, error: resErr } = await supabaseAdmin
    .from("reservations")
    .select(
      "id, code, date_from, date_to, customer_name, customer_email, customer_id, total_amount, branches(name, city), vehicles(plate, model)",
    )
    .eq("id", payment.reservation_id)
    .maybeSingle();
  if (resErr) throw new Error(resErr.message);
  if (!reservation) return { ok: false, reason: "prenotazione_non_trovata" };

  const branch = reservation.branches as unknown as { name: string; city: string } | null;
  const vehicle = reservation.vehicles as unknown as { plate: string; model: string } | null;

  const { data: customer } = reservation.customer_id
    ? await supabaseAdmin
        .from("customers")
        .select("fiscal_code, driving_license_number")
        .eq("id", reservation.customer_id)
        .maybeSingle()
    : { data: null };

  const documento = [
    customer?.fiscal_code ? `C.F. ${customer.fiscal_code}` : null,
    customer?.driving_license_number ? `Patente ${customer.driving_license_number}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const data: ReceiptData = {
    numero: `${reservation.code}-${payment.id.slice(0, 8).toUpperCase()}`,
    dataPagamento: payment.updated_at ?? payment.created_at,
    importo: Number(payment.amount ?? 0),
    metodo: payment.provider,
    tipo: payment.type,
    codice: reservation.code,
    dataDal: reservation.date_from,
    dataAl: reservation.date_to,
    sede: branch ? `${branch.name} (${branch.city})` : "—",
    veicolo: vehicle ? `${vehicle.model} · ${vehicle.plate}` : null,
    totaleNoleggio: Number(reservation.total_amount ?? 0),
    cliente: reservation.customer_name,
    clienteEmail: reservation.customer_email,
    clienteDocumento: documento || null,
  };

  const path = receiptPath(reservation.id, payment.id);
  const { error: upErr } = await supabaseAdmin.storage
    .from(RICEVUTE_BUCKET)
    .upload(path, receiptPdfBytes(data), { contentType: "application/pdf", upsert: true });
  if (upErr) throw new Error(upErr.message);

  const { error: linkErr } = await supabaseAdmin
    .from("payments")
    .update({ receipt_path: path })
    .eq("id", payment.id);
  if (linkErr) throw new Error(linkErr.message);

  if (reservation.customer_email) {
    const link = await createReceiptSignedUrl(path, EMAIL_LINK_TTL_SECONDS);
    if (link) {
      const { deliverReceiptNotification } = await import("@/lib/notifications.server");
      const euro = new Intl.NumberFormat("it-IT", {
        style: "currency",
        currency: "EUR",
      }).format(data.importo);
      const sent = await deliverReceiptNotification({
        paymentId: payment.id,
        reservationId: reservation.id,
        to: reservation.customer_email,
        cliente: reservation.customer_name,
        codice: reservation.code,
        importo: euro,
        link,
      });
      if (sent) {
        await supabaseAdmin
          .from("payments")
          .update({ receipt_sent_at: new Date().toISOString() })
          .eq("id", payment.id);
      }
    }
  }

  return { ok: true, path };
}

/** Non deve mai far fallire il flusso di pagamento: errori solo tracciati. */
export async function tryGenerateReceipt(paymentId: string): Promise<void> {
  try {
    await generateAndDeliverReceipt(paymentId);
  } catch (err) {
    console.error("[ricevute] generazione non riuscita", paymentId, err);
  }
}
