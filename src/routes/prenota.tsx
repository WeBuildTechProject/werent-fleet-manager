import { createFileRoute, Link } from "@tanstack/react-router";
import { absoluteUrl } from "@/lib/seo";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  BadgeEuro,
  CalendarCheck,
  CalendarPlus,
  Car,
  Check,
  CreditCard,
  Download,
  Lock,
  Loader2,
  MessageCircle,
  ShieldCheck,
  Ticket,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchWidget } from "@/components/search-widget";
import { branches as staticBranches, company } from "@/lib/company";
import {
  publicCategoriesQuery,
  publicExtrasQuery,
  publicInsuranceQuery,
  parseBookingSearch,
} from "@/lib/booking";
import { createBookingRequest, searchAvailability, type AvailableVehicle } from "@/lib/booking.functions";
import { createCheckoutSession, getPaymentContext } from "@/lib/payments.functions";
import { vehicles as fleetVehicles } from "@/lib/fleet";
import { InsurancePackagePicker, type InsuranceCatalog } from "@/components/booking/insurance-packages";
import { ScrollToAccept } from "@/components/legal/scroll-to-accept";
import { DocumentUploader, type UploadedDocument } from "@/components/booking/document-uploader";
import { DOCUMENT_TYPES, type DocumentType } from "@/lib/documents";
import { useI18n } from "@/lib/i18n";
import {
  ageSurchargePerDay,
  computePrice,
  pickInsurancePackages,
  type Extra,
} from "@/lib/pricing";
import { storedUtm, trackBookingConversion, useConsent } from "@/lib/tracking";
import { cn } from "@/lib/utils";
import { legalClauseAnchor, legalDocumentsQuery, VEXATIOUS_CLAUSE_CODES } from "@/lib/legal.tsx";
import { privacyNoticeMarkdown } from "@/lib/privacy";
import { PUBLIC_SITE_ONLY } from "@/lib/site-mode";
import { PrenotaRentHubPage } from "@/components/booking/prenota-renthub-page";

export const Route = createFileRoute("/prenota")({
  validateSearch: (search: Record<string, unknown>) => parseBookingSearch(search),
  head: () => ({
    meta: [
      { title: "Prenota online — We Rent Autonoleggio" },
      {
        name: "description",
        content:
          "Prenota la tua auto, van o furgone in un minuto: disponibilità reale sulle nostre sedi, cancellazione gratuita fino a 48h, RCA inclusa.",
      },
      { property: "og:title", content: "Prenota online — We Rent Autonoleggio" },
      {
        property: "og:description",
        content: "Prenotazione in un minuto su Cagliari Elmas, Olbia Aeroporto e Milano Linate.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: absoluteUrl("/prenota") },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/prenota") }],
  }),
  // Fase provvisoria: swap a livello di config (non logica interna al
  // componente) per non introdurre violazioni dell'ordine degli hook e per
  // restare completamente reversibile — il flusso nativo resta intatto.
  component: PUBLIC_SITE_ONLY ? PrenotaRentHubPage : PrenotaPage,
});

const euro = (v: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v);

