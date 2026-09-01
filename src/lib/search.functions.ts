import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Ricerca globale del gestionale.
 * Le query passano dal client autenticato del middleware: valgono le stesse
 * RLS della navigazione normale, nessun bypass con la service role key.
 */

const searchSchema = z.object({ query: z.string().trim().min(2).max(64) });

export type SearchResult = {
  kind: "reservation" | "vehicle" | "customer";
  id: string;
  title: string;
  subtitle: string;
  to: string;
  search?: { q: string };
};

/** Escape dei caratteri speciali dei pattern PostgREST (`ilike`, virgole in `or`). */
function pattern(term: string) {
  return `%${term.replace(/[%,()]/g, " ")}%`;
}

export const globalSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => searchSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const like = pattern(data.query);

    const [reservations, vehicles, customers] = await Promise.all([
      supabase
        .from("reservations")
        .select("id, code, customer_name, customer_email, date_from, date_to, status")
        .or(`code.ilike.${like},customer_name.ilike.${like},customer_email.ilike.${like}`)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("vehicles")
        .select("id, plate, model, category, status")
        .or(`plate.ilike.${like},model.ilike.${like}`)
        .limit(5),
      supabase
        .from("customers")
        .select("id, full_name, email, phone, fiscal_code, blacklisted")
        .or(
          `full_name.ilike.${like},email.ilike.${like},phone.ilike.${like},fiscal_code.ilike.${like}`,
        )
        .limit(5),
    ]);

    const results: SearchResult[] = [];

    for (const r of reservations.data ?? []) {
      results.push({
        kind: "reservation",
        id: r.id,
        title: r.code,
        subtitle: `${r.customer_name} · ${r.date_from} → ${r.date_to}`,
        to: "/gestionale/prenotazioni",
        search: { q: r.code },
      });
    }

    for (const v of vehicles.data ?? []) {
      results.push({
        kind: "vehicle",
        id: v.id,
        title: v.plate,
        subtitle: `${v.model} · ${v.category}`,
        to: `/gestionale/veicoli/${v.id}`,
      });
    }

    const seenEmail = new Set<string>();
    for (const c of customers.data ?? []) {
      const key = c.email.trim().toLowerCase();
      if (seenEmail.has(key)) continue;
      seenEmail.add(key);
      results.push({
        kind: "customer",
        id: c.id,
        title: c.full_name || c.email,
        subtitle: [c.email, c.phone].filter(Boolean).join(" · "),
        to: "/gestionale/clienti",
        search: { q: c.email },
      });
    }

    return { results };
  });
