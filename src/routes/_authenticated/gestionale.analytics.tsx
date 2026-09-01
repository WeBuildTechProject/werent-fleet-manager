import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download } from "lucide-react";

import { AdminShell } from "@/components/gestionale/admin-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  branchesQuery,
  formatEuro,
  invoicesQuery,
  reservationsQuery,
  vehicleCategoriesQuery,
  vehiclesQuery,
} from "@/lib/gestionale";
import { maintenanceRequestsQuery } from "@/lib/maintenance";
import {
  downloadCsv,
  extraChargesCsv,
  extraChargesTrend,
  filterReservations,
  invoiceIndex,
  occupancyByBranch,
  occupancyCsv,
  periodPreset,
  revenueTrend,
  revenueTrendCsv,
  topCustomers,
  topCustomersCsv,
  utilizationBy,
  utilizationCsv,
  type AnalyticsFilters,
} from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/gestionale/analytics")({
  component: AnalyticsPage,
});

const chartColors = {
  noleggio: "oklch(0.55 0.09 155)",
  accessori: "oklch(0.72 0.09 155)",
  assicurazioni: "oklch(0.62 0.10 240)",
  addebiti: "oklch(0.65 0.15 45)",
};

function ExportButton({ onClick, label = "Esporta CSV" }: { onClick: () => void; label?: string }) {
  return (
    <Button size="sm" variant="outline" className="rounded-full" onClick={onClick}>
      <Download className="size-4" aria-hidden /> {label}
    </Button>
  );
}

