import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { romeToIso, WerentApiError, werentApi } from "@/lib/werent-api.server";

/**
 * Prenotazione sul sito collegata al gestionale We Rent (lotto 7b).
 * Prezzi, disponibilità e regole arrivano sempre dal gestionale: il sito non calcola nulla da sé.
 * Ogni funzione restituisce { ok: true, data } oppure { ok: false, code, message } (messaggio per il cliente).
 */

export type Result<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

async function wrap<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof WerentApiError) return { ok: false, code: e.code, message: e.message };
    if (e instanceof z.ZodError)
      return { ok: false, code: "invalid", message: e.issues[0]?.message ?? "Dati non validi" };
    console.error("werent-booking", e);
    return {
      ok: false,
      code: "error",
      message: "Prenotazione online momentaneamente non disponibile: riprova tra poco o contattaci",
    };
  }
}

/* ------------------------------------------------------------------ tipi (come li restituisce il gestionale) */

export type WBranch = {
  id: string;
  code: string;
  name: string;
  city: string;
  address: string;
  phone: string | null;
  isAirport: boolean;
  afterHoursAvailable: boolean;
  afterHoursFeeCents: number | null;
  seasonStart: string | null;
  seasonEnd: string | null;
};
export type WCategory = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  exampleModels: string | null;
  seats: number | null;
  doors: number | null;
  largeBags: number | null;
  smallBags: number | null;
  transmission: string | null;
  fuelType: string | null;
  isCommercial: boolean;
  minDriverAge: number | null;
  protectionTier: number;
  depositCents: number | null;
};
export type WExtra = {
  id: string;
  code: string;
  name: string;
  pricing: "giorno" | "noleggio";
  priceCents: number;
  priceTier2Cents: number | null;
  maxPerRentalCents: number | null;
};
export type WProtection = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  dailyPriceCents: number;
  dailyPriceTier2Cents: number | null;
  deductibleNote: string | null;
  depositByCategory: Record<string, number>;
};
export type WRules = {
  driverAgeMin: number;
  driverAgeMax: number;
  minLeadHours: number;
  holdMinutes: number;
  advancePct: number;
  fullPaymentWithinDays: number;
  cancellationNoticeHours: number;
  cancellationMinPenaltyCents: number;
};
export type WConfig = {
  branches: WBranch[];
  categories: WCategory[];
  extras: WExtra[];
  protections: WProtection[];
  oneWay: { fromBranchId: string; toBranchId: string; feeCents: number; allowed: boolean }[];
  rules: WRules;
};
export type WLine = {
  kind: string;
  code: string | null;
  label: string;
  quantity: number;
  unitCents: number;
  totalCents: number;
};
export type WQuote = {
  days: number;
  dailyRateCents: number | null;
  lines: WLine[];
  totalCents: number;
  afterHoursPickup: boolean;
  afterHoursReturn: boolean;
};
export type WSearchRow = {
  categoryId: string;
  code: string;
  available: boolean;
  reason: string | null;
  quote: WQuote | null;
  depositCents: number | null;
};
export type WFullQuote = {
  available: boolean;
  quote: WQuote;
  payNow: { amountCents: number; full: boolean };
  payAtPickupCents: number;
  depositCents: number | null;
};
export type WBookingCreated = {
  code: string;
  manageToken: string;
  manageUrl: string;
  checkout: { url: string; expiresAt: string };
  payNow: { amountCents: number; full: boolean };
  payAtPickupCents: number;
  totalCents: number;
  depositCents: number | null;
  paymentDueBy: string;
};
export type WBookingView = {
  code: string;
  state:
    | "in_attesa_pagamento"
    | "confermata"
    | "richiesta"
    | "in_preparazione"
    | "in_corso"
    | "restituita"
    | "chiusa"
    | "annullata"
    | "no_show";
  status: string;
  customer: { firstName: string | null; lastName: string | null; email: string | null };
  category: { code: string; name: string; exampleModels: string | null };
  pickup: {
    at: string;
    branch: { id: string; code: string; name: string; address: string; phone: string | null };
    afterHours: boolean;
  };
  return: {
    at: string;
    branch: { id: string; code: string; name: string; address: string; phone: string | null };
    afterHours: boolean;
  };
  protection: { code: string; name: string } | null;
  lines: WLine[];
  totalCents: number;
  paidCents: number;
  payAtPickupCents: number;
  depositCents: number | null;
  payment: { url: string; amountCents: number; expiresAt: string } | null;
  paymentDueBy: string | null;
  cancellation: {
    possible: boolean;
    free: boolean;
    penaltyCents: number;
    refundCents: number;
    noticeHours: number | null;
  };
  cancelReason: string | null;
};

