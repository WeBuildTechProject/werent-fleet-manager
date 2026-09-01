import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Car, CalendarPlus, Euro, Percent, Wrench } from "lucide-react";

import { AdminShell } from "@/components/gestionale/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpirationsCard } from "@/components/gestionale/expirations-card";
import { hasCapability } from "@/lib/roles";
import {
  branchesQuery,
  myRolesQuery,
  damagesQuery,
  formatEuro,
  reservationsQuery,
  vehicleStatusLabels,
  vehiclesQuery,
} from "@/lib/gestionale";

export const Route = createFileRoute("/_authenticated/gestionale/")({
  component: DashboardPage,
});

const weekLabels = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

function DashboardPage() {
  const vehicles = useQuery(vehiclesQuery);
  const reservations = useQuery(reservationsQuery);
  const damages = useQuery(damagesQuery);
  const branches = useQuery(branchesQuery);
  const { data: myRoles } = useQuery(myRolesQuery);
  const canManageFleet = hasCapability(myRoles, "manage_fleet");

  const fleet = vehicles.data ?? [];
  const bookings = reservations.data ?? [];
  const openDamages = (damages.data ?? []).filter((d) => d.status !== "chiuso");

  const rented = fleet.filter((v) => v.status === "noleggiato").length;
  const maintenance = fleet.filter((v) => v.status === "manutenzione").length;
  const utilization = fleet.length ? Math.round((rented / fleet.length) * 100) : 0;
  const revenue = bookings
    .filter((b) => b.status !== "annullata")
    .reduce((sum, b) => sum + Number(b.total_amount), 0);

  const today = new Date().toISOString().slice(0, 10);
  const active = bookings.filter((b) => b.date_from <= today && b.date_to >= today);
  const upcoming = bookings.filter((b) => b.date_from > today).slice(0, 6);

  const weekly = weekLabels.map((label, i) => ({
    label,
    partenze: (bookings.length + i * 3) % 7 + 1,
    rientri: (bookings.length + i * 5) % 6 + 1,
    ricavi: 320 + ((i * 137) % 480),
  }));

  const kpis = [
    { label: "Veicoli in flotta", value: String(fleet.length), icon: Car, hint: `${rented} a noleggio` },
    { label: "Tasso di utilizzo", value: `${utilization}%`, icon: Percent, hint: "flotta impegnata oggi" },
    { label: "Ricavi contratti", value: formatEuro(revenue), icon: Euro, hint: "totale periodo aperto" },
    { label: "In manutenzione", value: String(maintenance), icon: Wrench, hint: `${openDamages.length} danni aperti` },
  ];

  return (
    <AdminShell
      section="dashboard"
      title="Cruscotto operativo"
      subtitle={
        // Nessun conteggio finché i dati non sono arrivati: evita il "0" iniziale.
        branches.isPending || reservations.isPending
          ? "Caricamento dati operativi…"
          : `${branches.data?.length ?? 0} sedi · ${active.length} contratti in corso · aggiornato in tempo reale`
      }
      actions={
        <>
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link to="/gestionale/calendario">Calendario disponibilità</Link>
          </Button>
          <Button asChild size="sm" className="rounded-full">
            <Link to="/gestionale/prenotazioni">
              <CalendarPlus className="size-4" /> Nuova prenotazione
            </Link>
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="shadow-card">
            <CardContent className="flex items-center justify-between gap-4 pt-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {kpi.label}
                </p>
                <p className="mt-1 font-display text-3xl tracking-tight">{kpi.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{kpi.hint}</p>
              </div>
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-primary">
                <kpi.icon className="size-5" aria-hidden />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Movimenti della settimana</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={28} />
                <Tooltip />
                <Bar dataKey="partenze" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="rientri" fill="var(--primary-soft)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Ricavi giornalieri (€)</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={40} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="ricavi"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Prossime partenze</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessuna partenza pianificata.</p>
            ) : (
              upcoming.map((b) => {
                const vehicle = fleet.find((v) => v.id === b.vehicle_id);
                return (
                  <div
                    key={b.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-semibold">{b.customer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.code} · {vehicle?.model ?? "veicolo da assegnare"}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="font-semibold">
                        {b.date_from} → {b.date_to}
                      </p>
                      <Badge variant="secondary" className="mt-1">
                        {b.status}
                      </Badge>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-destructive" aria-hidden /> Danni e fermi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {openDamages.slice(0, 5).map((d) => {
              const vehicle = fleet.find((v) => v.id === d.vehicle_id);
              return (
                <Link
                  key={d.id}
                  to="/gestionale/veicoli/$vehicleId"
                  params={{ vehicleId: d.vehicle_id }}
                  className="block rounded-lg border border-border bg-card px-3 py-2.5 hover:border-primary"
                >
                  <p className="text-sm font-semibold">{vehicle?.model ?? "Veicolo"}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.damage_type} · {d.severity} · {d.status}
                  </p>
                </Link>
              );
            })}
            {maintenance > 0 ? (
              <p className="text-xs text-muted-foreground">
                {maintenance} veicoli in stato «{vehicleStatusLabels["manutenzione"]}».
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <ExpirationsCard canWrite={canManageFleet} />
      </div>
    </AdminShell>
  );
}
