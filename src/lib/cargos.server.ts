import {
  buildRecord,
  cargosSettingKeys,
  readSetting,
  validateContract,
  type CargosClient,
  type CargosContract,
  type CargosValidationIssue,
} from "@/lib/cargos";
import { createCargosMockClient } from "@/lib/cargos-mock";

/**
 * Orchestrazione delle comunicazioni CaRGOS: lettura dati contratto, mapping
 * configurabile, costruzione tracciato, validazione (api/Check) e invio
 * (api/Send) con tracciamento su `cargos_transmissions`.
 *
 * L'adapter attivo è il MOCK per default: quello reale entra in gioco solo con
 * `CARGOS_MODE=live` e credenziali complete fra le variabili d'ambiente.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = { from: (table: string) => any };

export async function getCargosClient(): Promise<CargosClient> {
  if (process.env["CARGOS_MODE"] !== "live") return createCargosMockClient();
  const { createCargosLiveClient, readCargosLiveConfig } = await import("@/lib/cargos-live");
  const config = readCargosLiveConfig();
  if (!config) {
    // Configurazione incompleta: si resta sul mock, ma l'operatore lo vede nel
    // pannello (nessun invio reale viene simulato come riuscito "in live").
    console.warn("[cargos] CARGOS_MODE=live ma credenziali incomplete: adapter mock attivo.");
    return createCargosMockClient();
  }
  return createCargosLiveClient(config);
}

export type CargosPreparation = {
  reservationId: string;
  contract: CargosContract;
  record: string | null;
  issues: CargosValidationIssue[];
  /** Codici di mapping mancanti in `app_settings` (bloccanti). */
  missingMappings: string[];
  /** Prenotazione dimostrativa/di test: mai comunicabile alla Polizia. */
  isDemo: boolean;
};

/**
 * Barriera strutturale sui dati demo, indipendente da `CARGOS_MODE`: una
 * prenotazione marcata `is_demo` non può in nessun caso essere trasmessa.
 */
export function assertNotDemoReservation(reservationId: string, isDemo: boolean) {
  if (!isDemo) return;
  const message = `Prenotazione ${reservationId} marcata come demo: esclusa da qualunque comunicazione CaRGOS.`;
  console.error("[cargos] BLOCCO DEMO —", message);
  throw new Error(message);
}

const RESERVATION_SELECT = `
  id, code, status, is_demo, date_from, date_to, total_amount, branch_id, notes,
  customer_name, customer_email, customer_phone, customer_id,
  checkout_at, checkin_at,
  vehicle:vehicles ( id, plate, model, category_id ),
  branch:branches ( id, code, name ),
  customer:customers (
    id, full_name, email, phone, fiscal_code, address, birth_date,
    driving_license_number, driving_license_expiry
  )
`;

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return { cognome: fullName.trim(), nome: "" };
  return { cognome: parts.slice(1).join(" "), nome: parts[0]! };
}

/** Costruisce il contratto CaRGOS per una prenotazione, senza inviare nulla. */
export async function prepareTransmission(db: Db, reservationId: string): Promise<CargosPreparation> {
  const { data: reservation, error } = await db
    .from("reservations")
    .select(RESERVATION_SELECT)
    .eq("id", reservationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!reservation) throw new Error("Prenotazione non trovata.");

  const [{ data: settings }, { data: payments }] = await Promise.all([
    db.from("app_settings").select("key, value"),
    db
      .from("payments")
      .select("provider, status, created_at")
      .eq("reservation_id", reservationId)
      .order("created_at", { ascending: false }),
  ]);

  const missingMappings: string[] = [];
  const requireMapping = (key: string, label: string) => {
    const value = readSetting(settings, key);
    if (!value) missingMappings.push(`${label} (${key})`);
    return value;
  };

  const branchId: string | null = reservation.branch_id ?? null;
  const categoryId: string | null = reservation.vehicle?.category_id ?? null;
  const provider = (payments ?? []).find((p: any) => p.status === "succeeded")?.provider ?? "non_specificato";

  const codiceLuogoPolizia = branchId
    ? requireMapping(cargosSettingKeys.luogoPolizia(branchId), `Codice luogo polizia sede ${reservation.branch?.name ?? branchId}`)
    : null;
  if (!branchId) missingMappings.push("Sede di ritiro non impostata sulla prenotazione");

  const tipoVeicolo = categoryId
    ? requireMapping(cargosSettingKeys.tipoVeicolo(categoryId), "Codice tipo veicolo per la categoria del veicolo")
    : null;
  if (!categoryId) missingMappings.push("Veicolo o categoria non impostati sulla prenotazione");

  const tipoPagamento = requireMapping(
    cargosSettingKeys.tipoPagamento(provider),
    `Codice tipo pagamento per la modalità "${provider}"`,
  );
  const tipoDocumento = readSetting(settings, cargosSettingKeys.tipoDocumentoDefault);
  const organizzazione =
    process.env["CARGOS_ORGANIZATION"] || readSetting(settings, cargosSettingKeys.organizzazione);
  if (!organizzazione) missingMappings.push(`Codice organizzazione (${cargosSettingKeys.organizzazione})`);

  const customer = reservation.customer ?? null;
  const { cognome, nome } = splitName(customer?.full_name || reservation.customer_name || "");

  const contract: CargosContract = {
    // Tipo record: valore dichiarato dalla ricostruzione della specifica.
    tipoRecord: "01",
    codiceLuogoPolizia,
    codiceOrganizzazione: organizzazione,
    progressivoContratto: reservation.code,
    dataStipula: (reservation.checkout_at ?? reservation.date_from)?.slice(0, 10),
    dataInizio: reservation.date_from,
    oraInizio: reservation.checkout_at ? new Date(reservation.checkout_at).toISOString().slice(11, 16) : "0800",
    dataFine: reservation.date_to,
    oraFine: reservation.checkin_at ? new Date(reservation.checkin_at).toISOString().slice(11, 16) : "0800",
    luogoRitiro: reservation.branch?.code ?? null,
    luogoRiconsegna: reservation.branch?.code ?? null,
    tipoPagamento,
    importoContratto: Number(reservation.total_amount) || 0,
    targa: reservation.vehicle?.plate ?? null,
    tipoVeicolo,
    marcaModello: reservation.vehicle?.model ?? null,
    telaio: null,
    conducenteCognome: cognome,
    conducenteNome: nome,
    conducenteSesso: null,
    conducenteDataNascita: customer?.birth_date ?? null,
    conducenteComuneNascita: null,
    conducenteStatoNascita: null,
    conducenteCittadinanza: null,
    conducenteCodiceFiscale: customer?.fiscal_code ?? null,
    tipoDocumento,
    numeroDocumento: null,
    documentoRilasciatoDa: null,
    documentoDataRilascio: null,
    documentoDataScadenza: null,
    patenteNumero: customer?.driving_license_number ?? null,
    patenteDataScadenza: customer?.driving_license_expiry ?? null,
    indirizzoResidenza: customer?.address ?? null,
    comuneResidenza: null,
    capResidenza: null,
    statoResidenza: null,
    telefono: customer?.phone ?? reservation.customer_phone,
    email: customer?.email ?? reservation.customer_email,
    secondoCognome: null,
    secondoNome: null,
    secondoDataNascita: null,
    secondoPatenteNumero: null,
    note: null,
  };

  const issues = validateContract(contract);
  const record = issues.length === 0 && missingMappings.length === 0 ? buildRecord(contract) : null;
  return {
    reservationId,
    contract,
    record,
    issues,
    missingMappings,
    isDemo: Boolean(reservation.is_demo),
  };
}

