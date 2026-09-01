/**
 * Programma fedeltà a livelli (Lotto 13).
 *
 * Scelta di modello: NESSUN saldo punti e nessun libro mastro da riconciliare.
 * Il livello del cliente è ricalcolato dinamicamente contando i noleggi
 * CONCLUSI (`reservations.status = 'chiusa'`) degli ultimi 12 mesi.
 * Unico punto di verità del calcolo: questo file.
 */

export type LoyaltyTier = {
  id: string;
  nome: string;
  soglia_noleggi_12_mesi: number;
  sconto_percentuale: number;
  sort_order: number;
  active: boolean;
};

export type LoyaltyStatus = {
  /** Noleggi conclusi negli ultimi 12 mesi. */
  rentals: number;
  /** Livello raggiunto (il più alto con soglia soddisfatta). */
  tier: LoyaltyTier | null;
  /** Livello successivo, se esiste. */
  nextTier: LoyaltyTier | null;
  /** Noleggi mancanti al livello successivo (0 se non c'è). */
  rentalsToNext: number;
};

/** Regola di cumulabilità fra sconto fedeltà e coupon. */
export type LoyaltyStacking = "best" | "stack";

export const LOYALTY_STACKING_SETTING_KEY = "loyalty_stacking";

export function parseLoyaltyStacking(value: string | null | undefined): LoyaltyStacking {
  return value === "stack" ? "stack" : "best";
}

/** Finestra di osservazione: 12 mesi pieni a partire da oggi. */
export function loyaltyWindowStart(now: Date = new Date()): string {
  const d = new Date(now);
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

export function resolveLoyaltyStatus(
  tiers: LoyaltyTier[],
  rentals: number,
): LoyaltyStatus {
  const sorted = tiers
    .filter((t) => t.active)
    .slice()
    .sort(
      (a, b) =>
        a.soglia_noleggi_12_mesi - b.soglia_noleggi_12_mesi || a.sort_order - b.sort_order,
    );
  let tier: LoyaltyTier | null = null;
  for (const t of sorted) {
    if (rentals >= t.soglia_noleggi_12_mesi) tier = t;
  }
  const nextTier =
    sorted.find((t) => t.soglia_noleggi_12_mesi > (tier?.soglia_noleggi_12_mesi ?? -1)) ?? null;
  return {
    rentals,
    tier,
    nextTier,
    rentalsToNext: nextTier ? Math.max(0, nextTier.soglia_noleggi_12_mesi - rentals) : 0,
  };
}

type MinimalClient = {
  from: (table: string) => {
    select: (
      cols: string,
      opts?: { count: "exact"; head: true },
    ) => any;
  };
};

/**
 * Carica livelli + noleggi conclusi e restituisce lo stato fedeltà del cliente.
 * Accetta qualunque client Supabase (admin lato server, autenticato nel portale).
 */
export async function loadLoyaltyStatus(
  client: MinimalClient,
  customerId: string | null | undefined,
  now: Date = new Date(),
): Promise<LoyaltyStatus> {
  const { data: tierRows } = await client.from("loyalty_tiers").select("*");
  const tiers = ((tierRows ?? []) as LoyaltyTier[]).map((t) => ({
    ...t,
    soglia_noleggi_12_mesi: Number(t.soglia_noleggi_12_mesi) || 0,
    sconto_percentuale: Number(t.sconto_percentuale) || 0,
  }));
  if (!customerId) return resolveLoyaltyStatus(tiers, 0);

  const { count } = await client
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId)
    .eq("status", "chiusa")
    .gte("date_to", loyaltyWindowStart(now));

  return resolveLoyaltyStatus(tiers, Number(count ?? 0));
}

export type LoyaltyPreview = {
  tierName: string | null;
  discountPct: number;
  rentals: number;
  nextTierName: string | null;
  rentalsToNext: number;
  stacking: LoyaltyStacking;
};

export const toLoyaltyPreview = (
  status: LoyaltyStatus,
  stacking: LoyaltyStacking,
): LoyaltyPreview => ({
  tierName: status.tier?.nome ?? null,
  discountPct: Number(status.tier?.sconto_percentuale ?? 0),
  rentals: status.rentals,
  nextTierName: status.nextTier?.nome ?? null,
  rentalsToNext: status.rentalsToNext,
  stacking,
});

/** Lettura della regola di cumulabilità da app_settings (default: "best"). */
export async function readLoyaltyStacking(client: {
  from: (t: string) => any;
}): Promise<LoyaltyStacking> {
  const { data } = await client
    .from("app_settings")
    .select("value")
    .eq("key", LOYALTY_STACKING_SETTING_KEY)
    .maybeSingle();
  return parseLoyaltyStacking(data?.value ?? null);
}
