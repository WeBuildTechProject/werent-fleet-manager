import type { LoyaltyTier } from "@/lib/loyalty";
import { supabase } from "@/integrations/supabase/client";
import { listScopedReservations, listScopedVehicles } from "@/lib/staff.functions";
import type {
  DamagePriceConfig,
  Extra,
  InsurancePackage,
  InsurancePackageComponent,
  InsuranceSpec,
  RatePlan,
} from "@/lib/pricing";

export type {
  DamagePriceConfig,
  Extra,
  InsurancePackage,
  InsurancePackageComponent,
  InsuranceSpec,
  RatePlan,
};


export type AppRole =
  | "super_admin"
  | "admin"
  | "responsabile_sede"
  | "front_desk"
  | "manutentore"
  | "contabilita";

export const roleLabels: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  responsabile_sede: "Responsabile sede",
  front_desk: "Operatore front desk",
  manutentore: "Manutentore",
  contabilita: "Contabilità",
};

export const vehicleStatusLabels: Record<string, string> = {
  disponibile: "Disponibile",
  noleggiato: "Noleggiato",
  manutenzione: "In manutenzione",
  fuori_servizio: "Fuori servizio",
};

export const reservationStatusLabels: Record<string, string> = {
  bozza: "Bozza",
  confermata: "Confermata",
  in_corso: "In corso",
  chiusa: "Chiusa",
  annullata: "Annullata",
};

export const damageViews = [
  { id: "fronte", label: "Fronte" },
  { id: "retro", label: "Retro" },
  { id: "lato_sx", label: "Lato sinistro" },
  { id: "lato_dx", label: "Lato destro" },
] as const;

export type DamageView = (typeof damageViews)[number]["id"];

export type Branch = {
  id: string;
  code: string;
  name: string;
  city: string;
  address: string;
  /** Flag storico: una sede disattivata non compare nei flussi operativi. */
  active: boolean;
};

export type Vehicle = {
  id: string;
  plate: string;
  model: string;
  /** Legacy testuale, mantenuto per compatibilità con src/lib/fleet.ts. */
  category: string;
  category_id: string | null;
  branch_id: string | null;
  status: string;
  daily_rate: number;
  mileage: number;
  next_service_date: string | null;
  /** Capacità reale del serbatoio: il carburante si misura sempre in litri. */
  fuel_capacity_liters: number;

};

export type Partner = {
  id: string;
  company_name: string;
  vat_number: string;
  contact_name: string;
  email: string;
  phone: string;
  discount_pct: number;
  status: string;
  notes: string | null;
};

export type Reservation = {
  id: string;
  code: string;
  vehicle_id: string | null;
  branch_id: string | null;
  partner_id: string | null;
  customer_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  date_from: string;
  date_to: string;
  status: string;
  total_amount: number;
  notes: string | null;
  /** Consegna (check-out) */
  checkout_at: string | null;
  checkout_km: number | null;
  checkout_fuel_liters: number | null;
  checkout_equipment: string[] | null;
  signed_at: string | null;
  signature_data_url: string | null;
  /** Rientro (check-in) */
  checkin_at: string | null;
  checkin_km: number | null;
  checkin_fuel_liters: number | null;
  checkin_equipment: string[] | null;
  checkin_signed_at: string | null;
  checkin_signature_data_url: string | null;
  extra_km_amount: number;
  /** Componenti del totale contratto: accessori, assicurazione, sconti. */
  extras_amount: number;
  insurance_amount: number;
  discount_amount: number;
  fuel_penalty_amount: number;
  damage_charge_amount: number;
  driver_age: string | null;
  coupon_code: string | null;
  /** Verbali firmati (Lotto 23): path nel bucket privato `verbali`. */
  verbale_consegna_url: string | null;
  verbale_rientro_url: string | null;
};

export type Damage = {
  id: string;
  vehicle_id: string;
  reservation_id: string | null;
  view: string;
  pos_x: number;
  pos_y: number;
  damage_type: string;
  severity: string;
  description: string | null;
  status: string;
  reported_at: string;
  phase: string;
  charge_amount: number;
  /** Tassonomia: componente e gravità dal dizionario (null sui danni storici). */
  component_id: string | null;
  severity_id: string | null;
  charge_note: string | null;
};


function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T;
}

export const branchesQuery = {
  queryKey: ["gestionale", "branches"] as const,
  queryFn: async () =>
    unwrap<Branch[]>(await supabase.from("branches").select("*").order("name")),
};

