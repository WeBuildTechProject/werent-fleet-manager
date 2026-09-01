import { supabase } from "@/integrations/supabase/client";
import type {
  Extra,
  InsurancePackage,
  InsurancePackageComponent,
  InsuranceSpec,
  VehicleCategory,
} from "@/lib/gestionale";

/**
 * Dati pubblici del motore di prenotazione nativo (letti con la chiave
 * publishable, protetti da policy pubbliche in sola lettura).
 */

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T;
}

export const publicCategoriesQuery = {
  queryKey: ["booking", "categories"] as const,
  queryFn: async () =>
    unwrap<VehicleCategory[]>(
      await supabase
        .from("vehicle_categories")
        .select("*")
        .eq("active", true)
        .order("label_it"),
    ),
};

export const publicExtrasQuery = {
  queryKey: ["booking", "extras"] as const,
  queryFn: async () =>
    unwrap<Extra[]>(
      await supabase.from("extras").select("*").eq("active", true).order("price_per_day"),
    ),
};

/** Pacchetti assicurativi attivi + dizionario componenti (lettura pubblica). */
export const publicInsuranceQuery = {
  queryKey: ["booking", "insurance"] as const,
  queryFn: async () => {
    const [packages, specs, components] = await Promise.all([
      supabase.from("insurance_packages").select("*").eq("active", true).order("sort_order"),
      supabase.from("insurance_specs").select("*").eq("active", true),
      supabase.from("insurance_package_components").select("*"),
    ]);
    return {
      packages: unwrap<InsurancePackage[]>(packages),
      specs: unwrap<InsuranceSpec[]>(specs),
      components: unwrap<InsurancePackageComponent[]>(components),
    };
  },
};

/** Parametri di ricerca accettati da /prenota (deep-link dal SearchWidget). */
export type BookingSearch = {
  from?: string;
  to?: string;
  date_from?: string;
  time_from?: string;
  date_to?: string;
  time_to?: string;
  class?: string;
  /** Deep-link fasce promo: `estesa` pre-seleziona la copertura più protettiva. */
  insurance?: string;
  age?: string;
  promo?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  /** Ritorno da Stripe Checkout: `ok` | `annullato`. */
  pagamento?: string;
  code?: string;
};

const searchKeys: (keyof BookingSearch)[] = [
  "from",
  "to",
  "date_from",
  "time_from",
  "date_to",
  "time_to",
  "class",
  "insurance",
  "age",
  "promo",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "pagamento",
  "code",
];

export function parseBookingSearch(raw: Record<string, unknown>): BookingSearch {
  const out: BookingSearch = {};
  for (const key of searchKeys) {
    const value = raw[key];
    if (typeof value === "string" && value.length > 0) out[key] = value.slice(0, 120);
  }
  return out;
}