function AnalyticsPage() {
  const vehicles = useQuery(vehiclesQuery);
  const reservations = useQuery(reservationsQuery);
  const invoices = useQuery(invoicesQuery);
  const branches = useQuery(branchesQuery);
  const categories = useQuery(vehicleCategoriesQuery);
  const requests = useQuery(maintenanceRequestsQuery);

  const initial = periodPreset("mese");
  const [filters, setFilters] = useState<AnalyticsFilters>({
    ...initial,
    branchId: "all",
    categoryId: "all",
  });
  const set = (patch: Partial<AnalyticsFilters>) => setFilters((f) => ({ ...f, ...patch }));

  const data = useMemo(() => {
    const fleet = vehicles.data ?? [];
    const all = reservations.data ?? [];
    const branchList = branches.data ?? [];
    const catList = categories.data ?? [];
    const maint = requests.data ?? [];
    const scoped = filterReservations(all, fleet, filters);
    const invoiceMap = invoiceIndex(invoices.data);

    return {
      perCategoria: utilizationBy("categoria", fleet, all, maint, catList, branchList, filters),
      perSede: utilizationBy("sede", fleet, all, maint, catList, branchList, filters),
      trend: revenueTrend(scoped, invoiceMap),
      clienti: topCustomers(scoped, invoiceMap, 15),
      addebiti: extraChargesTrend(scoped),
      occupazione: occupancyByBranch(fleet, all, maint, branchList, filters),
      contratti: scoped.length,
    };
  }, [vehicles.data, reservations.data, invoices.data, branches.data, categories.data, requests.data, filters]);

  const totals = data.trend.reduce(
    (acc, r) => ({
      noleggio: acc.noleggio + r.noleggio,
      accessori: acc.accessori + r.accessori,
      assicurazioni: acc.assicurazioni + r.assicurazioni,
      addebiti: acc.addebiti + r.addebiti,
      totale: acc.totale + r.totale,
    }),
    { noleggio: 0, accessori: 0, assicurazioni: 0, addebiti: 0, totale: 0 },
  );

  const suffix = `${filters.from}_${filters.to}`;

  return (
    <AdminShell
      section="analytics"
      title="Analytics"
      subtitle="Utilizzo flotta, ricavi e occupazione calcolati sui dati operativi"
    >
      <div className="space-y-4">
        <Card className="shadow-card">
          <CardHeader className="flex-row flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle className="text-base">Periodo e filtri</CardTitle>
              <CardDescription>
                {data.contratti} contratti nel periodo · ricavi {formatEuro(totals.totale)}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="an-from" className="text-xs">
                  Da
                </Label>
                <Input
                  id="an-from"
                  type="date"
                  className="h-9 w-36"
                  value={filters.from}
                  onChange={(e) => set({ from: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="an-to" className="text-xs">
                  A
                </Label>
                <Input
                  id="an-to"
                  type="date"
                  className="h-9 w-36"
                  value={filters.to}
                  onChange={(e) => set({ to: e.target.value })}
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={() => set(periodPreset("mese"))}
              >
                Mese corrente
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={() => set(periodPreset("trimestre"))}
              >
                Trimestre
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={() => set(periodPreset("anno"))}
              >
                Anno corrente
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs">Sede</Label>
              <Select value={filters.branchId} onValueChange={(v) => set({ branchId: v })}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le sedi</SelectItem>
                  {(branches.data ?? []).map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                      {b.active ? "" : " (storica)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Categoria veicolo</Label>
              <Select value={filters.categoryId} onValueChange={(v) => set({ categoryId: v })}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le categorie</SelectItem>
                  {(categories.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} · {c.label_it}
                      {c.active ? "" : " (storica)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Ricavi noleggio</p>
              <p className="mt-1 text-xl font-semibold">{formatEuro(totals.noleggio)}</p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Assicurazioni + addebiti
              </p>
              <p className="mt-1 text-xl font-semibold">
                {formatEuro(totals.assicurazioni + totals.addebiti)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="utilizzo">
          <TabsList className="flex-wrap">
            <TabsTrigger value="utilizzo">Utilizzo flotta</TabsTrigger>
            <TabsTrigger value="ricavi">Trend ricavi</TabsTrigger>
            <TabsTrigger value="clienti">Clienti top</TabsTrigger>
            <TabsTrigger value="addebiti">Addebiti extra</TabsTrigger>
            <TabsTrigger value="occupazione">Occupazione per sede</TabsTrigger>
          </TabsList>

          {/* 1. Utilizzo flotta ------------------------------------------------ */}
          <TabsContent value="utilizzo" className="mt-4 grid gap-4 lg:grid-cols-2">
            {(
              [
                ["Per categoria", data.perCategoria, "categoria"],
                ["Per sede", data.perSede, "sede"],
              ] as const
            ).map(([title, rows, grouping]) => (
              <Card key={grouping} className="shadow-card">
                <CardHeader className="flex-row items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{title}</CardTitle>
                    <CardDescription>
                      Giorni-veicolo noleggiati sul totale disponibile (fermi tecnici esclusi)
                    </CardDescription>
                  </div>
                  <ExportButton
                    onClick={() =>
                      downloadCsv(
                        utilizationCsv(rows, grouping),
                        `utilizzo-${grouping}-${suffix}.csv`,
                      )
                    }
                  />
                </CardHeader>
                <CardContent>
                  {rows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nessun veicolo nel filtro attuale.</p>
                  ) : (
                    <>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={rows}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="label" fontSize={11} />
                            <YAxis fontSize={11} unit="%" />
                            <Tooltip formatter={(v: number) => `${v}%`} />
                            <Bar
                              dataKey="utilization"
                              name="Utilizzo"
                              fill={chartColors.noleggio}
                              radius={[6, 6, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-3 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                            <tr>
                              <th className="py-2 text-left">{grouping === "categoria" ? "Categoria" : "Sede"}</th>
                              <th className="py-2 text-right">Noleggiati</th>
                              <th className="py-2 text-right">Disponibili</th>
                              <th className="py-2 text-right">Fermo</th>
                              <th className="py-2 text-right">Utilizzo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((r) => (
                              <tr key={r.key} className="border-t border-border">
                                <td className="py-2">{r.label}</td>
                                <td className="py-2 text-right">{r.rented}</td>
                                <td className="py-2 text-right">{r.available}</td>
                                <td className="py-2 text-right">{r.maintenance}</td>
                                <td className="py-2 text-right font-semibold">{r.utilization}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* 2. Trend ricavi -------------------------------------------------- */}
          <TabsContent value="ricavi" className="mt-4">
            <Card className="shadow-card">
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Trend ricavi mensile</CardTitle>
                  <CardDescription>
                    Noleggio, accessori, assicurazioni e addebiti di rientro. Dove esiste una
                    fattura è il suo totale a fare fede.
                  </CardDescription>
                </div>
                <ExportButton
                  onClick={() => downloadCsv(revenueTrendCsv(data.trend), `ricavi-${suffix}.csv`)}
                />
              </CardHeader>
              <CardContent>
                {data.trend.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nessun contratto nel periodo.</p>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.trend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" fontSize={11} />
                        <YAxis fontSize={11} />
                        <Tooltip formatter={(v: number) => formatEuro(v)} />
                        <Legend />
                        <Bar dataKey="noleggio" name="Noleggio" stackId="r" fill={chartColors.noleggio} />
                        <Bar dataKey="accessori" name="Accessori" stackId="r" fill={chartColors.accessori} />
                        <Bar
                          dataKey="assicurazioni"
                          name="Assicurazioni"
                          stackId="r"
                          fill={chartColors.assicurazioni}
                        />
                        <Bar
                          dataKey="addebiti"
                          name="Addebiti rientro"
                          stackId="r"
                          fill={chartColors.addebiti}
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 3. Clienti top --------------------------------------------------- */}
          <TabsContent value="clienti" className="mt-4">
            <Card className="shadow-card">
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Clienti top</CardTitle>
                  <CardDescription>Classifica per fatturato e numero di noleggi nel periodo</CardDescription>
                </div>
                <ExportButton
                  onClick={() => downloadCsv(topCustomersCsv(data.clienti), `clienti-top-${suffix}.csv`)}
                />
              </CardHeader>
              <CardContent>
                {data.clienti.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nessun cliente nel periodo.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="py-2 text-left">#</th>
                          <th className="py-2 text-left">Cliente</th>
                          <th className="py-2 text-left">Email</th>
                          <th className="py-2 text-right">Noleggi</th>
                          <th className="py-2 text-right">Fatturato</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.clienti.map((c, i) => (
                          <tr key={c.key} className="border-t border-border">
                            <td className="py-2 text-muted-foreground">{i + 1}</td>
                            <td className="py-2 font-medium">{c.name}</td>
                            <td className="py-2 text-muted-foreground">{c.email}</td>
                            <td className="py-2 text-right">{c.noleggi}</td>
                            <td className="py-2 text-right font-semibold">{formatEuro(c.fatturato)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 4. Andamento addebiti extra -------------------------------------- */}
          <TabsContent value="addebiti" className="mt-4">
            <Card className="shadow-card">
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Andamento addebiti extra</CardTitle>
                  <CardDescription>
                    Quota di rientri con km extra, carburante mancante o danni: utile per
                    ricalibrare i km inclusi.
                  </CardDescription>
                </div>
                <ExportButton
                  onClick={() => downloadCsv(extraChargesCsv(data.addebiti), `addebiti-${suffix}.csv`)}
                />
              </CardHeader>
              <CardContent>
                {data.addebiti.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nessun rientro registrato nel periodo.
                  </p>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.addebiti}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" fontSize={11} />
                        <YAxis fontSize={11} unit="%" />
                        <Tooltip formatter={(v: number) => `${v}%`} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="quotaKmExtra"
                          name="Km extra"
                          stroke={chartColors.noleggio}
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="quotaCarburante"
                          name="Carburante"
                          stroke={chartColors.addebiti}
                          strokeWidth={2}
                        />
                        <Line
                          type="monotone"
                          dataKey="quotaDanni"
                          name="Danni"
                          stroke={chartColors.assicurazioni}
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 5. Occupazione per sede ------------------------------------------ */}
          <TabsContent value="occupazione" className="mt-4">
            <Card className="shadow-card">
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Occupazione per sede</CardTitle>
                  <CardDescription>
                    Heatmap giorno × sede: percentuale di veicoli noleggiati sui disponibili
                  </CardDescription>
                </div>
                <ExportButton
                  onClick={() =>
                    downloadCsv(occupancyCsv(data.occupazione), `occupazione-${suffix}.csv`)
                  }
                />
              </CardHeader>
              <CardContent>
                {data.occupazione.rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nessun veicolo nel filtro attuale.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="text-xs">
                      <thead>
                        <tr>
                          <th className="sticky left-0 bg-card px-2 py-1 text-left">Sede</th>
                          {data.occupazione.days.map((d) => (
                            <th key={d} className="px-1 py-1 font-medium text-muted-foreground">
                              {d.slice(8)}
                            </th>
                          ))}
                          <th className="px-2 py-1 text-right">Media</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.occupazione.rows.map((row) => (
                          <tr key={row.branchId}>
                            <td className="sticky left-0 whitespace-nowrap bg-card px-2 py-1 font-medium">
                              {row.branchName}
                              <span className="ml-1 text-muted-foreground">({row.fleet})</span>
                            </td>
                            {row.cells.map((c) => (
                              <td key={c.day} className="p-[2px]">
                                <div
                                  title={`${row.branchName} · ${c.day} · ${c.rented}/${c.available} (${c.occupancy}%)`}
                                  className="h-6 w-6 rounded-[4px] border border-border/60"
                                  style={{
                                    backgroundColor:
                                      c.available === 0
                                        ? "transparent"
                                        : `color-mix(in oklab, ${chartColors.noleggio} ${Math.max(
                                            6,
                                            c.occupancy,
                                          )}%, transparent)`,
                                  }}
                                />
                              </td>
                            ))}
                            <td className="px-2 py-1 text-right font-semibold">{row.average}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminShell>
  );
}
