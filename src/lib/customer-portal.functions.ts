import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Portale self-service cliente (Lotto 11).
 *
 * Sistema di accesso completamente separato da quello dello staff:
 * il cliente riceve un magic link sull'indirizzo già presente in
 * `customers.email`. Nessuna password, nessun ruolo staff (il trigger
 * `handle_new_user` non assegna ruoli agli account del portale).
 *
 * Tutte le letture dei dati cliente passano dal client autenticato
 * (`context.supabase`), quindi sono filtrate dalle RLS dedicate
 * (`current_customer_id()`), non dal service role.
 */

const RATE_LIMIT_WINDOW_MIN = 15;
const RATE_LIMIT_MAX = 3;

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(160),
  origin: z.string().trim().url().max(200),
});

export const requestCustomerMagicLink = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => loginSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Rate limit: max 3 richieste ogni 15 minuti per indirizzo.
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MIN * 60_000).toISOString();
    const { count } = await supabaseAdmin
      .from("customer_login_requests")
      .select("id", { count: "exact", head: true })
      .ilike("email", data.email)
      .gte("created_at", since);
    if ((count ?? 0) >= RATE_LIMIT_MAX) {
      throw new Error(
        `Troppe richieste di accesso: riprova tra ${RATE_LIMIT_WINDOW_MIN} minuti.`,
      );
    }
    await supabaseAdmin.from("customer_login_requests").insert({ email: data.email });

    const { data: customer } = await supabaseAdmin
      .from("customers")
      .select("id, blacklisted")
      .ilike("email", data.email)
      .maybeSingle();

    // Risposta sempre identica: non rivelare se l'indirizzo è in anagrafica.
    if (!customer || customer.blacklisted) return { ok: true };

    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
            h.delete("Authorization");
          }
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const { error } = await client.auth.signInWithOtp({
      email: data.email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${data.origin}/area-clienti`,
        data: { portal: "customer" },
      },
    });
    if (error) throw new Error("Invio del link non riuscito: riprova più tardi.");
    return { ok: true };
  });

export type PortalReservation = {
  id: string;
  code: string;
  date_from: string;
  date_to: string;
  status: string;
  total_amount: number;
  customer_name: string;
  customer_email: string;
  vehicle_model: string | null;
  contract_accepted_at: string | null;
  contract_version: number | null;
  verbale_consegna_url: string | null;
  verbale_rientro_url: string | null;
};

export type PortalInvoice = {
  id: string;
  reservation_id: string;
  numero_fattura: string;
  anno: number;
  progressivo: number;
  data_emissione: string;
  imponibile: number;
  iva: number;
  totale: number;
  stato: string;
  pdf_url: string | null;
  cliente_denominazione: string;
  cliente_piva_cf: string;
};

export type PortalData = {
  customer: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    consenso_marketing: boolean;
    consenso_profilazione: boolean;
    consenso_privacy_at: string | null;
  } | null;
  reservations: PortalReservation[];
  invoices: PortalInvoice[];
};

/**
 * Collega (al primo accesso) l'utente Supabase Auth alla scheda cliente
 * corrispondente per email, poi restituisce i soli dati del cliente stesso.
 * Nessun dato interno (note, margini, costi manutenzione) viene esposto.
 */
export const getCustomerPortalData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PortalData> => {
    const email = String(
      (context.claims as { email?: string } | null)?.email ?? "",
    ).toLowerCase();

    let { data: customer } = await context.supabase
      .from("customers")
      .select(
        "id, full_name, email, phone, consenso_marketing, consenso_profilazione, consenso_privacy_at",
      )
      .eq("auth_user_id", context.userId)
      .maybeSingle();

    const portalClaim = (
      context.claims as { user_metadata?: { portal?: string } } | null
    )?.user_metadata?.portal;
    if (!customer && email && portalClaim === "customer") {
      // Primo accesso: collega l'account all'anagrafica esistente (match email).
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: match } = await supabaseAdmin
        .from("customers")
        .select("id, auth_user_id, blacklisted")
        .ilike("email", email)
        .maybeSingle();
      if (match && !match.blacklisted && !match.auth_user_id) {
        await supabaseAdmin
          .from("customers")
          .update({ auth_user_id: context.userId })
          .eq("id", match.id)
          .is("auth_user_id", null);
        const reread = await context.supabase
          .from("customers")
          .select(
            "id, full_name, email, phone, consenso_marketing, consenso_profilazione, consenso_privacy_at",
          )
          .eq("auth_user_id", context.userId)
          .maybeSingle();
        customer = reread.data;
      }
    }

    if (!customer) return { customer: null, reservations: [], invoices: [] };

    const [resRes, invRes] = await Promise.all([
      context.supabase
        .from("reservations")
        .select(
          "id, code, date_from, date_to, status, total_amount, customer_name, customer_email, vehicle_id, contract_accepted_at, contract_version, verbale_consegna_url, verbale_rientro_url",
        )
        .order("date_from", { ascending: false }),
      context.supabase
        .from("invoices")
        .select(
          "id, reservation_id, numero_fattura, anno, progressivo, data_emissione, imponibile, iva, totale, stato, pdf_url, cliente_denominazione, cliente_piva_cf",
        )
        .order("data_emissione", { ascending: false }),
    ]);

    const rows = resRes.data ?? [];
    const vehicleIds = [...new Set(rows.map((r) => r.vehicle_id).filter(Boolean))] as string[];
    const models = new Map<string, string>();
    if (vehicleIds.length > 0) {
      // La tabella flotta non è leggibile dal cliente via RLS: leggiamo solo
      // il modello dei veicoli effettivamente presenti nelle sue prenotazioni.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: vehicles } = await supabaseAdmin
        .from("vehicles")
        .select("id, model")
        .in("id", vehicleIds);
      for (const v of vehicles ?? []) models.set(v.id, v.model);
    }

    return {
      customer,
      reservations: rows.map((r) => ({
        id: r.id,
        code: r.code,
        date_from: r.date_from,
        date_to: r.date_to,
        status: r.status,
        total_amount: Number(r.total_amount) || 0,
        customer_name: r.customer_name,
        customer_email: r.customer_email,
        vehicle_model: r.vehicle_id ? (models.get(r.vehicle_id) ?? null) : null,
        contract_accepted_at: r.contract_accepted_at,
        contract_version: r.contract_version,
        verbale_consegna_url: r.verbale_consegna_url,
        verbale_rientro_url: r.verbale_rientro_url,
      })),
      invoices: (invRes.data ?? []) as PortalInvoice[],
    };
  });

const consentSchema = z.object({
  consenso_marketing: z.boolean(),
  consenso_profilazione: z.boolean(),
});

/**
 * Aggiorna SOLO i consensi revocabili sull'anagrafica viva (`customers`).
 * Le colonne di consenso storiche su `reservations` restano immutabili:
 * sono lo snapshot legale del contratto firmato.
 */
export const updateCustomerConsents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => consentSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("customers")
      .update({
        consenso_marketing: data.consenso_marketing,
        consenso_profilazione: data.consenso_profilazione,
      })
      .eq("auth_user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
