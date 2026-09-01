import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Download, FileText, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getMyLoyaltyStatus } from "@/lib/loyalty.functions";
import {
  getCustomerPortalData,
  updateCustomerConsents,
  type PortalData,
  type PortalInvoice,
  type PortalReservation,
} from "@/lib/customer-portal.functions";
import type { Invoice, Reservation } from "@/lib/gestionale";
import { reservationStatusLabels, invoiceStatusLabels } from "@/lib/gestionale";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";
import { VerbaliDownload } from "@/components/verbali-download";
import { ReceiptsDownload } from "@/components/receipts-download";

export const Route = createFileRoute("/_cliente/area-clienti/")({
  head: () => ({
    meta: [
      { title: "I tuoi noleggi — Area clienti We Rent" },
      {
        name: "description",
        content:
          "Area clienti We Rent: storico dei tuoi noleggi, fatture scaricabili in PDF e gestione dei consensi privacy.",
      },
      { property: "og:title", content: "I tuoi noleggi — Area clienti We Rent" },
      {
        property: "og:description",
        content: "Storico noleggi, fatture e consensi privacy nella tua area clienti We Rent.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CustomerPortalPage,
});

const euro = (v: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v);
const day = (v: string) => new Date(v).toLocaleDateString("it-IT");

function CustomerPortalPage() {
  const fetchPortal = useServerFn(getCustomerPortalData);
  const fetchLoyalty = useServerFn(getMyLoyaltyStatus);
  const loyalty = useQuery({
    queryKey: ["area-clienti", "loyalty"],
    queryFn: () => fetchLoyalty({ data: undefined }),
  });
  const { data, isLoading } = useQuery<PortalData>({
    queryKey: ["area-clienti", "portal"],
    queryFn: () => fetchPortal({ data: undefined }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Caricamento dei tuoi dati…
      </div>
    );
  }

  if (!data?.customer) {
    return (
      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldAlert className="size-5 text-primary" /> Nessuna anagrafica collegata
          </CardTitle>
          <CardDescription>
            Non troviamo noleggi associati a questo indirizzo email. Se hai prenotato con un altro
            indirizzo, esci e accedi con quello; oppure contatta il nostro staff.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { customer, reservations, invoices } = data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          Ciao {customer.full_name || "cliente"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{customer.email}</p>
      </div>

      {loyalty.data ? (
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="text-lg">
              Programma fedeltà · livello {loyalty.data.tierName ?? "base"}
            </CardTitle>
            <CardDescription>
              {loyalty.data.discountPct > 0
                ? `Hai diritto a uno sconto del ${loyalty.data.discountPct}% applicato automaticamente alle nuove prenotazioni.`
                : "Nessuno sconto attivo al momento."}{" "}
              Noleggi conclusi negli ultimi 12 mesi: {loyalty.data.rentals}.
              {loyalty.data.nextTierName
                ? ` Ti mancano ${loyalty.data.rentalsToNext} noleggi per il livello ${loyalty.data.nextTierName}.`
                : " Hai raggiunto il livello più alto."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Tabs defaultValue="noleggi">
        <TabsList className="rounded-full">
          <TabsTrigger value="noleggi" className="rounded-full">
            Storico noleggi
          </TabsTrigger>
          <TabsTrigger value="fatture" className="rounded-full">
            Fatture
          </TabsTrigger>
          <TabsTrigger value="consensi" className="rounded-full">
            Consensi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="noleggi" className="mt-6">
          <ReservationsList reservations={reservations} />
        </TabsContent>

        <TabsContent value="fatture" className="mt-6">
          <InvoicesList invoices={invoices} reservations={reservations} />
        </TabsContent>

        <TabsContent value="consensi" className="mt-6">
          <ConsentsCard customer={customer} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReservationsList({ reservations }: { reservations: PortalReservation[] }) {
  if (reservations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Non hai ancora noleggi registrati con questo indirizzo.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {reservations.map((r) => (
        <Card key={r.id} className="rounded-2xl">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div>
              <p className="font-semibold">{r.vehicle_model ?? "Veicolo da assegnare"}</p>
              <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="size-4" />
                {day(r.date_from)} → {day(r.date_to)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Prenotazione {r.code}</p>
              {r.contract_accepted_at && r.contract_version ? (
                <Badge variant="outline" className="mt-2">
                  Condizioni accettate il {day(r.contract_accepted_at)} (v. {r.contract_version})
                </Badge>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <VerbaliDownload
                reservationId={r.id}
                hasConsegna={Boolean(r.verbale_consegna_url)}
                hasRientro={Boolean(r.verbale_rientro_url)}
              />
              <ReceiptsDownload reservationId={r.id} />
              <Badge variant="secondary" className="rounded-full">
                {reservationStatusLabels[r.status] ?? r.status}
              </Badge>
              <span className="font-bold">{euro(r.total_amount)}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function InvoicesList({
  invoices,
  reservations,
}: {
  invoices: PortalInvoice[];
  reservations: PortalReservation[];
}) {
  if (invoices.length === 0) {
    return <p className="text-sm text-muted-foreground">Nessuna fattura disponibile.</p>;
  }
  return (
    <div className="space-y-3">
      {invoices.map((inv) => {
        const res = reservations.find((r) => r.id === inv.reservation_id);
        return (
          <Card key={inv.id} className="rounded-2xl">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <p className="flex items-center gap-2 font-semibold">
                  <FileText className="size-4 text-primary" /> Fattura {inv.numero_fattura}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {day(inv.data_emissione)} · {euro(Number(inv.totale))}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="rounded-full">
                  {invoiceStatusLabels[inv.stato] ?? inv.stato}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() =>
                    // Stessa generazione PDF usata dal gestionale: documento identico.
                    downloadInvoicePdf(
                      inv as unknown as Invoice,
                      res ? ({ ...res } as unknown as Reservation) : undefined,
                    )
                  }
                >
                  <Download className="mr-2 size-4" /> PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ConsentsCard({ customer }: { customer: NonNullable<PortalData["customer"]> }) {
  const queryClient = useQueryClient();
  const save = useServerFn(updateCustomerConsents);
  const mutation = useMutation({
    mutationFn: (input: { consenso_marketing: boolean; consenso_profilazione: boolean }) =>
      save({ data: input }),
    onSuccess: () => {
      toast.success("Preferenze aggiornate");
      void queryClient.invalidateQueries({ queryKey: ["area-clienti", "portal"] });
    },
    onError: (error: unknown) =>
      toast.error("Aggiornamento non riuscito", {
        description: error instanceof Error ? error.message : "Riprova più tardi.",
      }),
  });

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Consensi revocabili</CardTitle>
          <CardDescription>
            Puoi modificarli liberamente in qualsiasi momento: l&apos;aggiornamento è immediato.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="font-semibold">Comunicazioni commerciali</p>
              <p className="text-sm text-muted-foreground">
                Offerte, promozioni e novità sulla flotta via email.
              </p>
            </div>
            <Switch
              checked={customer.consenso_marketing}
              disabled={mutation.isPending}
              onCheckedChange={(v) =>
                mutation.mutate({
                  consenso_marketing: v,
                  consenso_profilazione: customer.consenso_profilazione,
                })
              }
            />
          </div>
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="font-semibold">Profilazione</p>
              <p className="text-sm text-muted-foreground">
                Proposte personalizzate in base ai tuoi noleggi precedenti.
              </p>
            </div>
            <Switch
              checked={customer.consenso_profilazione}
              disabled={mutation.isPending}
              onCheckedChange={(v) =>
                mutation.mutate({
                  consenso_marketing: customer.consenso_marketing,
                  consenso_profilazione: v,
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-dashed">
        <CardHeader>
          <CardTitle className="text-lg">Consenso privacy (contrattuale)</CardTitle>
          <CardDescription>
            {customer.consenso_privacy_at
              ? `Accettato il ${day(customer.consenso_privacy_at)}.`
              : "Accettato al momento della prenotazione."}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Il trattamento dei dati necessario alla gestione del contratto di noleggio non è revocabile
          da questa pagina: senza di esso non possiamo erogare il servizio né conservare i documenti
          fiscali obbligatori. Se desideri revocarlo, contatta il nostro staff: valuteremo la
          richiesta nei limiti previsti dalla legge.
        </CardContent>
      </Card>
    </div>
  );
}
