/**
 * Manutenzione a tre entità: Richiesta → Pratica → Righe di preventivo.
 * La richiesta nasce da una scadenza, da un danno o da una segnalazione
 * manuale; la pratica rappresenta il rapporto con l'officina; le righe sono
 * il preventivo che l'officina propone e che noi approviamo o rifiutiamo.
 */
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/gestionale";

export type MaintenanceOrigin = "scadenza" | "danno" | "segnalazione_manuale";

export type MaintenanceRequest = {
  id: string;
  vehicle_id: string;
  origine: MaintenanceOrigin | string;
  origine_id: string | null;
  descrizione: string;
  data_segnalazione: string;
  stato: string;
  /** Fermo tecnico stimato: se valorizzato blocca la disponibilità. */
  fermo_dal: string | null;
  fermo_al: string | null;
  created_at: string;
};

export type MaintenanceRecord = {
  id: string;
  request_id: string;
  officina: string;
  data_apertura: string;
  stato: string;
  note: string | null;
  created_at: string;
};

export type MaintenanceOrderLine = {
  id: string;
  record_id: string;
  descrizione_lavoro: string;
  importo: number;
  stato_riga: string;
  data_completamento: string | null;
  created_at: string;
};

export const maintenanceOriginLabels: Record<string, string> = {
  scadenza: "Scadenza",
  danno: "Danno",
  segnalazione_manuale: "Segnalazione manuale",
};

export const maintenanceRequestStatusLabels: Record<string, string> = {
  aperta: "Aperta",
  in_lavorazione: "In lavorazione",
  chiusa: "Chiusa",
};

export const maintenanceRecordStatusLabels: Record<string, string> = {
  aperta: "Aperta",
  in_officina: "In officina",
  chiusa: "Chiusa",
};

export const orderLineStatusLabels: Record<string, string> = {
  proposta: "Proposta",
  approvata: "Approvata",
  modificata: "Modificata",
  rifiutata: "Rifiutata",
};

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T;
}

export const maintenanceRequestsQuery = {
  queryKey: ["gestionale", "maintenance-requests"] as const,
  queryFn: async () =>
    unwrap<MaintenanceRequest[]>(
      await supabase
        .from("maintenance_requests")
        .select("*")
        .order("data_segnalazione", { ascending: false }),
    ),
};

export const maintenanceRecordsQuery = {
  queryKey: ["gestionale", "maintenance-records"] as const,
  queryFn: async () =>
    unwrap<MaintenanceRecord[]>(
      await supabase
        .from("maintenance_records")
        .select("*")
        .order("data_apertura", { ascending: false }),
    ),
};

export const maintenanceLinesQuery = {
  queryKey: ["gestionale", "maintenance-lines"] as const,
  queryFn: async () =>
    unwrap<MaintenanceOrderLine[]>(
      await supabase
        .from("maintenance_order_lines")
        .select("*")
        .order("created_at", { ascending: true }),
    ),
};

/* ------------------------------------------------------------------ */
/* Impostazioni applicative (chiave/valore)                            */
/* ------------------------------------------------------------------ */

export type AppSetting = { key: string; value: string; description: string | null };

export const appSettingsQuery = {
  queryKey: ["gestionale", "app-settings"] as const,
  queryFn: async () =>
    unwrap<AppSetting[]>(await supabase.from("app_settings").select("key, value, description")),
};

export const DAMAGE_THRESHOLD_KEY = "damage_maintenance_threshold";
const DAMAGE_THRESHOLD_FALLBACK = 150;

/** Soglia in euro oltre la quale un danno suggerisce una manutenzione. */
export function damageThreshold(settings: AppSetting[] | undefined) {
  const raw = (settings ?? []).find((s) => s.key === DAMAGE_THRESHOLD_KEY)?.value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DAMAGE_THRESHOLD_FALLBACK;
}

