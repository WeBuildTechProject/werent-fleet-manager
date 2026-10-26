import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  CreditCard,
  Loader2,
  MessageCircle,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

import { categoryPhoto, eur } from "@/lib/werent-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { company } from "@/lib/company";
import { useI18n } from "@/lib/i18n";
import { trackBookingConversion, useConsent } from "@/lib/tracking";
import { cn } from "@/lib/utils";
import {
  werentBooking,
  werentCancel,
  werentResumePayment,
  type WBookingView,
} from "@/lib/werent-booking.functions";

/**
 * «La mia prenotazione»: pagina aperta dal link nell'email e dal ritorno da Stripe (lotto 7b).
 * Accesso con il codice di gestione nel link (?t=…): niente account, niente password.
 */
export const Route = createFileRoute("/prenotazione/$code")({
  validateSearch: (s: Record<string, unknown>) => ({
    t: typeof s["t"] === "string" ? s["t"].slice(0, 64) : "",
    ...(s["esito"] === "ok" || s["esito"] === "annullato"
      ? { esito: s["esito"] as "ok" | "annullato" }
      : {}),
  }),
  head: () => ({
    meta: [
      { title: "La mia prenotazione — We Rent" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ManageBookingPage,
});

const fmtWhen = (iso: string, lang: "it" | "en") =>
  new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "it-IT", {
    timeZone: "Europe/Rome",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

function ManageBookingPage() {
  const { code } = Route.useParams();
  const { t: token, esito } = Route.useSearch();
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const load = useServerFn(werentBooking);
  const cancelFn = useServerFn(werentCancel);
  const payFn = useServerFn(werentResumePayment);
  const consent = useConsent();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["werent-booking", code, token, lang],
    queryFn: async () => {
      const r = await load({ data: { code, t: token, lang } });
      if (!r.ok) throw new Error(r.message);
      return r.data;
    },
    enabled: token.length >= 10,
    // Di ritorno da Stripe il pagamento può arrivare qualche secondo dopo: si ricontrolla.
    refetchInterval: (query) =>
      query.state.data?.state === "in_attesa_pagamento" && esito === "ok" ? 4000 : false,
  });
  const b = q.data;

  useEffect(() => {
    if (b && esito === "ok" && b.state === "confermata" && b.paidCents > 0) {
      trackBookingConversion({
        reservationCode: b.code,
        value: b.totalCents / 100,
        consent: consent.consent,
      });
    }
  }, [b, esito, consent]);

  const refresh = (next: WBookingView) =>
    qc.setQueryData(["werent-booking", code, token, lang], next);

  if (token.length < 10)
    return (
      <Shell>
        <Card className="p-6">
          {t(
            "Link non valido: usa il link che trovi nell'email di conferma.",
            "Invalid link: please use the link in your confirmation email.",
          )}
        </Card>
      </Shell>
    );
  if (q.isLoading)
    return (
      <Shell>
        <Skeleton className="h-96" />
      </Shell>
    );
  if (q.error || !b)
    return (
      <Shell>
        <Card className="p-6">
          {(q.error as Error)?.message ?? t("Prenotazione non trovata", "Booking not found")}
        </Card>
      </Shell>
    );

  const photo = categoryPhoto(b.category.code);
  const waiting = b.state === "in_attesa_pagamento";
  const cancelled = b.state === "annullata";

  return (
    <Shell>
      <div className="space-y-6">
        {waiting && esito === "ok" ? (
          <Banner
            tone="info"
            icon={Loader2}
            spin
            title={t("Stiamo ricevendo il pagamento…", "We're receiving your payment…")}
          >
            {t(
              "Ci vuole qualche secondo: la pagina si aggiorna da sola.",
              "It takes a few seconds: this page updates by itself.",
            )}
          </Banner>
        ) : waiting ? (
          <Banner
            tone="warn"
            icon={AlertTriangle}
            title={t("Pagamento da completare", "Payment to complete")}
          >
            {t(
              `Il veicolo è riservato fino alle ${b.paymentDueBy ? fmtWhen(b.paymentDueBy, lang).split(", ").pop() : ""}: completa il pagamento per confermare la prenotazione.`,
              `The vehicle is held until ${b.paymentDueBy ? fmtWhen(b.paymentDueBy, lang).split(", ").pop() : ""}: complete the payment to confirm your booking.`,
            )}
          </Banner>
        ) : cancelled ? (
          <Banner
            tone="muted"
            icon={XCircle}
            title={t("Prenotazione annullata", "Booking cancelled")}
          >
            {done ?? b.cancelReason ?? ""}
          </Banner>
        ) : b.state === "confermata" || b.state === "in_preparazione" ? (
          <Banner
            tone="ok"
            icon={CheckCircle2}
            title={
              esito === "ok"
                ? t(
                    "Pagamento ricevuto: prenotazione confermata!",
                    "Payment received: booking confirmed!",
                  )
                : t("Prenotazione confermata", "Booking confirmed")
            }
          >
            {t(
              `Ti abbiamo mandato la conferma a ${b.customer.email ?? ""}.`,
              `We sent the confirmation to ${b.customer.email ?? ""}.`,
            )}
          </Banner>
        ) : null}

        <Card className="overflow-hidden p-0">
          <div className="grid gap-0 md:grid-cols-[260px_1fr]">
            <img
              src={photo.src}
              srcSet={photo.srcSet}
              sizes="260px"
              alt={b.category.exampleModels ?? b.category.name}
              width={1536}
              height={1024}
              className="h-48 w-full object-cover md:h-full"
            />
            <div className="space-y-4 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-bold">{b.code}</span>
                <StateBadge state={b.state} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {b.category.name}
                </p>
                <h1 className="font-display text-2xl">
                  {b.category.exampleModels ?? b.category.name}
                </h1>
                {b.customer.firstName && (
                  <p className="text-sm text-muted-foreground">
                    {b.customer.firstName} {b.customer.lastName}
                  </p>
                )}
              </div>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {t("Ritiro", "Pick-up")}
                  </dt>
                  <dd className="font-semibold">{fmtWhen(b.pickup.at, lang)}</dd>
                  <dd>{b.pickup.branch.name}</dd>
                  <dd className="text-muted-foreground">{b.pickup.branch.address}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {t("Riconsegna", "Drop-off")}
                  </dt>
                  <dd className="font-semibold">{fmtWhen(b.return.at, lang)}</dd>
                  <dd>{b.return.branch.name}</dd>
                  <dd className="text-muted-foreground">{b.return.branch.address}</dd>
                </div>
              </dl>
            </div>
          </div>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="space-y-3 p-5">
            <h2 className="font-display text-xl">{t("Prezzo", "Price")}</h2>
            <ul className="space-y-1 text-sm">
              {b.lines.map((l, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="text-muted-foreground">{l.label}</span>
                  <span>{eur(l.totalCents, lang)}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between border-t border-border pt-2 font-display text-lg">
              <span>{t("Totale", "Total")}</span>
              <span>{eur(b.totalCents, lang)}</span>
            </div>
            <ul className="space-y-1 rounded-lg bg-muted p-3 text-sm">
              <li className="flex justify-between">
                <span>{t("Pagato", "Paid")}</span>
                <span className="font-semibold">{eur(b.paidCents, lang)}</span>
              </li>
              {!cancelled && b.payAtPickupCents > 0 && (
                <li className="flex justify-between">
                  <span>{t("Da pagare al ritiro", "To pay at pick-up")}</span>
                  <span>{eur(b.payAtPickupCents, lang)}</span>
                </li>
              )}
              {!cancelled && b.depositCents != null && (
                <li className="flex justify-between">
                  <span>
                    {t(
                      "Cauzione al ritiro (bloccata sulla carta)",
                      "Deposit at pick-up (card hold)",
                    )}
                  </span>
                  <span>{eur(b.depositCents, lang)}</span>
                </li>
              )}
            </ul>
            {waiting && b.payment && (
              <Button
                className="w-full rounded-full"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  const r = await payFn({ data: { code, t: token, lang } });
                  if (r.ok) window.location.href = r.data.checkout.url;
                  else {
                    setError(r.message);
                    setBusy(false);
                  }
                }}
              >
                <CreditCard className="size-4" /> {t("Paga", "Pay")}{" "}
                {eur(b.payment.amountCents, lang)}
              </Button>
            )}
          </Card>

          <Card className="space-y-3 p-5">
            <h2 className="font-display text-xl">{t("Al ritiro", "At pick-up")}</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <CalendarCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                {t(
                  "Patente valida e documento d'identità del conducente.",
                  "The driver's valid licence and ID.",
                )}
              </li>
              <li className="flex gap-2">
                <CreditCard className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                {t("Carta di credito o di debito (Visa o Mastercard) per la cauzione.", "A credit or debit card (Visa or Mastercard) for the deposit.")}
              </li>
            </ul>
            <a
              href={`${company.whatsapp}?text=${encodeURIComponent(t(`Ciao, ho una domanda sulla prenotazione ${b.code}`, `Hi, I have a question about booking ${b.code}`))}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary underline"
            >
              <MessageCircle className="size-4" aria-hidden />{" "}
              {t("Scrivici su WhatsApp", "Message us on WhatsApp")}
            </a>
            {b.cancellation.possible && (
              <div className="border-t border-border pt-3">
                {!confirming ? (
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={() => setConfirming(true)}
                  >
                    {t("Annulla la prenotazione", "Cancel booking")}
                  </Button>
                ) : (
                  <div className="space-y-3 rounded-lg border border-border p-3 text-sm">
                    {b.cancellation.free ? (
                      <p>
                        {t(
                          `Annullamento gratuito: ti rimborsiamo ${eur(b.cancellation.refundCents, lang)} sulla carta usata per pagare.`,
                          `Free cancellation: we refund ${eur(b.cancellation.refundCents, lang)} to the card you paid with.`,
                        )}
                      </p>
                    ) : (
                      <p>
                        {t(
                          `Mancano meno di ${b.cancellation.noticeHours ?? 48} ore al ritiro: tratteniamo una penale di ${eur(b.cancellation.penaltyCents, lang)} e ti rimborsiamo ${eur(b.cancellation.refundCents, lang)}.`,
                          `Less than ${b.cancellation.noticeHours ?? 48} hours before pick-up: we keep a ${eur(b.cancellation.penaltyCents, lang)} fee and refund ${eur(b.cancellation.refundCents, lang)}.`,
                        )}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        className="rounded-full"
                        onClick={() => setConfirming(false)}
                        disabled={busy}
                      >
                        {t("Indietro", "Back")}
                      </Button>
                      <Button
                        variant="destructive"
                        className="rounded-full"
                        disabled={busy}
                        onClick={async () => {
                          setBusy(true);
                          setError(null);
                          const r = await cancelFn({ data: { code, t: token, lang } });
                          setBusy(false);
                          setConfirming(false);
                          if (!r.ok) return setError(r.message);
                          setDone(
                            r.data.refundedCents > 0
                              ? t(
                                  `Rimborso di ${eur(r.data.refundedCents, lang)} in arrivo sulla carta (di solito 5–10 giorni lavorativi).`,
                                  `Refund of ${eur(r.data.refundedCents, lang)} on its way to your card (usually 5–10 business days).`,
                                )
                              : null,
                          );
                          refresh(r.data.booking);
                        }}
                      >
                        {busy ? <Loader2 className="size-4 animate-spin" /> : null}{" "}
                        {t("Conferma l'annullamento", "Confirm cancellation")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <p className="text-center text-sm text-muted-foreground">
          <Link to="/" className="underline">
            {t("Torna al sito", "Back to the website")}
          </Link>
        </p>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">{children}</section>;
}

const STATE_LABEL: Record<string, [string, string]> = {
  in_attesa_pagamento: ["In attesa di pagamento", "Awaiting payment"],
  confermata: ["Confermata", "Confirmed"],
  in_preparazione: ["Confermata", "Confirmed"],
  in_corso: ["In corso", "In progress"],
  restituita: ["Restituita", "Returned"],
  chiusa: ["Conclusa", "Completed"],
  annullata: ["Annullata", "Cancelled"],
  no_show: ["Non ritirata", "No-show"],
  richiesta: ["Richiesta", "Requested"],
};

function StateBadge({ state }: { state: string }) {
  const { lang } = useI18n();
  const l = STATE_LABEL[state] ?? [state, state];
  return (
    <Badge variant={state === "annullata" ? "secondary" : "default"} className="rounded-full">
      {lang === "en" ? l[1] : l[0]}
    </Badge>
  );
}

function Banner({
  tone,
  icon: Icon,
  spin,
  title,
  children,
}: {
  tone: "ok" | "warn" | "info" | "muted";
  icon: typeof CheckCircle2;
  spin?: boolean;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex gap-3 rounded-xl border p-4",
        tone === "ok" && "border-primary/30 bg-primary/5",
        tone === "warn" && "border-amber-300 bg-amber-50",
        tone === "info" && "border-border bg-muted",
        tone === "muted" && "border-border bg-muted",
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 size-5 shrink-0",
          tone === "ok" ? "text-primary" : "text-ink/70",
          spin && "animate-spin",
        )}
        aria-hidden
      />
      <div>
        <p className="font-semibold">{title}</p>
        {children ? <p className="text-sm text-muted-foreground">{children}</p> : null}
      </div>
    </div>
  );
}
