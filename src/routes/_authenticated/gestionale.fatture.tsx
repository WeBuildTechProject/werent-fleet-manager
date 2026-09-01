import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";

import { AdminShell } from "@/components/gestionale/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatEuro,
  invoiceStatusLabels,
  invoicesQuery,
  paymentsQuery,
  reservationsQuery,
} from "@/lib/gestionale";
import { createInvoice, updateInvoiceStatus } from "@/lib/invoices.functions";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";
import { buildAccountingCsv, downloadAccountingCsv } from "@/lib/accounting-export";

export const Route = createFileRoute("/_authenticated/gestionale/fatture")({
  component: InvoicesPage,
});

function InvoicesPage() {
  const queryClient = useQueryClient();
  const invoices = useQuery(invoicesQuery);
  const reservations = useQuery(reservationsQuery);
  const payments = useQuery(paymentsQuery);

  const [stato, setStato] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [piva, setPiva] = useState<Record<string, string>>({});

  const reservationById = useMemo(
    () => new Map((reservations.data ?? []).map((r) => [r.id, r])),
    [reservations.data],
  );

  const rows = useMemo(
    () =>
      (invoices.data ?? []).filter((i) => {
        if (stato !== "all" && i.stato !== stato) return false;
        if (from && i.data_emissione < from) return false;
        if (to && i.data_emissione > to) return false;
        return true;
      }),
    [invoices.data, stato, from, to],
  );

  const invoicedReservationIds = new Set((invoices.data ?? []).map((i) => i.reservation_id));

  /** Fatturabili: prenotazione chiusa, oppure confermata/in corso con un pagamento riuscito. */
  const billable = useMemo(() => {
    const paidIds = new Set(
      (payments.data ?? []).filter((p) => p.status === "succeeded").map((p) => p.reservation_id),
    );
    return (reservations.data ?? []).filter(
      (r) =>
        !invoicedReservationIds.has(r.id) &&
        (r.status === "chiusa" || (["confermata", "in_corso"].includes(r.status) && paidIds.has(r.id))),
    );
  }, [reservations.data, payments.data, invoices.data]);

  const runCreate = useServerFn(createInvoice);
  const runStatus = useServerFn(updateInvoiceStatus);

  const emit = useMutation({
    mutationFn: async (reservationId: string) => {
      const reservation = reservationById.get(reservationId);
      return runCreate({
        data: {
          reservationId,
          cliente_denominazione: reservation?.customer_name ?? "",
          cliente_piva_cf: piva[reservationId] ?? "",
        },
      });
    },
    onSuccess: async (res) => {
      toast.success(`Fattura ${res.numero_fattura} emessa`);
      await queryClient.invalidateQueries({ queryKey: ["gestionale", "invoices"] });
    },
    onError: (e: Error) => toast.error("Emissione non riuscita", { description: e.message }),
  });

  const changeStatus = useMutation({
    mutationFn: (input: { invoiceId: string; stato: "bozza" | "emessa" | "pagata" | "annullata" }) =>
      runStatus({ data: input }),
    onSuccess: async () => {
      toast.success("Stato aggiornato");
      await queryClient.invalidateQueries({ queryKey: ["gestionale", "invoices"] });
    },
    onError: (e: Error) => toast.error("Aggiornamento non riuscito", { description: e.message }),
  });

  const totals = rows.reduce(
    (acc, i) => ({
      imponibile: acc.imponibile + Number(i.imponibile),
      iva: acc.iva + Number(i.iva),
      totale: acc.totale + Number(i.totale),
    }),
    { imponibile: 0, iva: 0, totale: 0 },
  );

  return (
    <AdminShell
      section="fatture"
      title="Documenti fiscali"
      subtitle="Fatture e ricevute con numerazione progressiva annuale, pronte per la fatturazione elettronica."
    >
      <Card className="mb-6 p-5">
        <h2 className="flex items-center gap-2 font-display text-lg">
          <Receipt className="size-4" aria-hidden /> Prenotazioni da fatturare
        </h2>
        {billable.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Nessuna prenotazione chiusa o pagata in attesa di documento.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {billable.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div>
                  <p className="font-semibold">
                    {r.customer_name}{" "}
                    <span className="font-mono text-xs text-muted-foreground">{r.code}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.date_from} → {r.date_to} · {formatEuro(Number(r.total_amount))}
                  </p>
                </div>
                <div className="flex items-end gap-2">
                  <div className="space-y-1">
                    <Label htmlFor={`piva-${r.id}`} className="text-xs">
                      P. IVA / C.F. (opzionale)
                    </Label>
                    <Input
                      id={`piva-${r.id}`}
                      className="h-9 w-44"
                      value={piva[r.id] ?? ""}
                      onChange={(e) => setPiva((s) => ({ ...s, [r.id]: e.target.value }))}
                    />
                  </div>
                  <Button
                    size="sm"
                    disabled={emit.isPending}
                    onClick={() => emit.mutate(r.id)}
                  >
                    {emit.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <FileText className="size-4" />
                    )}
                    Emetti fattura
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Stato</Label>
          <Select value={stato} onValueChange={setStato}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli stati</SelectItem>
              {Object.entries(invoiceStatusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="from" className="text-xs">
            Dal
          </Label>
          <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="to" className="text-xs">
            Al
          </Label>
          <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button
          size="sm"
          variant="outline"
          className="rounded-full"
          disabled={rows.length === 0}
          onClick={() => {
            const csv = buildAccountingCsv(rows, reservationById);
            const period = [from || "inizio", to || "oggi"].join("_");
            downloadAccountingCsv(csv, `werent-fatture-${period}.csv`);
            toast.success(`Export contabile generato (${rows.length} documenti)`);
          }}
        >
          <FileSpreadsheet className="size-4" /> Esporta per commercialista
        </Button>
        <p className="ml-auto text-sm text-muted-foreground">
          {rows.length} documenti · imponibile {formatEuro(totals.imponibile)} · IVA{" "}
          {formatEuro(totals.iva)} · totale {formatEuro(totals.totale)}
        </p>
      </div>

      <Card className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numero</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Prenotazione</TableHead>
              <TableHead className="text-right">Imponibile</TableHead>
              <TableHead className="text-right">IVA</TableHead>
              <TableHead className="text-right">Totale</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((invoice) => {
              const reservation = reservationById.get(invoice.reservation_id);
              return (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono text-xs">{invoice.numero_fattura}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(invoice.data_emissione).toLocaleDateString("it-IT")}
                  </TableCell>
                  <TableCell className="text-sm font-semibold">
                    {invoice.cliente_denominazione || reservation?.customer_name || "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{reservation?.code ?? "—"}</TableCell>
                  <TableCell className="text-right text-sm">
                    {formatEuro(Number(invoice.imponibile))}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {formatEuro(Number(invoice.iva))}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatEuro(Number(invoice.totale))}
                  </TableCell>
                  <TableCell>
                    <Badge variant={invoice.stato === "annullata" ? "destructive" : "secondary"}>
                      {invoiceStatusLabels[invoice.stato] ?? invoice.stato}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadInvoicePdf(invoice, reservation)}
                    >
                      <Download className="size-4" /> PDF
                    </Button>
                    {invoice.stato !== "pagata" && invoice.stato !== "annullata" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-1"
                        disabled={changeStatus.isPending}
                        onClick={() =>
                          changeStatus.mutate({ invoiceId: invoice.id, stato: "pagata" })
                        }
                      >
                        Segna pagata
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </AdminShell>
  );
}