// Elenchi filtrati lato server per sede assegnata (Lotto 25): la restrizione
// vive nelle server function, non nelle RLS generali. Admin/super admin e gli
// operatori senza sede assegnata continuano a vedere tutte le sedi.
export const vehiclesQuery = {
  queryKey: ["gestionale", "vehicles"] as const,
  queryFn: async () => listScopedVehicles({ data: undefined }),
};

export const partnersQuery = {
  queryKey: ["gestionale", "partners"] as const,
  queryFn: async () =>
    unwrap<Partner[]>(await supabase.from("partners").select("*").order("company_name")),
};

export const reservationsQuery = {
  queryKey: ["gestionale", "reservations"] as const,
  queryFn: async () => listScopedReservations({ data: undefined }),
};

export type VehicleCategory = {
  id: string;
  code: string;
  label_it: string;
  label_en: string;
  macro_class: string;
  damage_penalty: number;
  theft_penalty: number;
  damage_schema_image_url: string | null;
  payment_mode: string;
  deposit_pct: number;
  /** Politica km/carburante di fallback quando il listino non la specifica. */
  included_km_per_day: number;
  extra_km_rate: number;
  fuel_price_per_liter: number;
  /** Flag storico: una categoria disattivata non è più prenotabile. */
  active: boolean;

};

export const vehicleCategoriesQuery = {
  queryKey: ["gestionale", "vehicle-categories"] as const,
  queryFn: async () =>
    unwrap<VehicleCategory[]>(
      await supabase.from("vehicle_categories").select("*").order("label_it"),
    ),
};

export const ratePlansQuery = {
  queryKey: ["gestionale", "rate-plans"] as const,
  queryFn: async () => unwrap<RatePlan[]>(await supabase.from("rate_plans").select("*")),
};

export const extrasQuery = {
  queryKey: ["gestionale", "extras"] as const,
  queryFn: async () =>
    unwrap<Extra[]>(await supabase.from("extras").select("*").eq("active", true).order("label_it")),
};

export type PartnerLead = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  fleet_size: string;
  message: string;
  status: string;
  created_at: string;
};

export const partnerLeadsQuery = {
  queryKey: ["gestionale", "partner-leads"] as const,
  queryFn: async () =>
    unwrap<PartnerLead[]>(
      await supabase.from("partner_leads").select("*").order("created_at", { ascending: false }),
    ),
};


export function vehicleDamagesQuery(vehicleId: string) {
  return {
    queryKey: ["gestionale", "damages", vehicleId] as const,
    queryFn: async () =>
      unwrap<Damage[]>(
        await supabase
          .from("vehicle_damages")
          .select("*")
          .eq("vehicle_id", vehicleId)
          .order("reported_at", { ascending: false }),
      ),
  };
}

export const damagesQuery = {
  queryKey: ["gestionale", "damages", "all"] as const,
  queryFn: async () =>
    unwrap<Damage[]>(
      await supabase.from("vehicle_damages").select("*").order("reported_at", { ascending: false }),
    ),
};

export const myRolesQuery = {
  queryKey: ["gestionale", "my-roles"] as const,
  queryFn: async (): Promise<AppRole[]> => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return [];
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => r.role as AppRole);
  },
};

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}

export function formatEuro(value: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(
    value,
  );
}

export function daysBetween(from: string, to: string) {
  return Math.max(1, Math.round((+new Date(to) - +new Date(from)) / 86_400_000));
}

/** Due intervalli di date (ISO yyyy-mm-dd, estremi inclusi) si sovrappongono? */
export function rangesOverlap(aFrom: string, aTo: string, bFrom: string, bTo: string) {
  return aFrom <= bTo && bFrom <= aTo;
}

/** Prenotazioni che bloccano il veicolo (tutte tranne le annullate). */
export function blockingReservations(reservations: Reservation[], vehicleId: string) {
  return reservations.filter((r) => r.vehicle_id === vehicleId && r.status !== "annullata");
}

/**
 * Fermo tecnico: una richiesta di manutenzione non chiusa con periodo stimato
 * rende il veicolo indisponibile. Tipo minimo per evitare dipendenze circolari
 * con src/lib/maintenance.ts.
 */
export type MaintenanceBlock = {
  vehicle_id: string;
  stato: string;
  fermo_dal: string | null;
  fermo_al: string | null;
};

export function maintenanceBlocksFor<T extends MaintenanceBlock>(
  blocks: T[] | undefined,
  vehicleId: string,
) {
  return (blocks ?? []).filter(
    (b) => b.vehicle_id === vehicleId && b.stato !== "chiusa" && b.fermo_dal && b.fermo_al,
  );
}

