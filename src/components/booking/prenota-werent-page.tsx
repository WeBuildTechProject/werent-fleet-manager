import { useQuery } from "@tanstack/react-query";
import { getRouteApi, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  BadgeEuro,
  CalendarCheck,
  Car,
  Check,
  CreditCard,
  Loader2,
  Lock,
  ShieldCheck,
  Truck,
  Users,
  Briefcase,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { SearchWidget } from "@/components/search-widget";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { categoryPhoto, eur, fmtDay } from "@/lib/werent-ui";
import { useI18n } from "@/lib/i18n";
import { storedUtm } from "@/lib/tracking";
import { cn } from "@/lib/utils";
import {
  werentBook,
  werentConfig,
  werentQuote,
  werentSearch,
  type Result,
  type WCategory,
  type WConfig,
  type WFullQuote,
  type WQuote,
  type WSearchRow,
} from "@/lib/werent-booking.functions";

/**
 * Prenotazione nativa collegata al gestionale We Rent (lotto 7b).
 * 1. risultati per categoria (disponibilità e prezzo dal gestionale);
 * 2. protezione, servizi, dati del conducente e consensi, con riepilogo aggiornato dal gestionale;
 * 3. pagamento sulla pagina sicura di Stripe; il ritorno è la pagina «la mia prenotazione».
 */
const routeApi = getRouteApi("/prenota");

function unwrap<T>(r: Result<T>): T {
  if (!r.ok) throw new Error(r.message);
  return r.data;
}

function isoDate(offsetDays: number) {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export function PrenotaWerentPage() {
  const { t, lang } = useI18n();
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const getConfig = useServerFn(werentConfig);
  const doSearch = useServerFn(werentSearch);

  const config = useQuery({
    queryKey: ["werent-config", lang],
    queryFn: async () => unwrap(await getConfig({ data: { lang } })),
    staleTime: 5 * 60_000,
  });
  const branchByCode = (code: string | undefined) =>
    config.data?.branches.find((b) => b.code === (code ?? "").toUpperCase()) ?? null;

  const hasSearch = Boolean(search.date_from && search.date_to && search.from);
  const trip = useMemo(() => {
    if (!config.data || !hasSearch) return null;
    const pickup = branchByCode(search.from);
    const ret = branchByCode(search.to ?? search.from);
    if (!pickup || !ret) return null;
    return {
      pickupBranchId: pickup.id,
      returnBranchId: ret.id,
      dateFrom: search.date_from!,
      timeFrom: search.time_from ?? "10:00",
      dateTo: search.date_to!,
      timeTo: search.time_to ?? "10:00",
      lang,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    config.data,
    search.from,
    search.to,
    search.date_from,
    search.time_from,
    search.date_to,
    search.time_to,
    lang,
    hasSearch,
  ]);

  const results = useQuery({
    queryKey: ["werent-search", trip],
    queryFn: async () => unwrap(await doSearch({ data: trip! })),
    enabled: Boolean(trip),
  });

  const commercial = search.class === "business";
  const [chosen, setChosen] = useState<string | null>(search.code ?? null);
  useEffect(() => {
    if (chosen) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [chosen]);

  const badges = [
    { icon: Lock, label: t("Pagamento sicuro con Stripe", "Secure payment with Stripe") },
    {
      icon: CalendarCheck,
      label: t("Cancellazione gratuita fino a 48h", "Free cancellation up to 48h"),
    },
    { icon: ShieldCheck, label: t("RCA e IVA incluse", "Insurance and VAT included") },
  ];

  const category = config.data?.categories.find((c) => c.id === chosen) ?? null;
  const row = results.data?.results.find((r) => r.categoryId === chosen) ?? null;

  return (
    <>
      <section className="bg-gradient-hero">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <p className="eyebrow text-ink/60">{t("Prenotazione", "Booking")}</p>
          <h1 className="mt-2 text-4xl text-ink sm:text-5xl">
            {t("Prenota in un minuto.", "Book in one minute.")}
          </h1>
          <p className="mt-4 max-w-2xl text-ink/80">
            {t(
              "Disponibilità e prezzi in tempo reale, direttamente dalla nostra flotta.",
              "Real-time availability and prices, straight from our fleet.",
            )}
          </p>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
            {badges.map((badge) => (
              <li
                key={badge.label}
                className="flex items-center gap-2 text-sm font-semibold text-ink/80"
              >
                <badge.icon className="size-4" aria-hidden />
                {badge.label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-28 pt-10 sm:px-6 lg:pb-10">
        {config.error ? (
          <Card className="p-6 text-sm">{(config.error as Error).message}</Card>
        ) : !hasSearch ? (
          <div className="space-y-4">
            <SearchWidget
              variant="page"
              initial={{ date_from: isoDate(1), date_to: isoDate(4) }}
              {...(search.class === "business" ? { fixedClass: "business" } : {})}
            />
            <p className="text-sm text-muted-foreground">
              {t(
                "Scegli sede e date per vedere disponibilità e prezzi.",
                "Choose branch and dates to see availability and prices.",
              )}
            </p>
          </div>
        ) : chosen && category && config.data && trip ? (
          <BookingForm
            config={config.data}
            category={category}
            row={row}
            trip={trip}
            onBack={() => {
              setChosen(null);
              void navigate({ search: ({ code: _c, ...s }) => s, replace: true });
            }}
          />
        ) : (
          <div className="space-y-5">
            <div className="sticky top-0 z-30 -mx-4 flex flex-wrap items-center gap-3 border-b border-border bg-background/95 px-4 py-3 text-sm text-muted-foreground backdrop-blur sm:-mx-6 sm:px-6">
              <span className="font-semibold text-ink">
                {branchByCode(search.from)?.name ?? search.from}
                {search.to && search.to !== search.from
                  ? ` → ${branchByCode(search.to)?.name ?? search.to}`
                  : ""}
              </span>
              <span>
                {fmtDay(search.date_from!, lang)} {search.time_from ?? "10:00"} →{" "}
                {fmtDay(search.date_to!, lang)} {search.time_to ?? "10:00"}
              </span>
            </div>
            <SearchWidget
              {...(commercial ? { fixedClass: "business" } : {})}
              variant="page"
              initial={{
                from: search.from,
                to: search.to,
                date_from: search.date_from,
                time_from: search.time_from,
                date_to: search.date_to,
                time_to: search.time_to,
                age: search.age,
              }}
            />

            {!trip && config.data ? (
              <Card className="p-6 text-sm text-muted-foreground">
                {t(
                  "Sede non disponibile per la prenotazione online.",
                  "Branch not available for online booking.",
                )}
              </Card>
            ) : results.isLoading || config.isLoading ? (
              <div className="grid gap-4 md:grid-cols-3">
                <Skeleton className="h-80" />
                <Skeleton className="h-80" />
                <Skeleton className="h-80" />
              </div>
            ) : results.error ? (
              <Card className="p-6 text-sm">{(results.error as Error).message}</Card>
            ) : (
              <ResultsGrid
                config={config.data!}
                rows={(results.data?.results ?? []).filter(
                  (r) =>
                    config.data!.categories.find((c) => c.id === r.categoryId)?.isCommercial ===
                    commercial,
                )}
                onChoose={(id) => {
                  setChosen(id);
                  void navigate({ search: (s) => ({ ...s, code: id }), replace: true });
                }}
              />
            )}
          </div>
        )}
      </section>
    </>
  );
}

function ResultsGrid({
  config,
  rows,
  onChoose,
}: {
  config: WConfig;
  rows: WSearchRow[];
  onChoose: (categoryId: string) => void;
}) {
  const { t, lang } = useI18n();
  if (!rows.length)
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        {t("Nessuna categoria di questo tipo.", "No category of this type.")}
      </Card>
    );
  const sorted = [...rows].sort((a, b) => Number(b.available) - Number(a.available));
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {sorted.map((r) => {
        const c = config.categories.find((x) => x.id === r.categoryId)!;
        const photo = categoryPhoto(c.code);
        return (
          <Card
            key={r.categoryId}
            className={cn("overflow-hidden p-0 shadow-card", !r.available && "opacity-60")}
            data-testid={`cat-${c.code}`}
          >
            <img
              src={photo.src}
              srcSet={photo.srcSet}
              sizes="(min-width: 768px) 33vw, 100vw"
              alt={c.exampleModels ?? c.name}
              width={1536}
              height={1024}
              className="h-40 w-full object-cover"
              loading="lazy"
            />
            <div className="space-y-2 p-4">
              <Badge variant="secondary" className="rounded-full">
                {c.name}
              </Badge>
              <h2 className="font-display text-lg">{c.exampleModels ?? c.name}</h2>
              <CategoryFacts c={c} />
              {r.available && r.quote ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    {r.quote.dailyRateCents
                      ? `${eur(r.quote.dailyRateCents, lang)}/${t("giorno", "day")} · `
                      : ""}
                    {r.quote.days} {r.quote.days === 1 ? t("giorno", "day") : t("giorni", "days")}
                  </p>
                  <p className="font-display text-2xl">{eur(r.quote.totalCents, lang)}</p>
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <BadgeEuro className="size-3.5" aria-hidden />{" "}
                    {t("IVA inclusa, km illimitati", "VAT included, unlimited mileage")}
                  </p>
                  <Button className="w-full rounded-full" onClick={() => onChoose(r.categoryId)}>
                    <Car className="size-4" /> {t("Scegli", "Select")}
                  </Button>
                </>
              ) : (
                <p className="text-sm font-semibold text-muted-foreground">
                  {r.reason ?? t("Non disponibile", "Not available")}
                </p>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function CategoryFacts({ c }: { c: WCategory }) {
  const { t } = useI18n();
  const facts = [
    c.seats ? { icon: Users, text: `${c.seats} ${t("posti", "seats")}` } : null,
    c.largeBags ? { icon: Briefcase, text: `${c.largeBags} ${t("valigie", "bags")}` } : null,
    c.transmission
      ? {
          icon: Car,
          text:
            c.transmission === "automatico" ? t("Automatico", "Automatic") : t("Manuale", "Manual"),
        }
      : null,
  ].filter(Boolean) as { icon: typeof Users; text: string }[];
  if (!facts.length) return null;
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {facts.map((f) => (
        <li key={f.text} className="flex items-center gap-1">
          <f.icon className="size-3.5" aria-hidden /> {f.text}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ passo 2: scelte e dati */

type Trip = {
  pickupBranchId: string;
  returnBranchId: string;
  dateFrom: string;
  timeFrom: string;
  dateTo: string;
  timeTo: string;
  lang: "it" | "en";
};

function BookingForm({
  config,
  category,
  row,
  trip,
  onBack,
}: {
  config: WConfig;
  category: WCategory;
  row: WSearchRow | null;
  trip: Trip;
  onBack: () => void;
}) {
  const { t, lang } = useI18n();
  const quoteFn = useServerFn(werentQuote);
  const bookFn = useServerFn(werentBook);
  const [protectionId, setProtectionId] = useState<string | null>(null);
  const [extras, setExtras] = useState<Record<string, number>>({});
  const [birth, setBirth] = useState("");
  const [customer, setCustomer] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [flight, setFlight] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Una chiave per tentativo: doppio clic o ricarica non creano due prenotazioni.
  const idemKey = useRef(`web-${crypto.randomUUID()}`);

  const validBirth = /^\d{4}-\d{2}-\d{2}$/.test(birth) ? birth : null;
  const extrasList = Object.entries(extras)
    .filter(([, q]) => q > 0)
    .map(([extraId, quantity]) => ({ extraId, quantity }));
  const quote = useQuery({
    queryKey: ["werent-quote", trip, category.id, protectionId, extrasList, validBirth],
    queryFn: async () =>
      unwrap(
        await quoteFn({
          data: {
            ...trip,
            categoryId: category.id,
            insurancePackageId: protectionId,
            extras: extrasList,
            driverBirthDate: validBirth,
          },
        }),
      ),
    placeholderData: (prev) => prev,
  });

  const tier2 = category.protectionTier === 2;
  const photo = categoryPhoto(category.code);
  const formOk =
    validBirth &&
    customer.firstName.trim() &&
    customer.lastName.trim() &&
    /\S+@\S+\.\S+/.test(customer.email) &&
    customer.phone.trim().length >= 5 &&
    terms &&
    privacy &&
    quote.data?.available;

  const submit = async () => {
    setBusy(true);
    setError(null);
    const r = await bookFn({
      data: {
        ...trip,
        categoryId: category.id,
        insurancePackageId: protectionId,
        extras: extrasList,
        driverBirthDate: validBirth!,
        customer,
        flightNumber: flight || null,
        notes: [notes.trim(), utmNote()].filter(Boolean).join("\n") || null,
        acceptTerms: true,
        acceptPrivacy: true,
        marketingConsent: marketing,
        idempotencyKey: idemKey.current,
      },
    }).catch((e: unknown) => ({
      ok: false as const,
      code: "error",
      message: e instanceof Error ? e.message : "Errore",
    }));
    if (!r.ok) {
      setError(r.message);
      setBusy(false);
      // Dati cambiati dopo un errore: nuovo tentativo con una chiave nuova.
      idemKey.current = `web-${crypto.randomUUID()}`;
      return;
    }
    window.location.href = r.data.checkout.url;
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <Button variant="outline" size="sm" className="rounded-full" onClick={onBack}>
          <ArrowLeft className="size-4" /> {t("Cambia veicolo", "Change vehicle")}
        </Button>

        <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          <img
            src={photo.src}
            srcSet={photo.srcSet}
            sizes="200px"
            alt={category.exampleModels ?? category.name}
            width={1536}
            height={1024}
            className="h-28 w-full rounded-lg object-cover sm:w-48"
          />
          <div>
            <Badge variant="secondary" className="rounded-full">
              {category.name}
            </Badge>
            <h2 className="mt-1 font-display text-xl">{category.exampleModels ?? category.name}</h2>
            <CategoryFacts c={category} />
          </div>
        </Card>

        {/* protezione */}
        <section className="space-y-3">
          <h2 className="font-display text-2xl">{t("Protezione", "Protection")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <ChoiceCard
              selected={protectionId === null}
              onClick={() => setProtectionId(null)}
              title={t("Solo RCA", "Third-party liability only")}
              price={t("Inclusa", "Included")}
            >
              {t("Franchigia piena in caso di danni o furto.", "Full excess for damage or theft.")}
              {category.depositCents
                ? ` ${t("Cauzione", "Deposit")} ${eur(category.depositCents, lang)}.`
                : ""}
            </ChoiceCard>
            {config.protections
              .filter(
                (p) =>
                  (tier2 ? (p.dailyPriceTier2Cents ?? p.dailyPriceCents) : p.dailyPriceCents) > 0,
              )
              .map((p) => {
                const daily = tier2
                  ? (p.dailyPriceTier2Cents ?? p.dailyPriceCents)
                  : p.dailyPriceCents;
                const dep = p.depositByCategory[category.id];
                return (
                  <ChoiceCard
                    key={p.id}
                    selected={protectionId === p.id}
                    onClick={() => setProtectionId(p.id)}
                    title={p.name}
                    price={`+ ${eur(daily, lang)}/${t("giorno", "day")}`}
                  >
                    {p.description ?? p.deductibleNote ?? ""}
                    {dep != null && (category.depositCents == null || dep < category.depositCents)
                      ? ` ${t("Cauzione ridotta", "Reduced deposit")} ${eur(dep, lang)}.`
                      : ""}
                  </ChoiceCard>
                );
              })}
          </div>
        </section>

        {/* servizi */}
        {config.extras.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-display text-2xl">{t("Servizi aggiuntivi", "Extras")}</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {config.extras.map((e) => {
                const price = tier2 ? (e.priceTier2Cents ?? e.priceCents) : e.priceCents;
                const q = extras[e.id] ?? 0;
                return (
                  <Card key={e.id} className="flex items-center justify-between gap-3 p-3">
                    <div>
                      <p className="text-sm font-semibold">{e.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {eur(price, lang)}{" "}
                        {e.pricing === "giorno"
                          ? `/${t("giorno", "day")}`
                          : t("a noleggio", "per rental")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 rounded-full p-0"
                        aria-label={t(`Meno ${e.name}`, `Less ${e.name}`)}
                        disabled={q === 0}
                        onClick={() => setExtras({ ...extras, [e.id]: q - 1 })}
                      >
                        −
                      </Button>
                      <span className="w-4 text-center text-sm font-semibold" aria-live="polite">
                        {q}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 rounded-full p-0"
                        aria-label={t(`Aggiungi ${e.name}`, `Add ${e.name}`)}
                        disabled={q >= 3}
                        onClick={() => setExtras({ ...extras, [e.id]: q + 1 })}
                      >
                        +
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* dati */}
        <section className="space-y-3">
          <h2 className="font-display text-2xl">
            {t("Conducente e contatti", "Driver and contact details")}
          </h2>
          <Card className="grid gap-4 p-4 sm:grid-cols-2">
            <Field id="fn" label={t("Nome", "First name")}>
              <Input
                id="fn"
                autoComplete="given-name"
                value={customer.firstName}
                onChange={(e) => setCustomer({ ...customer, firstName: e.target.value })}
              />
            </Field>
            <Field id="ln" label={t("Cognome", "Last name")}>
              <Input
                id="ln"
                autoComplete="family-name"
                value={customer.lastName}
                onChange={(e) => setCustomer({ ...customer, lastName: e.target.value })}
              />
            </Field>
            <Field id="em" label="Email">
              <Input
                id="em"
                type="email"
                autoComplete="email"
                value={customer.email}
                onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
              />
            </Field>
            <Field id="ph" label={t("Telefono", "Phone")}>
              <Input
                id="ph"
                type="tel"
                autoComplete="tel"
                value={customer.phone}
                onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
              />
            </Field>
            <Field
              id="bd"
              label={t("Data di nascita del conducente", "Driver's date of birth")}
              hint={t(
                `Età ammessa ${config.rules.driverAgeMin}–${config.rules.driverAgeMax} anni`,
                `Age ${config.rules.driverAgeMin}–${config.rules.driverAgeMax}`,
              )}
            >
              <Input
                id="bd"
                type="date"
                autoComplete="bday"
                value={birth}
                max={isoDate(0)}
                onChange={(e) => setBirth(e.target.value)}
              />
            </Field>
            <Field id="fl" label={t("Numero di volo (facoltativo)", "Flight number (optional)")}>
              <Input
                id="fl"
                value={flight}
                onChange={(e) => setFlight(e.target.value.toUpperCase())}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field id="nt" label={t("Note (facoltative)", "Notes (optional)")}>
                <Textarea
                  id="nt"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Field>
            </div>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              {t(
                "Al ritiro servono patente valida e documento d'identità del conducente, e una carta di credito per la cauzione.",
                "At pickup you need the driver's valid licence and ID, and a credit card for the deposit.",
              )}
            </p>
          </Card>
        </section>

        <section className="space-y-3">
          <Consent id="terms" checked={terms} onChange={setTerms}>
            {t("Ho letto e accetto le ", "I have read and accept the ")}
            <Link to="/condizioni-generali" target="_blank" className="font-semibold underline">
              {t("condizioni generali di noleggio", "general rental conditions")}
            </Link>
            {t(", comprese le regole di annullamento.", ", including the cancellation rules.")}
          </Consent>
          <Consent id="privacy" checked={privacy} onChange={setPrivacy}>
            {t("Ho preso visione dell'", "I have read the ")}
            <Link to="/privacy-policy" target="_blank" className="font-semibold underline">
              {t("informativa privacy", "privacy notice")}
            </Link>
            .
          </Consent>
          <Consent id="mkt" checked={marketing} onChange={setMarketing}>
            {t(
              "Voglio ricevere offerte e novità We Rent (facoltativo).",
              "I'd like to receive We Rent offers and news (optional).",
            )}
          </Consent>
        </section>
      </div>

      {/* riepilogo */}
      <aside>
        <Card className="space-y-4 p-5 lg:sticky lg:top-4">
          <h2 className="font-display text-xl">{t("Riepilogo", "Summary")}</h2>
          <TripSummary config={config} trip={trip} />
          {quote.isLoading && !quote.data ? (
            <Skeleton className="h-40" />
          ) : quote.error ? (
            <p className="text-sm text-destructive">{(quote.error as Error).message}</p>
          ) : quote.data ? (
            <SummaryLines q={quote.data} loading={quote.isFetching} fallback={row?.quote ?? null} />
          ) : null}
          {quote.data && !quote.data.available && (
            <p className="text-sm font-semibold text-destructive">
              {t(
                "Categoria non più disponibile per queste date.",
                "This category is no longer available for these dates.",
              )}
            </p>
          )}
          {error && (
            <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <Button
            className="w-full rounded-full"
            size="lg"
            disabled={!formOk || busy}
            onClick={() => void submit()}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
            {quote.data
              ? `${t("Paga", "Pay")} ${eur(quote.data.payNow.amountCents, lang)}`
              : t("Paga", "Pay")}
          </Button>
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {t(
              `Pagamento sulla pagina sicura di Stripe. Il veicolo resta riservato per ${config.rules.holdMinutes} minuti mentre completi il pagamento.`,
              `Payment on Stripe's secure page. The vehicle is held for ${config.rules.holdMinutes} minutes while you complete the payment.`,
            )}
          </p>
        </Card>
      </aside>
    </div>
  );
}

function utmNote() {
  try {
    const u = storedUtm() as Record<string, string | undefined>;
    const parts = Object.entries(u)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${v}`);
    return parts.length ? `Provenienza: ${parts.join(" ")}` : "";
  } catch {
    return "";
  }
}

export function TripSummary({ config, trip }: { config: WConfig; trip: Trip }) {
  const { t, lang } = useI18n();
  const b = (id: string) => config.branches.find((x) => x.id === id);
  return (
    <dl className="space-y-2 text-sm">
      <div>
        <dt className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {t("Ritiro", "Pick-up")}
        </dt>
        <dd>
          {fmtDay(trip.dateFrom, lang)} {trip.timeFrom} · {b(trip.pickupBranchId)?.name}
        </dd>
      </div>
      <div>
        <dt className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {t("Riconsegna", "Drop-off")}
        </dt>
        <dd>
          {fmtDay(trip.dateTo, lang)} {trip.timeTo} · {b(trip.returnBranchId)?.name}
        </dd>
      </div>
    </dl>
  );
}

function SummaryLines({
  q,
  loading,
  fallback,
}: {
  q: WFullQuote;
  loading: boolean;
  fallback: WQuote | null;
}) {
  const { t, lang } = useI18n();
  const lines = q.quote.lines ?? fallback?.lines ?? [];
  return (
    <div className={cn("space-y-3 transition-opacity", loading && "opacity-60")}>
      <ul className="space-y-1 text-sm">
        {lines.map((l, i) => (
          <li key={`${l.code}-${i}`} className="flex justify-between gap-3">
            <span className="text-muted-foreground">{l.label}</span>
            <span className="whitespace-nowrap">{eur(l.totalCents, lang)}</span>
          </li>
        ))}
      </ul>
      <div className="flex justify-between border-t border-border pt-2 font-display text-xl">
        <span>{t("Totale", "Total")}</span>
        <span>{eur(q.quote.totalCents, lang)}</span>
      </div>
      <ul className="space-y-1 rounded-lg bg-muted p-3 text-sm">
        <li className="flex justify-between gap-3 font-semibold">
          <span>
            {q.payNow.full
              ? t("Da pagare ora (tutto)", "Pay now (full)")
              : t("Acconto da pagare ora", "Deposit to pay now")}
          </span>
          <span>{eur(q.payNow.amountCents, lang)}</span>
        </li>
        {q.payAtPickupCents > 0 && (
          <li className="flex justify-between gap-3">
            <span className="text-muted-foreground">
              {t("Saldo al ritiro", "Balance at pick-up")}
            </span>
            <span>{eur(q.payAtPickupCents, lang)}</span>
          </li>
        )}
        {q.depositCents != null && (
          <li className="flex justify-between gap-3">
            <span className="text-muted-foreground">
              {t("Cauzione al ritiro (bloccata sulla carta)", "Deposit at pick-up (card hold)")}
            </span>
            <span>{eur(q.depositCents, lang)}</span>
          </li>
        )}
      </ul>
    </div>
  );
}

function ChoiceCard({
  selected,
  onClick,
  title,
  price,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  price: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "rounded-xl border p-4 text-left transition-colors",
        selected
          ? "border-primary bg-primary/5 ring-2 ring-primary"
          : "border-border bg-card hover:bg-accent",
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="font-semibold">{title}</span>
        {selected ? <Check className="size-4 text-primary" aria-hidden /> : null}
      </span>
      <span className="mt-1 block text-sm font-semibold text-primary">{price}</span>
      <span className="mt-1 block text-xs text-muted-foreground">{children}</span>
    </button>
  );
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function Consent({
  id,
  checked,
  onChange,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
        className="mt-0.5"
      />
      <Label htmlFor={id} className="text-sm font-normal leading-relaxed">
        {children}
      </Label>
    </div>
  );
}