/* ------------------------------------------------------------------ input */

const lang = z.enum(["it", "en"]).default("it");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida");
const hhmm = z.string().regex(/^\d{2}:\d{2}$/, "Ora non valida");

const tripInput = z.object({
  pickupBranchId: z.string().uuid(),
  returnBranchId: z.string().uuid(),
  dateFrom: isoDate,
  timeFrom: hhmm,
  dateTo: isoDate,
  timeTo: hhmm,
  driverBirthDate: isoDate.nullish(),
  lang,
});

const choiceInput = tripInput.extend({
  categoryId: z.string().uuid(),
  extras: z
    .array(z.object({ extraId: z.string().uuid(), quantity: z.number().int().min(0).max(5) }))
    .max(20)
    .default([]),
  insurancePackageId: z.string().uuid().nullish(),
});

function trip(t: z.infer<typeof tripInput>) {
  return {
    pickupBranchId: t.pickupBranchId,
    returnBranchId: t.returnBranchId,
    pickupAt: romeToIso(t.dateFrom, t.timeFrom),
    returnAt: romeToIso(t.dateTo, t.timeTo),
    ...(t.driverBirthDate ? { driverBirthDate: t.driverBirthDate } : {}),
    lang: t.lang,
  };
}

/* ------------------------------------------------------------------ funzioni */

export const werentConfig = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ lang }).parse(input ?? {}))
  .handler(async ({ data }) => wrap(() => werentApi<WConfig>("GET", `/config?lang=${data.lang}`)));

export const werentSearch = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => tripInput.parse(input))
  .handler(async ({ data }) =>
    wrap(() => werentApi<{ results: WSearchRow[] }>("POST", "/search", trip(data))),
  );

export const werentQuote = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => choiceInput.parse(input))
  .handler(async ({ data }) =>
    wrap(() =>
      werentApi<WFullQuote>("POST", "/quote", {
        ...trip(data),
        categoryId: data.categoryId,
        extras: data.extras,
        insurancePackageId: data.insurancePackageId ?? null,
      }),
    ),
  );

const bookingInput = choiceInput.extend({
  driverBirthDate: isoDate,
  customer: z.object({
    firstName: z.string().trim().min(1, "Inserisci il nome").max(80),
    lastName: z.string().trim().min(1, "Inserisci il cognome").max(80),
    email: z.string().trim().email("Email non valida").max(200),
    phone: z.string().trim().min(5, "Telefono non valido").max(40),
  }),
  flightNumber: z.string().trim().max(20).nullish(),
  notes: z.string().trim().max(1000).nullish(),
  acceptTerms: z.literal(true),
  acceptPrivacy: z.literal(true),
  marketingConsent: z.boolean().default(false),
  /** Generata dal browser una volta per tentativo: un doppio clic non crea due prenotazioni. */
  idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{8,80}$/),
});

export const werentBook = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => bookingInput.parse(input))
  .handler(async ({ data }) => {
    const { idempotencyKey, dateFrom: _a, timeFrom: _b, dateTo: _c, timeTo: _d, ...rest } = data;
    return wrap(() =>
      werentApi<WBookingCreated>(
        "POST",
        "/bookings",
        { ...rest, ...trip(data), driverBirthDate: data.driverBirthDate },
        { "idempotency-key": idempotencyKey },
      ),
    );
  });

const manageInput = z.object({
  code: z.string().trim().min(4).max(40),
  t: z.string().trim().min(10).max(64),
  lang,
});

export const werentBooking = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => manageInput.parse(input))
  .handler(async ({ data }) =>
    wrap(() =>
      werentApi<WBookingView>(
        "GET",
        `/bookings/${encodeURIComponent(data.code)}?t=${encodeURIComponent(data.t)}&lang=${data.lang}`,
      ),
    ),
  );

export const werentCancel = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => manageInput.parse(input))
  .handler(async ({ data }) =>
    wrap(() =>
      werentApi<{
        penaltyCents: number;
        refundedCents: number;
        notRefundedCents: number;
        booking: WBookingView;
      }>("POST", `/bookings/${encodeURIComponent(data.code)}/cancel`, {
        t: data.t,
        lang: data.lang,
      }),
    ),
  );

export const werentResumePayment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => manageInput.parse(input))
  .handler(async ({ data }) =>
    wrap(() =>
      werentApi<{ checkout: { url: string; expiresAt: string }; amountCents: number }>(
        "POST",
        `/bookings/${encodeURIComponent(data.code)}/pay`,
        { t: data.t },
      ),
    ),
  );