/** Download lato client di un file generato in memoria (ics/riepilogo). */
function downloadFile(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function buildIcs(input: { code: string; dateFrom: string; dateTo: string; model: string }) {
  const stamp = (d: string) => d.replaceAll("-", "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//We Rent//Prenotazioni//IT",
    "BEGIN:VEVENT",
    `UID:${input.code}@werent`,
    `DTSTART;VALUE=DATE:${stamp(input.dateFrom)}`,
    `DTEND;VALUE=DATE:${stamp(input.dateTo)}`,
    `SUMMARY:Noleggio We Rent ${input.model} (${input.code})`,
    `DESCRIPTION:Prenotazione ${input.code} — ${input.model}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

function isoDate(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/** Foto reale della flotta per modello (fallback: prima foto della categoria). */
function vehicleImage(model: string, macroClass: string) {
  const normalized = model.toLowerCase();
  const exact = fleetVehicles.find((v) => normalized.includes(v.model.toLowerCase().slice(0, 8)));
  if (exact) return exact.image;
  return fleetVehicles.find((v) => v.category === macroClass)?.image ?? fleetVehicles[0]!.image;
}

type CustomerForm = {
  full_name: string;
  email: string;
  phone: string;
  fiscal_code: string;
  driving_license_number: string;
  birth_date: string;
  address: string;
};

function PrenotaPage() {
  const { t, lang } = useI18n();
  const search = Route.useSearch();

  const categories = useQuery(publicCategoriesQuery);
  const extras = useQuery(publicExtrasQuery);
  const insurance = useQuery(publicInsuranceQuery);
  const legalDocuments = useQuery(legalDocumentsQuery);
  const termsDoc = legalDocuments.data?.find((document) => document.slug === "termini-e-condizioni");
  const contractDoc = legalDocuments.data?.find((document) => document.slug === "condizioni-generali");

  // Con criteri già presenti nell'URL si mostrano direttamente i risultati.
  const [step, setStep] = useState(search.date_from && search.from ? 1 : 0);
  const [chosenPick, setChosen] = useState<AvailableVehicle | null>(null);
  const [selectedExtras, setSelectedExtras] = useState<Record<string, number>>({});
  const [insurancePackageId, setInsurancePackageId] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerForm>({
    full_name: "",
    email: "",
    phone: "",
    fiscal_code: "",
    driving_license_number: "",
    birth_date: "",
    address: "",
  });
  // Accettazioni vincolanti: i timestamp vengono catturati nel momento in cui
  // l'utente seleziona ciascuna casella e salvati insieme alla versione mostrata.
  const [consents, setConsents] = useState({
    terms: false,
    contract: false,
    vexatious: false,
    privacy: false,
    marketing: false,
    profiling: false,
    termsAcceptedAt: null as string | null,
    contractAcceptedAt: null as string | null,
    vexatiousAcceptedAt: null as string | null,
    privacyAcceptedAt: null as string | null,
  });
  const legalAcceptance =
    termsDoc?.version &&
    contractDoc?.version &&
    consents.termsAcceptedAt &&
    consents.contractAcceptedAt &&
    consents.vexatiousAcceptedAt &&
    consents.privacyAcceptedAt
      ? {
          termsVersion: termsDoc.version,
          contractVersion: contractDoc.version,
          termsAcceptedAt: consents.termsAcceptedAt,
          privacyAcceptedAt: consents.privacyAcceptedAt,
          contractAcceptedAt: consents.contractAcceptedAt,
          vexatiousAcceptedAt: consents.vexatiousAcceptedAt,
        }
      : null;
  const allMandatoryAccepted = Boolean(
    legalAcceptance &&
      consents.terms &&
      consents.contract &&
      consents.vexatious &&
      consents.privacy,
  );
  // Documenti obbligatori caricati nello spazio privato prima della conferma.
  const [documentSessionId, setDocumentSessionId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Partial<Record<DocumentType, UploadedDocument>>>({});
  const uploadedDocuments = DOCUMENT_TYPES.map((tipo) => documents[tipo]).filter(
    (d): d is UploadedDocument => Boolean(d),
  );
  const allDocumentsUploaded = Boolean(documentSessionId) && uploadedDocuments.length === DOCUMENT_TYPES.length;
  const canConfirm = allMandatoryAccepted && allDocumentsUploaded;
  const [confirmation, setConfirmation] = useState<{ code: string; total: number } | null>(null);

  // Ritorno da Stripe Checkout: ripristina la schermata di conferma.
  useEffect(() => {
    if (search.pagamento && search.code) {
      setConfirmation({ code: search.code, total: 0 });
      setStep(5);
    }
  }, [search.pagamento, search.code]);

  // "Cerca" nel form aggiorna i parametri: si passa subito ai risultati.
  useEffect(() => {
    if (search.from && search.date_from && !search.pagamento) {
      setStep((current) => (current === 0 ? 1 : current));
    }
  }, [
    search.from,
    search.to,
    search.date_from,
    search.date_to,
    search.time_from,
    search.time_to,
    search.age,
    search.promo,
    search.class,
    search.pagamento,
  ]);


  const dateFrom = search.date_from ?? isoDate(1);
  const dateTo = search.date_to ?? isoDate(4);
  const driverAge = search.age ?? "25+";
  const promo = search.promo ?? "";

  // Il codice sede (CAG/OLB/LIN...) è risolto a UUID lato server leggendo
  // la tabella branches: aggiungere o rinominare una sede non richiede
  // modifiche a questo file.
  const branchCode = search.from ?? staticBranches[0]!.code;
  const dropoffBranchCode = search.to ?? branchCode;

  const categoryId = useMemo(() => {
    if (!search.class) return null;
    return (categories.data ?? []).find((c) => c.macro_class === search.class)?.id ?? null;
  }, [search.class, categories.data]);

  const runSearch = useServerFn(searchAvailability);
  const hasQuery = Boolean(search.date_from && search.from);

  // L'email, quando già inserita, permette al server di applicare lo sconto
  // fedeltà del cliente: il preventivo mostrato è già quello definitivo.
  const customerEmail = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(customer.email.trim())
    ? customer.email.trim().toLowerCase()
    : null;

  const availability = useQuery({
    queryKey: [
      "booking",
      "availability",
      branchCode,
      categoryId,
      dateFrom,
      dateTo,
      driverAge,
      promo,
      customerEmail,
    ],
    enabled: hasQuery && Boolean(branchCode) && !categories.isLoading,
    queryFn: () =>
      runSearch({
        data: {
          branchCode,
          categoryId,
          dateFrom,
          dateTo,
          driverAge,
          couponCode: promo || null,
          customerEmail,
        },
      }),
  });

  // Il veicolo scelto è riletto dall'elenco aggiornato: se lo sconto fedeltà
  // entra in gioco dopo l'inserimento dell'email, il totale si allinea subito.
  const chosen =
    (chosenPick && availability.data?.vehicles.find((v) => v.id === chosenPick.id)) ??
    chosenPick;

  const days = availability.data?.days ?? 1;
  const extrasList = (extras.data ?? []) as Extra[];
  const selected = extrasList
    .filter((e) => (selectedExtras[e.id] ?? 0) > 0)
    .map((e) => ({ extra: e, qty: selectedExtras[e.id]! }));

  const insuranceCatalog: InsuranceCatalog = {
    packages: insurance.data?.packages ?? [],
    specs: insurance.data?.specs ?? [],
    components: insurance.data?.components ?? [],
  };
  const insurancePkg =
    insuranceCatalog.packages.find((p) => p.id === insurancePackageId) ?? null;

  // Deep-link "Protezione Zero Pensieri": preseleziona la copertura più
  // protettiva (franchigia residua più bassa) tra quelle valide per il veicolo.
  const wantsExtendedInsurance = search.insurance === "estesa";
  const eligibleInsurance = pickInsurancePackages(
    insuranceCatalog.packages,
    chosen?.category_id,
  );
  const suggestedInsuranceId = eligibleInsurance
    .slice()
    .sort((a, b) => Number(a.franchigia_residua) - Number(b.franchigia_residua))[0]?.id;
  useEffect(() => {
    if (!wantsExtendedInsurance || insurancePackageId || !suggestedInsuranceId) return;
    setInsurancePackageId(suggestedInsuranceId);
  }, [wantsExtendedInsurance, insurancePackageId, suggestedInsuranceId]);

  const breakdown = chosen
    ? computePrice({
        days,
        fallbackDailyRate: chosen.daily_rate,
        driverAge: "25+", // il supplemento età è già incluso nel totale calcolato
        extras: selected,
        insurancePackage: insurancePkg,
      })
    : null;
  const grandTotal = chosen
    ? chosen.total + (breakdown?.extrasTotal ?? 0) + (breakdown?.insuranceTotal ?? 0)
    : 0;

  const submit = useServerFn(createBookingRequest);
  const book = useMutation({
    mutationFn: async () => {
      if (!chosen || !legalAcceptance || !allMandatoryAccepted) {
        throw new Error("Completa le accettazioni obbligatorie prima di inviare la richiesta.");
      }
      if (!documentSessionId || !allDocumentsUploaded) {
        throw new Error("Carica tutti i documenti obbligatori prima di inviare la richiesta.");
      }
      return submit({
        data: {
          vehicleId: chosen!.id,
          branchCode,
          dropoffBranchCode,
          dateFrom,
          dateTo,
          driverAge,
          couponCode: promo || null,
          extras: selected.map((s) => ({ extraId: s.extra.id, qty: s.qty })),
          insurancePackageId,
          customer: {
            full_name: customer.full_name,
            email: customer.email,
            phone: customer.phone,
            fiscal_code: customer.fiscal_code,
            driving_license_number: customer.driving_license_number,
            birth_date: customer.birth_date || null,
            address: customer.address,
          },
          notes: "",
          consensoPrivacy: consents.privacy,
          consensoMarketing: consents.marketing,
          consensoProfilazione: consents.profiling,
          documentSessionId,
          documents: DOCUMENT_TYPES.map((tipo) => ({ tipo, path: documents[tipo]!.path })),
          ...legalAcceptance,
          // UTM dalla query corrente, con fallback su quelle di atterraggio.
          utm_source: search.utm_source ?? storedUtm().utm_source ?? null,
          utm_medium: search.utm_medium ?? storedUtm().utm_medium ?? null,
          utm_campaign: search.utm_campaign ?? storedUtm().utm_campaign ?? null,
        },
      });
    },
    onSuccess: (res) => {
      setConfirmation({ code: res.code, total: res.total });
      setStep(5);
    },
    onError: (e: Error) =>
      toast.error(t("Richiesta non inviata", "Request not sent"), { description: e.message }),
  });

  const badges = [
    { icon: Lock, label: t("Connessione crittografata", "Encrypted connection") },
    { icon: CalendarCheck, label: t("Cancellazione gratuita fino a 48h", "Free cancellation up to 48h") },
    { icon: ShieldCheck, label: t("RCA e IVA incluse", "Insurance and VAT included") },
  ];

  const stepLabels = [
    t("Ricerca", "Search"),
    t("Veicoli", "Vehicles"),
    t("Extra", "Extras"),
    t("Dati cliente", "Customer"),
    t("Riepilogo", "Summary"),
    t("Conferma", "Confirmation"),
  ];

  const ageSurcharge = ageSurchargePerDay[driverAge] ?? 0;

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
              "Disponibilità in tempo reale sulle nostre tre sedi, gestita direttamente da noi.",
              "Real-time availability across our three branches, managed directly by us.",
            )}
          </p>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
            {badges.map((badge) => (
              <li key={badge.label} className="flex items-center gap-2 text-sm font-semibold text-ink/80">
                <badge.icon className="size-4" aria-hidden />
                {badge.label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-28 pt-10 sm:px-6 lg:pb-10">
        <ol className="mb-6 flex flex-wrap gap-2" aria-label={t("Passaggi", "Steps")}>
          {stepLabels.map((label, i) => (
            <li
              key={label}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-bold",
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {i + 1}. {label}
            </li>
          ))}
        </ol>

        {step === 0 ? (
          <div className="space-y-4">
            <SearchWidget
              variant="page"
              initial={{
                from: search.from,
                to: search.to,
                date_from: search.date_from,
                time_from: search.time_from,
                date_to: search.date_to,
                time_to: search.time_to,
                age: search.age,
                promo: search.promo,
              }}
            />
            <p className="text-sm text-muted-foreground">
              {t(
                "Imposta sede e date, poi avvia la ricerca per vedere la disponibilità reale.",
                "Set branch and dates, then search to see real availability.",
              )}
            </p>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            {/* Barra ricerca sempre accessibile durante lo scroll dei risultati. */}
            <div className="sticky top-0 z-30 -mx-4 flex flex-wrap items-center gap-3 border-b border-border bg-background/95 px-4 py-3 text-sm text-muted-foreground backdrop-blur sm:-mx-6 sm:px-6">
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => setStep(0)}>
                <ArrowLeft className="size-4" /> {t("Modifica ricerca", "Edit search")}
              </Button>
              <span>
                {dateFrom} → {dateTo} · {days} {t("giorni", "days")}
              </span>
              {availability.data?.couponApplied ? (
                <Badge className="rounded-full">
                  <Ticket className="size-3" /> {availability.data.couponApplied}
                </Badge>
              ) : null}
              {ageSurcharge > 0 ? (
                <Badge variant="secondary" className="rounded-full">
                  {t("Supplemento età", "Age surcharge")} {driverAge}: {euro(ageSurcharge)}/
                  {t("g", "d")}
                </Badge>
              ) : null}
            </div>

            {availability.isLoading ? (
              <div className="grid gap-4 md:grid-cols-3">
                <Skeleton className="h-72" />
                <Skeleton className="h-72" />
                <Skeleton className="h-72" />
              </div>
            ) : (availability.data?.vehicles.length ?? 0) === 0 ? (
              <Card className="p-6 text-sm text-muted-foreground">
                {t(
                  "Nessun veicolo disponibile per queste date in questa sede. Prova a cambiare periodo o categoria.",
                  "No vehicle available for these dates at this branch. Try another period or category.",
                )}
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                {(availability.data?.vehicles ?? []).map((v) => (
                  <Card key={v.id} className="overflow-hidden p-0 shadow-card">
                    <img
                      src={vehicleImage(v.model, v.macro_class)}
                      alt={v.model}
                      width={1536}
                      height={1024}
                      className="h-40 w-full object-cover"
                      loading="lazy"
                    />
                    <div className="space-y-2 p-4">
                      <Badge variant="secondary" className="rounded-full">
                        {lang === "en" ? v.category_label_en : v.category_label_it}
                      </Badge>
                      <h2 className="font-display text-lg">{v.model}</h2>
                      <p className="text-sm text-muted-foreground">
                        {euro(v.daily_rate)}/{t("giorno", "day")} · {v.days} {t("giorni", "days")}
                      </p>
                      <p className="font-display text-2xl">{euro(v.total)}</p>
                      <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                        <BadgeEuro className="size-3.5" aria-hidden />
                        {t("Nessun costo nascosto", "No hidden costs")}
                      </p>
                      <Button
                        className="w-full rounded-full"
                        onClick={() => {
                          setChosen(v);
                          setStep(2);
                        }}
                      >
                        <Car className="size-4" /> {t("Scegli", "Select")}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {step === 2 && chosen ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-5">
              <div className="space-y-3">
                <div>
                  <h2 className="font-display text-2xl">
                    {t("Copertura assicurativa", "Insurance coverage")}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "RCA e IVA sono sempre incluse. Scegli quanta franchigia vuoi lasciare a tuo carico.",
                      "Third-party liability and VAT always included. Choose how much deductible you keep.",
                    )}
                  </p>
                </div>
                <InsurancePackagePicker
                  catalog={insuranceCatalog}
                  categoryId={chosen.category_id}
                  days={days}
                  selectedId={insurancePackageId}
                  onSelect={setInsurancePackageId}
                  labels={{
                    perDay: t("al giorno", "per day"),
                    deductible: t("Franchigia residua", "Remaining deductible"),
                    choose: t("Scegli", "Choose"),
                    chosen: t("Selezionato", "Selected"),
                    total: t("totale periodo", "period total"),
                  }}
                />
              </div>
              <h2 className="font-display text-2xl">{t("Extra a pagamento", "Paid extras")}</h2>
              {extrasList.map((e) => {
                const qty = selectedExtras[e.id] ?? 0;
                return (
                  <Card key={e.id} className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <p className="font-semibold">{lang === "en" ? e.label_en : e.label_it}</p>
                      <p className="text-xs text-muted-foreground">
                        {euro(Number(e.price_per_day))}{" "}
                        {e.price_type === "una_tantum"
                          ? t("una tantum", "one-off")
                          : t("al giorno", "per day")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        aria-label={t("Riduci", "Decrease")}
                        onClick={() =>
                          setSelectedExtras((s) => ({ ...s, [e.id]: Math.max(0, qty - 1) }))
                        }
                      >
                        −
                      </Button>
                      <span className="w-6 text-center font-semibold">{qty}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        aria-label={t("Aumenta", "Increase")}
                        onClick={() =>
                          setSelectedExtras((s) => ({ ...s, [e.id]: Math.min(e.max_qty, qty + 1) }))
                        }
                      >
                        +
                      </Button>
                    </div>
                  </Card>
                );
              })}
              <div className="flex gap-2">
                <Button variant="outline" className="rounded-full" onClick={() => setStep(1)}>
                  <ArrowLeft className="size-4" /> {t("Indietro", "Back")}
                </Button>
                <Button className="rounded-full" onClick={() => setStep(3)}>
                  {t("Continua", "Continue")}
                </Button>
              </div>
            </div>
            <Summary
              chosen={chosen}
              extrasTotal={breakdown?.extrasTotal ?? 0}
              insuranceTotal={breakdown?.insuranceTotal ?? 0}
              insuranceName={insurancePkg?.nome ?? null}
              loyaltyDiscount={chosen.loyalty_discount}
              loyaltyTierName={null}
              total={grandTotal}
              days={days}
            />
          </div>
        ) : null}

        {step === 3 && chosen ? (
          <form
            className="grid gap-6 lg:grid-cols-[1fr_320px]"
            onSubmit={(e) => {
              e.preventDefault();
              if (!allMandatoryAccepted) {
                toast.error(t("Completa le accettazioni obbligatorie.", "Complete the required acceptances."));
                return;
              }
              if (!allDocumentsUploaded) {
                toast.error(
                  t("Carica tutti i documenti richiesti.", "Upload all the required documents."),
                );
                return;
              }
              setStep(4);
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                id="full_name"
                label={t("Nome e cognome", "Full name")}
                value={customer.full_name}
                onChange={(v) => setCustomer({ ...customer, full_name: v })}
                required
                className="sm:col-span-2"
              />
              <Field
                id="email"
                type="email"
                label="Email"
                value={customer.email}
                onChange={(v) => setCustomer({ ...customer, email: v })}
                required
              />
              <Field
                id="phone"
                label={t("Telefono", "Phone")}
                value={customer.phone}
                onChange={(v) => setCustomer({ ...customer, phone: v })}
              />
              <Field
                id="fiscal_code"
                label={t("Codice fiscale", "Tax code")}
                value={customer.fiscal_code}
                onChange={(v) => setCustomer({ ...customer, fiscal_code: v })}
              />
              <Field
                id="dl"
                label={t("Numero patente", "Driving licence no.")}
                value={customer.driving_license_number}
                onChange={(v) => setCustomer({ ...customer, driving_license_number: v })}
              />
              <Field
                id="birth"
                type="date"
                label={t("Data di nascita", "Date of birth")}
                value={customer.birth_date}
                onChange={(v) => setCustomer({ ...customer, birth_date: v })}
              />
              <Field
                id="address"
                label={t("Indirizzo", "Address")}
                value={customer.address}
                onChange={(v) => setCustomer({ ...customer, address: v })}
                className="sm:col-span-2"
              />
              <fieldset className="space-y-4 rounded-lg border border-border p-4 sm:col-span-2">
                <legend className="px-1 text-sm font-medium">
                  {t("Accettazioni e consensi", "Acceptances and consents")}
                </legend>

                <ScrollToAccept
                  title={t("Termini e Condizioni", "Terms and Conditions")}
                  content={termsDoc?.content_md}
                  version={termsDoc?.version}
                  checked={consents.terms}
                  onCheckedChange={(value) =>
                    setConsents((c) => ({
                      ...c,
                      terms: value,
                      termsAcceptedAt: value ? new Date().toISOString() : null,
                    }))
                  }
                  scrollHint={t(
                    "Scorri il testo fino in fondo per poter accettare.",
                    "Scroll to the end of the text to be able to accept.",
                  )}
                  readHint={t("Documento letto integralmente.", "Document read in full.")}
                  label={t(
                    "Dichiaro di aver letto e accetto i Termini e Condizioni",
                    "I declare I have read and accept the Terms and Conditions",
                  )}
                />

                <ScrollToAccept
                  title={t("Condizioni Generali di Noleggio", "General Rental Conditions")}
                  content={contractDoc?.content_md}
                  version={contractDoc?.version}
                  checked={consents.contract}
                  onCheckedChange={(value) =>
                    setConsents((c) => ({
                      ...c,
                      contract: value,
                      contractAcceptedAt: value ? new Date().toISOString() : null,
                      // Le clausole vessatorie non possono restare accettate se
                      // l'accettazione del contratto viene revocata.
                      vexatious: value ? c.vexatious : false,
                      vexatiousAcceptedAt: value ? c.vexatiousAcceptedAt : null,
                    }))
                  }
                  scrollHint={t(
                    "Scorri il contratto fino in fondo per poter accettare.",
                    "Scroll the contract to the end to be able to accept.",
                  )}
                  readHint={t("Contratto letto integralmente.", "Contract read in full.")}
                  label={t(
                    "Dichiaro di aver letto e accetto le Condizioni Generali di Noleggio",
                    "I declare I have read and accept the General Rental Conditions",
                  )}
                />

                <label
                  className={cn(
                    "flex items-start gap-3 rounded-lg border border-border p-4 text-sm",
                    !consents.contract && "opacity-60",
                  )}
                >
                  <Checkbox
                    checked={consents.vexatious}
                    disabled={!consents.contract}
                    onCheckedChange={(v) => {
                      const value = v === true;
                      setConsents((c) => ({
                        ...c,
                        vexatious: value,
                        vexatiousAcceptedAt: value ? new Date().toISOString() : null,
                      }));
                    }}
                    aria-required
                  />
                  <span className="min-w-0">
                    {t(
                      "Ai sensi degli artt. 1341 e 1342 c.c. approvo specificamente le seguenti clausole:",
                      "Pursuant to articles 1341 and 1342 of the Italian Civil Code I specifically approve the following clauses:",
                    )}
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      {VEXATIOUS_CLAUSE_CODES.map((code) => (
                        <a
                          key={code}
                          href={`/condizioni-generali#${legalClauseAnchor(code)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-sm border border-border px-1.5 py-0.5 text-xs font-semibold underline-offset-2 hover:underline"
                        >
                          {code}
                        </a>
                      ))}
                    </span>{" "}
                    <span className="text-destructive">*</span>
                  </span>
                </label>

                <ScrollToAccept
                  title={t("Informativa Privacy", "Privacy Policy")}
                  content={privacyNoticeMarkdown(lang)}
                  version={1}
                  checked={consents.privacy}
                  onCheckedChange={(value) =>
                    setConsents((c) => ({
                      ...c,
                      privacy: value,
                      privacyAcceptedAt: value ? new Date().toISOString() : null,
                    }))
                  }
                  scrollHint={t(
                    "Scorri l'informativa fino in fondo per poter accettare.",
                    "Scroll the privacy notice to the end to be able to accept.",
                  )}
                  readHint={t("Informativa letta integralmente.", "Privacy notice read in full.")}
                  label={t(
                    "Dichiaro di aver letto l'Informativa Privacy",
                    "I declare I have read the Privacy Policy",
                  )}
                />

                <p className="text-xs text-muted-foreground">
                  {t(
                    "I documenti integrali sono sempre consultabili: ",
                    "The full documents are always available: ",
                  )}
                  <Link to="/termini-e-condizioni" className="underline">
                    {t("Termini e Condizioni", "Terms and Conditions")}
                  </Link>
                  {" · "}
                  <Link to="/condizioni-generali" className="underline">
                    {t("Condizioni Generali di Noleggio", "General Rental Conditions")}
                  </Link>
                </p>

                <label className="flex items-start gap-3 text-sm">
                  <Checkbox
                    checked={consents.marketing}
                    onCheckedChange={(v) => setConsents((c) => ({ ...c, marketing: v === true }))}
                  />
                  <span>
                    {t(
                      "Desidero ricevere comunicazioni commerciali (opzionale)",
                      "I want to receive commercial communications (optional)",
                    )}
                  </span>
                </label>
                <label className="flex items-start gap-3 text-sm">
                  <Checkbox
                    checked={consents.profiling}
                    onCheckedChange={(v) => setConsents((c) => ({ ...c, profiling: v === true }))}
                  />
                  <span>
                    {t(
                      "Acconsento alla profilazione per offerte personalizzate (opzionale)",
                      "I consent to profiling for personalised offers (optional)",
                    )}
                  </span>
                </label>
              </fieldset>

              <fieldset className="space-y-4 rounded-lg border border-border p-4 sm:col-span-2">
                <legend className="px-1 text-sm font-medium">{t("Documenti", "Documents")}</legend>
                <DocumentUploader
                  sessionId={documentSessionId}
                  onSessionId={setDocumentSessionId}
                  value={documents}
                  onChange={(tipo, doc) => setDocuments((prev) => ({ ...prev, [tipo]: doc }))}
                />
              </fieldset>

              <div className="flex gap-2 sm:col-span-2">
                <Button type="button" variant="outline" className="rounded-full" onClick={() => setStep(2)}>
                  <ArrowLeft className="size-4" /> {t("Indietro", "Back")}
                </Button>
                <Button type="submit" className="rounded-full" disabled={!canConfirm}>
                  {t("Vai al riepilogo", "Go to summary")}
                </Button>
              </div>
            </div>
            <Summary
              chosen={chosen}
              extrasTotal={breakdown?.extrasTotal ?? 0}
              insuranceTotal={breakdown?.insuranceTotal ?? 0}
              insuranceName={insurancePkg?.nome ?? null}
              loyaltyDiscount={chosen.loyalty_discount}
              loyaltyTierName={null}
              total={grandTotal}
              days={days}
            />
          </form>
        ) : null}

        {step === 4 && chosen ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <Card className="space-y-3 p-6">
              <h2 className="font-display text-2xl">{t("Riepilogo richiesta", "Request summary")}</h2>
              <p className="text-sm text-muted-foreground">
                {customer.full_name} · {customer.email}
              </p>
              <p className="text-sm text-muted-foreground">
                {chosen.model} · {dateFrom} → {dateTo} · {days} {t("giorni", "days")}
              </p>
              {selected.length > 0 ? (
                <ul className="text-sm text-muted-foreground">
                  {selected.map((s) => (
                    <li key={s.extra.id}>
                      {s.qty}× {lang === "en" ? s.extra.label_en : s.extra.label_it}
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {t(
                  "Nessun pagamento richiesto ora: invii una richiesta di prenotazione, un nostro operatore la conferma e ti contatta.",
                  "No payment now: you send a booking request, our staff confirms it and contacts you.",
                )}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" className="rounded-full" onClick={() => setStep(3)}>
                  <ArrowLeft className="size-4" /> {t("Indietro", "Back")}
                </Button>
                <Button
                  className="rounded-full"
                  disabled={book.isPending || !customer.full_name || !customer.email || !canConfirm}
                  onClick={() => book.mutate()}
                >
                  {book.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  {t("Richiedi prenotazione", "Request booking")}
                </Button>
              </div>
            </Card>
            <Summary
              chosen={chosen}
              extrasTotal={breakdown?.extrasTotal ?? 0}
              insuranceTotal={breakdown?.insuranceTotal ?? 0}
              insuranceName={insurancePkg?.nome ?? null}
              loyaltyDiscount={chosen.loyalty_discount}
              loyaltyTierName={null}
              total={grandTotal}
              days={days}
            />
          </div>
        ) : null}

        {step === 5 && confirmation ? (
          <Card className="max-w-xl space-y-3 p-8 text-center">
            <Check className="mx-auto size-10 text-primary" aria-hidden />
            <h2 className="font-display text-3xl">{t("Richiesta inviata", "Request sent")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("Numero prenotazione", "Booking number")}
            </p>
            <p className="font-mono text-2xl font-bold">{confirmation.code}</p>
            {confirmation.total > 0 ? (
              <p className="font-display text-xl">{euro(confirmation.total)}</p>
            ) : null}
            <PaymentPanel code={confirmation.code} />

            <div className="flex flex-wrap justify-center gap-2 border-t border-border pt-4">
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() =>
                  downloadFile(
                    `we-rent-${confirmation.code}.ics`,
                    "text/calendar",
                    buildIcs({
                      code: confirmation.code,
                      dateFrom,
                      dateTo,
                      model: chosen?.model ?? "",
                    }),
                  )
                }
              >
                <CalendarPlus className="size-4" /> {t("Aggiungi al calendario", "Add to calendar")}
              </Button>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() =>
                  downloadFile(
                    `we-rent-${confirmation.code}.txt`,
                    "text/plain",
                    [
                      `We Rent — ${t("riepilogo prenotazione", "booking summary")}`,
                      `${t("Codice", "Code")}: ${confirmation.code}`,
                      `${t("Veicolo", "Vehicle")}: ${chosen?.model ?? "-"}`,
                      `${t("Periodo", "Period")}: ${dateFrom} → ${dateTo}`,
                      `${t("Cliente", "Customer")}: ${customer.full_name} ${customer.email}`,
                      confirmation.total > 0 ? `${t("Totale", "Total")}: ${euro(confirmation.total)}` : "",
                      company.name,
                    ]
                      .filter(Boolean)
                      .join("\n"),
                  )
                }
              >
                <Download className="size-4" /> {t("Scarica riepilogo", "Download summary")}
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/contatti">
                  <MessageCircle className="size-4" /> {t("Contattaci", "Contact us")}
                </Link>
              </Button>
            </div>
          </Card>
        ) : null}
      </section>
    </>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  required,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Summary({
  chosen,
  extrasTotal,
  insuranceTotal,
  insuranceName,
  loyaltyDiscount = 0,
  loyaltyTierName,
  total,
  days,
}: {
  chosen: AvailableVehicle;
  extrasTotal: number;
  insuranceTotal?: number;
  insuranceName?: string | null;
  loyaltyDiscount?: number;
  loyaltyTierName?: string | null;
  total: number;
  days: number;
}) {
  const { t } = useI18n();
  return (
    <>
      {/* Riepilogo persistente: laterale su desktop, barra in fondo su mobile. */}
      <Card className="sticky top-24 hidden h-fit space-y-2 p-5 text-sm shadow-card lg:block">
        <p className="font-display text-lg">{chosen.model}</p>
        <div className="flex justify-between text-muted-foreground">
          <span>
            {days} {t("giorni", "days")} × {euro(chosen.daily_rate)}
          </span>
          {/* Importo al lordo dello sconto fedeltà, che è una riga a sé. */}
          <span>{euro(chosen.total + loyaltyDiscount)}</span>
        </div>
        {loyaltyDiscount > 0 ? (
          <div className="flex justify-between font-semibold text-primary">
            <span>
              {t("Sconto fedeltà", "Loyalty discount")}
              {loyaltyTierName ? ` — ${t("livello", "tier")} ${loyaltyTierName}` : ""}
            </span>
            <span>-{euro(loyaltyDiscount)}</span>
          </div>
        ) : null}
        {insuranceTotal && insuranceTotal > 0 ? (
          <div className="flex justify-between text-muted-foreground">
            <span>
              {t("Copertura", "Coverage")} {insuranceName ?? ""}
            </span>
            <span>{euro(insuranceTotal)}</span>
          </div>
        ) : null}
        {extrasTotal > 0 ? (
          <div className="flex justify-between text-muted-foreground">
            <span>{t("Extra", "Extras")}</span>
            <span>{euro(extrasTotal)}</span>
          </div>
        ) : null}
        <div className="flex items-baseline justify-between border-t border-border pt-2">
          <span className="font-semibold">{t("Totale", "Total")}</span>
          <span className="font-display text-2xl">{euro(total)}</span>
        </div>
        <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
          <BadgeEuro className="size-3.5" aria-hidden /> {t("Nessun costo nascosto", "No hidden costs")}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("Sconti, coupon e supplemento età sono già inclusi.", "Discounts, coupons and age surcharge included.")}
        </p>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-border bg-card/95 px-4 py-3 shadow-card backdrop-blur lg:hidden">
        <div className="text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">{chosen.model}</p>
          <p>
            {days} {t("giorni", "days")} · {t("nessun costo nascosto", "no hidden costs")}
          </p>
        </div>
        <p className="font-display text-xl">{euro(total)}</p>
      </div>
    </>
  );
}

/**
 * Pagamento online.
 * STATO NOTO E DICHIARATO: se le chiavi Stripe non sono configurate
 * (STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET), il pannello degrada
 * mostrando "pagamento in sede" come unica opzione, senza errori.
 */
function PaymentPanel({ code }: { code: string }) {
  const { t } = useI18n();
  const { consent } = useConsent();
  const loadContext = useServerFn(getPaymentContext);
  const startCheckout = useServerFn(createCheckoutSession);

  const ctx = useQuery({
    queryKey: ["booking", "payment-context", code],
    queryFn: () => loadContext({ data: { code } }),
  });

  // Conversione Google Ads: solo a pagamento realmente riuscito.
  const paid = Boolean(ctx.data?.alreadyPaid);
  const paidValue = ctx.data?.amountNow ?? 0;
  useEffect(() => {
    if (paid) trackBookingConversion({ reservationCode: code, value: paidValue, consent });
  }, [paid, paidValue, code, consent]);

  const pay = useMutation({
    mutationFn: () => startCheckout({ data: { code, origin: window.location.origin } }),
    onSuccess: (res) => {
      if (res.url) window.location.assign(res.url);
      else toast.info(t("Pagamento in sede al ritiro.", "Payment on site at pickup."));
    },
    onError: (e: Error) =>
      toast.error(t("Pagamento non avviato", "Payment not started"), { description: e.message }),
  });

  if (ctx.isLoading) return <Skeleton className="mx-auto h-10 w-48" />;

  if (!ctx.data?.stripeEnabled) {
    return (
      <p className="text-sm text-muted-foreground">
        {t(
          "Pagamento in sede al ritiro: nessun addebito online. Ti confermiamo la disponibilità via email entro poche ore.",
          "Payment on site at pickup: no online charge. We'll confirm availability by email within a few hours.",
        )}
      </p>
    );
  }

  if (ctx.data.alreadyPaid) {
    return (
      <p className="text-sm font-semibold text-primary">
        {t("Pagamento ricevuto. Prenotazione confermata.", "Payment received. Booking confirmed.")}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        {ctx.data.mode === "caparra"
          ? t(
              `Caparra del ${ctx.data.depositPct}% da pagare ora: ${euro(ctx.data.amountNow)} · saldo al ritiro ${euro(ctx.data.balanceAtPickup)}.`,
              `${ctx.data.depositPct}% deposit due now: ${euro(ctx.data.amountNow)} · balance at pickup ${euro(ctx.data.balanceAtPickup)}.`,
            )
          : t(
              `Pagamento completo online: ${euro(ctx.data.amountNow)}.`,
              `Full online payment: ${euro(ctx.data.amountNow)}.`,
            )}
      </p>
      <Button
        className="rounded-full"
        disabled={pay.isPending}
        onClick={() => pay.mutate()}
      >
        {pay.isPending ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
        {t("Paga e conferma", "Pay and confirm")}
      </Button>
      <p className="text-xs text-muted-foreground">
        {t(
          "Pagamento sicuro Stripe. In alternativa puoi pagare in sede al ritiro.",
          "Secure Stripe payment. Alternatively you can pay on site at pickup.",
        )}
      </p>
    </div>
  );
}