export async function saveDamageThreshold(value: number) {
  const { error } = await supabase
    .from("app_settings")
    .upsert(
      {
        key: DAMAGE_THRESHOLD_KEY,
        value: String(value),
        description: "Soglia in euro oltre la quale un danno suggerisce una richiesta di manutenzione",
      },
      { onConflict: "key" },
    );
  if (error) throw new Error(error.message);
  await logAudit("update", "app_setting", DAMAGE_THRESHOLD_KEY);
}

/* ------------------------------------------------------------------ */
/* Mutazioni                                                           */
/* ------------------------------------------------------------------ */

export type NewMaintenanceRequest = {
  vehicleId: string;
  origine: MaintenanceOrigin;
  origineId?: string | null;
  descrizione: string;
  fermoDal?: string | null;
  fermoAl?: string | null;
};

export async function createMaintenanceRequest(input: NewMaintenanceRequest) {
  const { data, error } = await supabase
    .from("maintenance_requests")
    .insert({
      vehicle_id: input.vehicleId,
      origine: input.origine,
      origine_id: input.origineId ?? null,
      descrizione: input.descrizione,
      fermo_dal: input.fermoDal ?? null,
      fermo_al: input.fermoAl ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await logAudit("create", "maintenance_request", data?.id);
  return data as { id: string };
}

export async function updateMaintenanceRequest(
  id: string,
  patch: Partial<Pick<MaintenanceRequest, "stato" | "descrizione" | "fermo_dal" | "fermo_al">>,
) {
  const { error } = await supabase.from("maintenance_requests").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  await logAudit("update", "maintenance_request", id);
}

export async function createMaintenanceRecord(input: { requestId: string; officina: string }) {
  const { data, error } = await supabase
    .from("maintenance_records")
    .insert({ request_id: input.requestId, officina: input.officina })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  // Una pratica aperta porta la richiesta in lavorazione.
  await supabase
    .from("maintenance_requests")
    .update({ stato: "in_lavorazione" })
    .eq("id", input.requestId)
    .eq("stato", "aperta");
  await logAudit("create", "maintenance_record", data?.id);
  return data as { id: string };
}

export async function updateMaintenanceRecord(
  id: string,
  patch: Partial<Pick<MaintenanceRecord, "officina" | "stato" | "note">>,
) {
  const { error } = await supabase.from("maintenance_records").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  await logAudit("update", "maintenance_record", id);
}

export async function createOrderLine(input: {
  recordId: string;
  descrizione: string;
  importo: number;
}) {
  const { error } = await supabase.from("maintenance_order_lines").insert({
    record_id: input.recordId,
    descrizione_lavoro: input.descrizione,
    importo: input.importo,
  });
  if (error) throw new Error(error.message);
  await logAudit("create", "maintenance_order_line", input.recordId);
}

export async function updateOrderLine(
  id: string,
  patch: Partial<Pick<MaintenanceOrderLine, "stato_riga" | "importo" | "descrizione_lavoro" | "data_completamento">>,
) {
  const { error } = await supabase.from("maintenance_order_lines").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  await logAudit("update", "maintenance_order_line", id);
}

/* ------------------------------------------------------------------ */
/* Derivati                                                           */
/* ------------------------------------------------------------------ */

/** Richieste non chiuse di un veicolo. */
export function openRequestsFor(requests: MaintenanceRequest[] | undefined, vehicleId: string) {
  return (requests ?? []).filter((r) => r.vehicle_id === vehicleId && r.stato !== "chiusa");
}

/**
 * Costo manutenzione: solo righe approvate o modificate (le proposte non sono
 * ancora un impegno, le rifiutate non si pagano).
 */
export function lineCounts(line: MaintenanceOrderLine) {
  return line.stato_riga === "approvata" || line.stato_riga === "modificata";
}

export function maintenanceCost(lines: MaintenanceOrderLine[] | undefined) {
  return (lines ?? []).filter(lineCounts).reduce((sum, l) => sum + Number(l.importo), 0);
}