/** Il veicolo è in fermo manutenzione in un dato giorno? */
export function maintenanceForDay<T extends MaintenanceBlock>(
  blocks: T[] | undefined,
  vehicleId: string,
  day: string,
) {
  return maintenanceBlocksFor(blocks, vehicleId).find((b) =>
    rangesOverlap(b.fermo_dal!, b.fermo_al!, day, day),
  );
}

/**
 * Logica unica di disponibilità: un veicolo è libero nell'intervallo se nessuna
 * prenotazione non annullata si sovrappone e se non è in fermo manutenzione.
 * Usata dalla griglia del calendario gestionale e dal motore di ricerca
 * pubblico (via server function).
 */
export function isVehicleAvailable(
  vehicleId: string,
  dateFrom: string,
  dateTo: string,
  reservations: Reservation[],
  maintenanceBlocks?: MaintenanceBlock[],
) {
  const busy = blockingReservations(reservations, vehicleId).some((r) =>
    rangesOverlap(r.date_from, r.date_to, dateFrom, dateTo),
  );
  if (busy) return false;
  return !maintenanceBlocksFor(maintenanceBlocks, vehicleId).some((b) =>
    rangesOverlap(b.fermo_dal!, b.fermo_al!, dateFrom, dateTo),
  );
}

/** Prenotazione che occupa il veicolo in un dato giorno (cella del calendario). */
export function reservationForDay(
  reservations: Reservation[],
  vehicleId: string,
  day: string,
) {
  return blockingReservations(reservations, vehicleId).find((r) =>
    rangesOverlap(r.date_from, r.date_to, day, day),
  );
}



export async function logAudit(action: string, entity: string, entityId?: string) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from("audit_log").insert({
    user_id: data.user.id,
    action,
    entity,
    entity_id: entityId ?? null,
  });
}


export type Payment = {
  id: string;
  reservation_id: string;
  provider: string;
  provider_payment_id: string | null;
  amount: number;
  currency: string;
  status: string;
  type: string;
  notes: string | null;
  created_at: string;
};

export const paymentStatusLabels: Record<string, string> = {
  pending: "In attesa",
  succeeded: "Riuscito",
  failed: "Fallito",
  refunded: "Rimborsato",
};

export const paymentTypeLabels: Record<string, string> = {
  caparra: "Caparra",
  saldo: "Saldo al ritiro",
  pagamento_completo: "Pagamento completo",
};

export const paymentsQuery = {
  queryKey: ["gestionale", "payments"] as const,
  queryFn: async () =>
    unwrap<Payment[]>(
      await supabase.from("payments").select("*").order("created_at", { ascending: false }),
    ),
};