export type TransmitResult = {
  reservationId: string;
  stato: "in_attesa" | "validato" | "inviato" | "errore";
  transactionId: string | null;
  messages: string[];
  mode: "mock" | "live";
};

/** Ritardo progressivo fra i tentativi: 15 min, 1 h, 4 h, poi 12 h. */
function nextAttemptAt(tentativi: number) {
  const minutes = [15, 60, 240, 720][Math.min(tentativi, 3)]!;
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

/**
 * Valida e (se `send`) trasmette il contratto, aggiornando la riga di
 * `cargos_transmissions`. Gli errori non vengono mai silenziati: restano nel
 * campo `errore` e lo stato passa a `errore` con un nuovo tentativo pianificato.
 */
export async function transmitReservation(
  db: Db,
  reservationId: string,
  options: { send?: boolean; userId?: string | null } = {},
): Promise<TransmitResult> {
  const client = await getCargosClient();
  const prepared = await prepareTransmission(db, reservationId);
  // Seconda barriera: anche se una demo finisse in coda, l'invio si ferma qui.
  assertNotDemoReservation(reservationId, prepared.isDemo);

  const { data: existing } = await db
    .from("cargos_transmissions")
    .select("id, tentativi")
    .eq("reservation_id", reservationId)
    .maybeSingle();
  const tentativi = (existing?.tentativi ?? 0) + 1;

  const persist = async (patch: Record<string, unknown>) => {
    const row = {
      reservation_id: reservationId,
      tentativi,
      ambiente: client.mode,
      last_attempt_at: new Date().toISOString(),
      ...patch,
    };
    if (existing) {
      const { error } = await db.from("cargos_transmissions").update(row).eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await db.from("cargos_transmissions").insert(row);
      if (error) throw new Error(error.message);
    }
  };

  const fail = async (messages: string[]): Promise<TransmitResult> => {
    await persist({
      payload: prepared.record ?? "",
      stato: "errore",
      errore: { messaggi: messages, mapping_mancante: prepared.missingMappings },
      next_attempt_at: nextAttemptAt(tentativi),
    });
    return { reservationId, stato: "errore", transactionId: null, messages, mode: client.mode };
  };

  if (!prepared.record) {
    return fail([
      ...prepared.missingMappings.map((m) => `Mapping mancante: ${m}`),
      ...prepared.issues.map((i) => `${i.label}: ${i.message}`),
    ]);
  }

  try {
    const check = await client.checkRecords([prepared.record]);
    if (!check.ok) return fail(check.messages.length > 0 ? check.messages : ["Validazione CaRGOS non superata."]);

    if (!options.send) {
      await persist({
        payload: prepared.record,
        stato: "validato",
        errore: null,
        next_attempt_at: null,
      });
      return { reservationId, stato: "validato", transactionId: null, messages: [], mode: client.mode };
    }

    const sent = await client.sendRecords([prepared.record]);
    if (!sent.ok) return fail(sent.messages.length > 0 ? sent.messages : ["Invio CaRGOS non confermato."]);

    await persist({
      payload: prepared.record,
      stato: "inviato",
      transaction_id: sent.transactionId ?? null,
      errore: null,
      next_attempt_at: null,
      sent_at: new Date().toISOString(),
    });

    await db.from("audit_log").insert({
      user_id: options.userId ?? null,
      action: "cargos_send",
      entity: "reservations",
      entity_id: reservationId,
      payload: { transaction_id: sent.transactionId ?? null, ambiente: client.mode },
    });

    return {
      reservationId,
      stato: "inviato",
      transactionId: sent.transactionId ?? null,
      messages: [],
      mode: client.mode,
    };
  } catch (error) {
    return fail([error instanceof Error ? error.message : String(error)]);
  }
}
