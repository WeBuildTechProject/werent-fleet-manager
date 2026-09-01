/**
 * Generazione, archiviazione e consegna dei verbali di consegna/rientro.
 *
 * Percorso unico (server-only): il PDF viene creato con jsPDF, caricato nel
 * bucket privato `verbali`, collegato alla prenotazione e recapitato via email
 * con un link firmato — mai come allegato, mai con URL pubblica permanente.
 */
import { handoverPdfBytes, type VerbaleData, type VerbaleDamage } from "@/lib/handover-pdf";
import {
  VERBALE_INTERNAL_RECIPIENTS,
  VERBALI_BUCKET,
  verbalePath,
  type VerbaleKind,
} from "@/lib/verbali";

/** Validità del link inviato per email: 7 giorni, poi si rigenera dall'area riservata. */
const EMAIL_LINK_TTL_SECONDS = 7 * 24 * 60 * 60;

export async function createVerbaleSignedUrl(
  reservationId: string,
  kind: VerbaleKind,
  ttlSeconds = 300,
): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.storage
    .from(VERBALI_BUCKET)
    .createSignedUrl(verbalePath(reservationId, kind), ttlSeconds);
  return data?.signedUrl ?? null;
}

/**
 * Costruisce il verbale a partire dai dati già salvati sulla prenotazione:
 * la fonte di verità è il database, non il payload inviato dal browser.
 */
export async function generateAndDeliverVerbale(
  reservationId: string,
  kind: VerbaleKind,
): Promise<{ ok: boolean; path?: string; reason?: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const isConsegna = kind === "consegna";

  const { data: reservation, error } = await supabaseAdmin
    .from("reservations")
    .select(
      "id, code, date_from, date_to, customer_name, customer_email, customer_id, vehicle_id, checkout_km, checkout_fuel_liters, checkout_equipment, checkin_equipment, signed_at, signature_data_url, checkin_km, checkin_fuel_liters, checkin_signed_at, checkin_signature_data_url, checkout_data_confirmed_at, checkin_data_confirmed_at, contract_accepted_at, contract_version, branches(name, city), vehicles(plate, model, fuel_capacity_liters, vehicle_categories(label_it, code))",
    )
    .eq("id", reservationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!reservation) throw new Error("Prenotazione non trovata.");

  const vehicle = reservation.vehicles as unknown as
    | {
        plate: string;
        model: string;
        fuel_capacity_liters: number | null;
        vehicle_categories: { label_it: string; code: string } | null;
      }
    | null;
  const branch = reservation.branches as unknown as { name: string; city: string } | null;

  const firmaDataUrl = isConsegna
    ? reservation.signature_data_url
    : reservation.checkin_signature_data_url;
  const firmaAt = isConsegna ? reservation.signed_at : reservation.checkin_signed_at;
  const dataConfirmedAt = isConsegna
    ? reservation.checkout_data_confirmed_at
    : reservation.checkin_data_confirmed_at;
  // Nessun verbale senza firma: la formalizzazione è la firma stessa.
  if (!firmaDataUrl || !firmaAt) {
    return { ok: false, reason: "firma_mancante" };
  }

  const { data: customer } = reservation.customer_id
    ? await supabaseAdmin
        .from("customers")
        .select("fiscal_code, driving_license_number")
        .eq("id", reservation.customer_id)
        .maybeSingle()
    : { data: null };

  const { data: damageRows } = await supabaseAdmin
    .from("vehicle_damages")
    .select(
      "view, description, charge_amount, damage_type, severity, damage_components(label_it), damage_severities(label_it)",
    )
    .eq("reservation_id", reservationId)
    .eq("phase", isConsegna ? "preesistente" : "rientro");

  const danni: VerbaleDamage[] = (damageRows ?? []).map((d) => {
    const component = d.damage_components as unknown as { label_it: string } | null;
    const severity = d.damage_severities as unknown as { label_it: string } | null;
    return {
      label: `${component?.label_it ?? d.damage_type} · ${severity?.label_it ?? d.severity}`,
      view: String(d.view),
      description: d.description,
      charge_amount: Number(d.charge_amount ?? 0),
    };
  });

  const documento = [
    customer?.driving_license_number ? `Patente ${customer.driving_license_number}` : null,
    customer?.fiscal_code ? `C.F. ${customer.fiscal_code}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const data: VerbaleData = {
    tipo: kind,
    codice: reservation.code,
    dataDal: reservation.date_from,
    dataAl: reservation.date_to,
    sede: branch ? `${branch.name} (${branch.city})` : "—",
    cliente: reservation.customer_name,
    clienteEmail: reservation.customer_email,
    clienteDocumento: documento || null,
    targa: vehicle?.plate ?? "—",
    modello: vehicle?.model ?? "—",
    categoria: vehicle?.vehicle_categories?.label_it ?? "—",
    km: Number((isConsegna ? reservation.checkout_km : reservation.checkin_km) ?? 0),
    carburanteLitri: Number(
      (isConsegna ? reservation.checkout_fuel_liters : reservation.checkin_fuel_liters) ?? 0,
    ),
    capacitaLitri: vehicle?.fuel_capacity_liters ? Number(vehicle.fuel_capacity_liters) : null,
    dotazioni: (isConsegna ? reservation.checkout_equipment : reservation.checkin_equipment ?? []) as string[],
    danni,
    firmaDataUrl,
    firmaAt,
    dataConfirmedAt,
    contractAcceptedAt: reservation.contract_accepted_at,
    contractVersion: reservation.contract_version,
  };

  const bytes = handoverPdfBytes(data);
  const path = verbalePath(reservationId, kind);

  const { error: upErr } = await supabaseAdmin.storage
    .from(VERBALI_BUCKET)
    .upload(path, bytes, { contentType: "application/pdf", upsert: true });
  if (upErr) throw new Error(upErr.message);

  const { error: linkErr } = await supabaseAdmin
    .from("reservations")
    .update(isConsegna ? { verbale_consegna_url: path } : { verbale_rientro_url: path })
    .eq("id", reservationId);
  if (linkErr) throw new Error(linkErr.message);

  const link = await createVerbaleSignedUrl(reservationId, kind, EMAIL_LINK_TTL_SECONDS);
  if (link) {
    const { deliverVerbaleNotifications } = await import("@/lib/notifications.server");
    await deliverVerbaleNotifications({
      reservationId,
      kind,
      link,
      codice: reservation.code,
      targa: vehicle?.plate ?? "—",
      cliente: reservation.customer_name,
      recipients: [
        ...(reservation.customer_email ? [reservation.customer_email] : []),
        ...VERBALE_INTERNAL_RECIPIENTS,
      ],
    });
  }

  return { ok: true, path };
}