export type Invoice = {
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

export const invoiceStatusLabels: Record<string, string> = {
  bozza: "Bozza",
  emessa: "Emessa",
  pagata: "Pagata",
  annullata: "Annullata",
};

export const invoicesQuery = {
  queryKey: ["gestionale", "invoices"] as const,
  queryFn: async () =>
    unwrap<Invoice[]>(
      await supabase
        .from("invoices")
        .select("*")
        .order("anno", { ascending: false })
        .order("progressivo", { ascending: false }),
    ),
};

/* ------------------------------------------------------------------ */
/* Consegna/rientro e scadenze veicolo                                 */
/* ------------------------------------------------------------------ */

/** Dotazioni consegnate al cliente: elenco semplice, non un catalogo. */
export const equipmentOptions = [
  "Kit sicurezza (triangolo + gilet)",
  "Gomma di scorta",
  "Kit riparazione gomme",
  "Cavi di ricarica",
  "Catene da neve",
  "Documenti e libretto",
  "Seggiolino bambino",
  "Supporto telefono",
] as const;

export type VehicleExpiration = {
  id: string;
  vehicle_id: string;
  tipo: string;
  data_scadenza: string | null;
  km_scadenza: number | null;
  priorita: string;
  eseguita: boolean;
  data_esecuzione: string | null;
  note: string | null;
  created_at: string;
};

export const expirationTypeLabels: Record<string, string> = {
  assicurazione: "Assicurazione",
  bollo: "Bollo",
  revisione: "Revisione",
  tagliando_km: "Tagliando (km)",
};

export const expirationPriorityLabels: Record<string, string> = {
  alta: "Alta",
  media: "Media",
  bassa: "Bassa",
};

export const vehicleExpirationsQuery = {
  queryKey: ["gestionale", "vehicle-expirations"] as const,
  queryFn: async () =>
    unwrap<VehicleExpiration[]>(
      await supabase
        .from("vehicle_expirations")
        .select("*")
        .order("data_scadenza", { ascending: true, nullsFirst: false }),
    ),
};

/**
 * Urgenza di una scadenza: per data (giorni residui) o per km (km residui
 * rispetto al chilometraggio corrente del veicolo).
 */
export function expirationUrgency(
  expiration: VehicleExpiration,
  vehicleMileage: number,
): { label: string; level: "scaduta" | "urgente" | "prossima" | "ok" } {
  if (expiration.data_scadenza) {
    const days = Math.round((+new Date(expiration.data_scadenza) - Date.now()) / 86_400_000);
    if (days < 0) return { label: `scaduta da ${Math.abs(days)} g`, level: "scaduta" };
    if (days <= 15) return { label: `tra ${days} g`, level: "urgente" };
    if (days <= 45) return { label: `tra ${days} g`, level: "prossima" };
    return { label: `tra ${days} g`, level: "ok" };
  }
  if (expiration.km_scadenza !== null) {
    const km = Math.round(expiration.km_scadenza - vehicleMileage);
    if (km < 0) return { label: `superata di ${Math.abs(km)} km`, level: "scaduta" };
    if (km <= 500) return { label: `tra ${km} km`, level: "urgente" };
    if (km <= 2000) return { label: `tra ${km} km`, level: "prossima" };
    return { label: `tra ${km} km`, level: "ok" };
  }
  return { label: "senza scadenza", level: "ok" };
}

/* ------------------------------------------------------------------ */
/* Assicurazioni a pacchetti                                           */
/* ------------------------------------------------------------------ */

export const insuranceSpecsQuery = {
  queryKey: ["gestionale", "insurance-specs"] as const,
  queryFn: async () =>
    unwrap<InsuranceSpec[]>(await supabase.from("insurance_specs").select("*").order("label_it")),
};

/** Tutti i pacchetti, anche a storico: il filtro attivo si applica nei flussi. */
export const insurancePackagesQuery = {
  queryKey: ["gestionale", "insurance-packages"] as const,
  queryFn: async () =>
    unwrap<InsurancePackage[]>(
      await supabase.from("insurance_packages").select("*").order("sort_order"),
    ),
};

export const insurancePackageComponentsQuery = {
  queryKey: ["gestionale", "insurance-package-components"] as const,
  queryFn: async () =>
    unwrap<InsurancePackageComponent[]>(
      await supabase.from("insurance_package_components").select("*"),
    ),
};

/* ------------------------------------------------------------------ */
/* Tassonomia e prezzario danni                                        */
/* ------------------------------------------------------------------ */

export type DamageTypeRow = {
  id: string;
  code: string;
  label_it: string;
  sort_order: number;
  active: boolean;
};

export type DamageComponentRow = {
  id: string;
  damage_type_id: string;
  code: string;
  label_it: string;
  default_view: string | null;
  sort_order: number;
  active: boolean;
};

export type DamageSeverityRow = {
  id: string;
  code: string;
  label_it: string;
  livello: number;
  active: boolean;
};

export const damageTypesQuery = {
  queryKey: ["gestionale", "damage-types"] as const,
  queryFn: async () =>
    unwrap<DamageTypeRow[]>(await supabase.from("damage_types").select("*").order("sort_order")),
};

export const damageComponentsQuery = {
  queryKey: ["gestionale", "damage-components"] as const,
  queryFn: async () =>
    unwrap<DamageComponentRow[]>(
      await supabase.from("damage_components").select("*").order("sort_order"),
    ),
};

export const damageSeveritiesQuery = {
  queryKey: ["gestionale", "damage-severities"] as const,
  queryFn: async () =>
    unwrap<DamageSeverityRow[]>(await supabase.from("damage_severities").select("*").order("livello")),
};

export const damagePriceConfigQuery = {
  queryKey: ["gestionale", "damage-price-config"] as const,
  queryFn: async () =>
    unwrap<DamagePriceConfig[]>(await supabase.from("damage_price_config").select("*")),
};

/**
 * Filtro attivo/storico applicato in modo uniforme: i flussi operativi vedono
 * solo i record attivi, la reportistica può chiedere esplicitamente lo storico.
 */
export function onlyActive<T extends { active: boolean }>(rows: T[] | undefined, includeInactive = false) {
  return (rows ?? []).filter((r) => includeInactive || r.active);
}

/** Tutti i livelli fedeltà, anche disattivati: qui si amministra il catalogo. */
export const loyaltyTiersQuery = {
  queryKey: ["gestionale", "loyalty-tiers"] as const,
  queryFn: async () =>
    unwrap<LoyaltyTier[]>(await supabase.from("loyalty_tiers").select("*").order("sort_order")),
};
