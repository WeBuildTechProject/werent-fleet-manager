import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatDate,
  formatEuro,
  invoicesQuery,
  reservationsQuery,
  type Reservation,
} from "@/lib/gestionale";
import { invoiceIndex, reservationRevenue } from "@/lib/analytics";
import {
  lineCounts,
  maintenanceLinesQuery,
  maintenanceRecordsQuery,
  maintenanceRequestsQuery,
} from "@/lib/maintenance";

const iso = (d: Date) => d.toISOString().slice(0, 10);

function monthStart() {
  const d = new Date();
  return iso(new Date(d.getFullYear(), d.getMonth(), 1));
}

function yearStart() {
  return iso(new Date(new Date().getFullYear(), 0, 1));
}

/**
 * Centro di costo per veicolo: report derivato dai dati esistenti (fatture,
 * prenotazioni, righe di preventivo officina). Nessuna contabilità generale.
 */
export function VehicleProfitability({ vehicleId }: { vehicleId: string }) {
  const reservations = useQuery(reservationsQuery);
  const invoices = useQuery(invoicesQuery);
  const requests = useQuery(maintenanceRequestsQuery);
  const records = useQuery(maintenanceRecordsQuery);
  const lines = useQuery(maintenanceLinesQuery);

  const [from, setFrom] = useState(yearStart);
  const [to, setTo] = useState(() => iso(new Date()));

  const data = useMemo(() => {
    const inRange = (day: string) => day >= from && day <= to;

    const vehicleReservations = (reservations.data ?? []).filter(
      (r) => r.vehicle_id === vehicleId && r.status !== "annullata" && inRange(r.date_from),
    );

    // Stessa formula usata dalla sezione Analytics: unica fonte di verità.
    const invoiceMap = invoiceIndex(invoices.data);
    const revenueOf = (r: Reservation) => reservationRevenue(r, invoiceMap);

    const noleggio = vehicleReservations.reduce((s, r) => s + Number(r.total_amount), 0);
    const addebiti = vehicleReservations.reduce(
      (s, r) =>
        s +
        Number(r.extra_km_amount) +
        Number(r.fuel_penalty_amount) +
        Number(r.damage_charge_amount),
      0,
    );
    const ricavi = vehicleReservations.reduce((s, r) => s + revenueOf(r), 0);

    const vehicleRequestIds = (requests.data ?? [])
      .filter((r) => r.vehicle_id === vehicleId)
      .map((r) => r.id);
    const recordIds = (records.data ?? [])
      .filter((r) => vehicleRequestIds.includes(r.request_id))
      .map((r) => r.id);
    const costLines = (lines.data ?? []).filter(
      (l) =>
        recordIds.includes(l.record_id) &&
        lineCounts(l) &&
        inRange((l.data_completamento ?? l.created_at).slice(0, 10)),
    );
    const costi = costLines.reduce((s, l) => s + Number(l.importo), 0);

    return {
      contratti: vehicleReservations,
      noleggio,
      addebiti,
      ricavi,
      costi,
      costLines,
      margine: ricavi - costi,
    };
  }, [from, to, vehicleId, reservations.data, invoices.data, requests.data, records.data, lines.data]);

  return (
    <div className="space-y-4">
      <Card className="shadow-card">
        <CardHeader className="flex-row flex-wrap items-end justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="size-4 text-primary" aria-hidden /> Redditività veicolo
          </CardTitle>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="prof-from" className="text-xs">
                Da
              </Label>
              <Input
                id="prof-from"
                type="date"
                className="h-9 w-36"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="prof-to" className="text-xs">
                A
              </Label>
              <Input
                id="prof-to"
                type="date"
                className="h-9 w-36"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => {
                setFrom(monthStart());
                setTo(iso(new Date()));
              }}
            >
              Mese corrente
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => {
                setFrom(yearStart());
                setTo(iso(new Date()));
              }}
            >
              Anno corrente
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Ricavi</p>
            <p className="mt-1 text-2xl font-semibold">{formatEuro(data.ricavi)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Noleggi {formatEuro(data.noleggio)} · addebiti {formatEuro(data.addebiti)}
            </p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Costi manutenzione
            </p>
            <p className="mt-1 text-2xl font-semibold">{formatEuro(data.costi)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.costLines.length} righe approvate
            </p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Margine</p>
            <p
              className={
                data.margine >= 0
                  ? "mt-1 text-2xl font-semibold text-primary"
                  : "mt-1 text-2xl font-semibold text-destructive"
              }
            >
              {formatEuro(data.margine)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.contratti.length} contratti nel periodo
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Contratti del periodo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.contratti.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun contratto nel periodo.</p>
            ) : null}
            {data.contratti.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span>
                  <span className="font-semibold">{r.code}</span>{" "}
                  <span className="text-xs text-muted-foreground">
                    {formatDate(r.date_from)} → {formatDate(r.date_to)}
                  </span>
                </span>
                <span className="font-medium">
                  {formatEuro(
                    Number(r.total_amount) +
                      Number(r.extra_km_amount) +
                      Number(r.fuel_penalty_amount) +
                      Number(r.damage_charge_amount),
                  )}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Costi officina del periodo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.costLines.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun costo registrato.</p>
            ) : null}
            {data.costLines.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span>{l.descrizione_lavoro}</span>
                <span className="font-medium">{formatEuro(Number(l.importo))}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
