/**
 * Seed dati dimostrativi (Lotto 26). Esecuzione una volta sola, manuale:
 *   bun run scripts/seed-demo.ts
 * Usa la service role key dell'ambiente: non viene mai inviata email reale.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

import { handoverPdfBytes, type VerbaleData } from "../src/lib/handover-pdf";
import { receiptPdfBytes, type ReceiptData } from "../src/lib/receipt-pdf";
import { verbalePath } from "../src/lib/verbali";
import { receiptPath } from "../src/lib/receipts";

const url = process.env["SUPABASE_URL"]!;
const key = process.env["SUPABASE_SERVICE_ROLE_KEY"]!;
const admin = createClient(url, key, { auth: { persistSession: false } });

const SIG = readFileSync("/tmp/demo/sig.txt", "utf8").trim();
const CAG = "11111111-1111-1111-1111-111111111111";
const DEMO_CUSTOMER = "c0000000-0000-4000-8000-000000000099";
const CLIENTE_EMAIL = "cliente.test@werentsrl.com";
const OPERATORE_EMAIL = "operatore.demo@werentsrl.com";
const DEMO_PASSWORD = "DemoWeRent2026!";

async function insertNotification(row: Record<string, unknown>) {
  const { data: has } = await admin
    .from("notifications")
    .select("id")
    .eq("dedupe_key", row["dedupe_key"] as string)
    .maybeSingle();
  if (has) return;
  const { error } = await admin.from("notifications").insert(row);
  if (error) throw error;
}

async function ensureUser(email: string, meta: Record<string, unknown>) {
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const found = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (found) {
    await admin.auth.admin.updateUserById(found.id, {
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: meta,
    });
    return found.id;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: meta,
  });
  if (error) throw error;
  return data.user!.id;
}

async function main() {
  // ---- 1. Operatore demo con sede assegnata --------------------------------
  const operatoreId = await ensureUser(OPERATORE_EMAIL, {
    full_name: "Operatore Demo — Cagliari Elmas",
  });
  await admin
    .from("profiles")
    .upsert({
      id: operatoreId,
      full_name: "Operatore Demo — Cagliari Elmas",
      email: OPERATORE_EMAIL,
      assigned_branch_id: CAG,
      active: true,
    });
  await admin.from("user_roles").upsert(
    { user_id: operatoreId, role: "front_desk" },
    { onConflict: "user_id,role", ignoreDuplicates: true },
  );

  // ---- 2. Cliente demo con accesso diretto ---------------------------------
  const clienteId = await ensureUser(CLIENTE_EMAIL, {
    full_name: "Cliente Demo We Rent",
    portal: "customer",
  });
  await admin
    .from("customers")
    .update({
      auth_user_id: clienteId,
      full_name: "Cliente Demo We Rent",
      consenso_privacy_at: new Date().toISOString(),
      consenso_marketing: true,
    })
    .eq("id", DEMO_CUSTOMER);

  // ---- 3. Prenotazioni del cliente demo ------------------------------------
  const { data: reservations, error: resErr } = await admin
    .from("reservations")
    .select(
      "id, code, status, date_from, date_to, total_amount, customer_name, customer_email, branch_id, vehicle_id, branches(name, city), vehicles(plate, model, fuel_capacity_liters, vehicle_categories(label_it))",
    )
    .eq("customer_id", DEMO_CUSTOMER)
    .order("date_from", { ascending: false });
  if (resErr) throw resErr;

  const chiuse = (reservations ?? []).filter((r) => r.status === "chiusa").slice(0, 2);
  const confermata = (reservations ?? []).find((r) => r.status === "confermata");
  const now = new Date();

  for (const r of chiuse) {
    const v = r.vehicles as unknown as {
      plate: string;
      model: string;
      fuel_capacity_liters: number | null;
      vehicle_categories: { label_it: string } | null;
    } | null;
    const b = r.branches as unknown as { name: string; city: string } | null;
    const outAt = new Date(`${r.date_from}T09:30:00Z`).toISOString();
    const inAt = new Date(`${r.date_to}T18:15:00Z`).toISOString();
    const kmOut = 41200;
    const kmIn = kmOut + 780;
    const dotazioni = ["Ruota di scorta", "Triangolo", "Giubbotto catarifrangente", "Libretto"];

    await admin
      .from("reservations")
      .update({
        is_demo: true,
        checkout_at: outAt,
        checkout_km: kmOut,
        checkout_fuel_liters: 42,
        checkout_equipment: dotazioni,
        checkout_data_confirmed_at: outAt,
        signed_at: outAt,
        signature_data_url: SIG,
        checkin_at: inAt,
        checkin_km: kmIn,
        checkin_fuel_liters: 38,
        checkin_equipment: dotazioni,
        checkin_data_confirmed_at: inAt,
        checkin_signed_at: inAt,
        checkin_signature_data_url: SIG,
        consenso_privacy: true,
        consenso_marketing: true,
        consenso_profilazione: false,
        terms_accepted_at: outAt,
        privacy_accepted_at: outAt,
        contract_accepted_at: outAt,
        vexatious_accepted_at: outAt,
        terms_version: 1,
        contract_version: 1,
      })
      .eq("id", r.id);

    for (const kind of ["consegna", "rientro"] as const) {
      const isC = kind === "consegna";
      const data: VerbaleData = {
        tipo: kind,
        codice: r.code,
        dataDal: r.date_from,
        dataAl: r.date_to,
        sede: b ? `${b.name} (${b.city})` : "—",
        cliente: "Cliente Demo We Rent",
        clienteEmail: CLIENTE_EMAIL,
        clienteDocumento: "Patente CA1234567X · C.F. DEMO00X00X000X",
        targa: v?.plate ?? "—",
        modello: v?.model ?? "—",
        categoria: v?.vehicle_categories?.label_it ?? "—",
        km: isC ? kmOut : kmIn,
        carburanteLitri: isC ? 42 : 38,
        capacitaLitri: v?.fuel_capacity_liters ? Number(v.fuel_capacity_liters) : null,
        dotazioni,
        danni: isC
          ? [{ label: "Paraurti anteriore · Graffio leggero", view: "fronte", description: "Danno preesistente (demo)", charge_amount: 0 }]
          : [{ label: "Portiera destra · Graffio", view: "lato_destro", description: "Rilevato al rientro (demo)", charge_amount: 90 }],
        firmaDataUrl: SIG,
        firmaAt: isC ? outAt : inAt,
        dataConfirmedAt: isC ? outAt : inAt,
        contractAcceptedAt: outAt,
        contractVersion: 1,
      };
      const path = verbalePath(r.id, kind);
      const up = await admin.storage
        .from("verbali")
        .upload(path, handoverPdfBytes(data), { contentType: "application/pdf", upsert: true });
      if (up.error) throw up.error;
      await admin
        .from("reservations")
        .update(isC ? { verbale_consegna_url: path } : { verbale_rientro_url: path })
        .eq("id", r.id);
      await insertNotification({
          tipo: isC ? "verbale_consegna" : "verbale_rientro",
          canale: "email",
          destinatario_email: CLIENTE_EMAIL,
          riferimento_tipo: "reservation",
          riferimento_id: r.id,
          dedupe_key: `${isC ? "verbale_consegna" : "verbale_rientro"}:${r.id}:${CLIENTE_EMAIL}`,
          payload: { demo: true, codice: r.code },
          stato: "inviata",
          scheduled_for: isC ? outAt : inAt,
          sent_at: isC ? outAt : inAt,
      });
    }
    console.log("verbali demo pronti per", r.code);
  }

  // ---- 4. Pagamento con ricevuta -------------------------------------------
  const target = chiuse[0];
  if (target) {
    const b = target.branches as unknown as { name: string; city: string } | null;
    const v = target.vehicles as unknown as { plate: string; model: string } | null;
    const { data: existing } = await admin
      .from("payments")
      .select("id")
      .eq("reservation_id", target.id)
      .eq("status", "succeeded")
      .maybeSingle();
    let paymentId = existing?.id as string | undefined;
    if (!paymentId) {
      const ins = await admin
        .from("payments")
        .insert({
          reservation_id: target.id,
          provider: "contanti_pos",
          amount: Number(target.total_amount ?? 0),
          currency: "eur",
          status: "succeeded",
          type: "pagamento_completo",
          notes: "Pagamento demo (Lotto 26)",
        })
        .select("id")
        .single();
      if (ins.error) throw ins.error;
      paymentId = ins.data.id as string;
    }
    const rdata: ReceiptData = {
      numero: `${target.code}-${paymentId.slice(0, 8).toUpperCase()}`,
      dataPagamento: new Date(`${target.date_to}T18:30:00Z`).toISOString(),
      importo: Number(target.total_amount ?? 0),
      metodo: "contanti_pos",
      tipo: "pagamento_completo",
      codice: target.code,
      dataDal: target.date_from,
      dataAl: target.date_to,
      sede: b ? `${b.name} (${b.city})` : "—",
      veicolo: v ? `${v.model} · ${v.plate}` : null,
      totaleNoleggio: Number(target.total_amount ?? 0),
      cliente: "Cliente Demo We Rent",
      clienteEmail: CLIENTE_EMAIL,
      clienteDocumento: "C.F. DEMO00X00X000X",
    };
    const rpath = receiptPath(target.id, paymentId);
    const up = await admin.storage
      .from("ricevute")
      .upload(rpath, receiptPdfBytes(rdata), { contentType: "application/pdf", upsert: true });
    if (up.error) throw up.error;
    await admin
      .from("payments")
      .update({ receipt_path: rpath, receipt_sent_at: now.toISOString() })
      .eq("id", paymentId);
    await insertNotification({
        tipo: "ricevuta_pagamento",
        canale: "email",
        destinatario_email: CLIENTE_EMAIL,
        riferimento_tipo: "payment",
        riferimento_id: paymentId,
        dedupe_key: `ricevuta_pagamento:${paymentId}:${CLIENTE_EMAIL}`,
        payload: { demo: true, codice: target.code },
        stato: "inviata",
        scheduled_for: now.toISOString(),
      sent_at: now.toISOString(),
    });
    console.log("ricevuta demo pronta per", target.code, rpath);
  }

  // ---- 5. Documenti cliente + consensi su prenotazione futura --------------
  if (confermata) {
    const tipi = ["documento_identita", "tessera_sanitaria", "patente", "carta_pagamento"] as const;
    const stamp = new Date().toISOString();
    await admin
      .from("reservations")
      .update({
        is_demo: true,
        consenso_privacy: true,
        consenso_marketing: true,
        consenso_profilazione: true,
        terms_accepted_at: stamp,
        privacy_accepted_at: stamp,
        contract_accepted_at: stamp,
        vexatious_accepted_at: stamp,
        terms_version: 1,
        contract_version: 1,
      })
      .eq("id", confermata.id);
    for (const tipo of tipi) {
      const path = `${confermata.id}/${tipo}-demo.pdf`;
      const bytes = receiptPdfBytes({
        numero: `DEMO-${tipo}`,
        dataPagamento: stamp,
        importo: 0,
        metodo: "contanti_pos",
        tipo: "pagamento_completo",
        codice: confermata.code,
        dataDal: confermata.date_from,
        dataAl: confermata.date_to,
        sede: "Demo",
        veicolo: null,
        totaleNoleggio: 0,
        cliente: "Cliente Demo We Rent",
        clienteEmail: CLIENTE_EMAIL,
        clienteDocumento: `Documento demo: ${tipo}`,
      });
      const up = await admin.storage
        .from("documenti-clienti")
        .upload(path, bytes, { contentType: "application/pdf", upsert: true });
      if (up.error) throw up.error;
      const { data: has } = await admin
        .from("documenti_prenotazione")
        .select("id")
        .eq("reservation_id", confermata.id)
        .eq("tipo", tipo)
        .maybeSingle();
      if (!has) {
        const ins = await admin
          .from("documenti_prenotazione")
          .insert({ reservation_id: confermata.id, tipo, storage_path: path });
        if (ins.error) throw ins.error;
      }
    }
    console.log("documenti demo caricati per", confermata.code);
  }

  // ---- 6. Trasmissioni CaRGOS demo ----------------------------------------
  const { data: cargosTargets } = await admin
    .from("reservations")
    .select("id, code")
    .eq("is_demo", true)
    .limit(3);
  const stati = ["in_attesa", "inviato", "errore"] as const;
  let i = 0;
  for (const r of cargosTargets ?? []) {
    const stato = stati[i % stati.length]!;
    const { data: has } = await admin
      .from("cargos_transmissions")
      .select("id")
      .eq("reservation_id", r.id)
      .maybeSingle();
    if (!has) {
      const ins = await admin.from("cargos_transmissions").insert({
        reservation_id: r.id,
        payload: `DEMO-RECORD-${r.code}`.padEnd(120, " "),
        stato,
        ambiente: "mock",
        tentativi: stato === "errore" ? 2 : 1,
        transaction_id: stato === "inviato" ? `DEMO-TX-${r.code}` : null,
        errore: stato === "errore" ? { messaggio: "Errore demo di validazione (mock)" } : null,
        last_attempt_at: new Date().toISOString(),
        sent_at: stato === "inviato" ? new Date().toISOString() : null,
      });
      if (ins.error) throw ins.error;
    }
    i += 1;
  }
  console.log("trasmissioni CaRGOS demo:", cargosTargets?.length ?? 0);

  // ---- 7. Link di accesso diretto per il cliente demo ---------------------
  const link = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: CLIENTE_EMAIL,
    options: { redirectTo: "http://localhost:8080/area-clienti" },
  });
  if (link.error) throw link.error;
  console.log("MAGICLINK:", link.data.properties?.action_link);
  console.log("HASHED_TOKEN:", link.data.properties?.hashed_token);
}

main().then(() => console.log("done"));
