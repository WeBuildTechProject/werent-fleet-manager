import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { AdminShell } from "@/components/gestionale/admin-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { maintenanceForDay } from "@/lib/gestionale";
import {
  maintenanceRequestsQuery,
  openRequestsFor,
} from "@/lib/maintenance";
import {
  branchesQuery,
  onlyActive,
  reservationForDay,
  reservationsQuery,
  vehiclesQuery,
} from "@/lib/gestionale";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/gestionale/calendario")({
  component: CalendarPage,
});

const DAYS = 21;

function addDays(base: Date, n: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

function CalendarPage() {
  const vehicles = useQuery(vehiclesQuery);
  const reservations = useQuery(reservationsQuery);
  const branches = useQuery(branchesQuery);
  const maintenance = useQuery(maintenanceRequestsQuery);

  const [offset, setOffset] = useState(0);
  const [branch, setBranch] = useState("all");
  const [category, setCategory] = useState("all");

  const start = useMemo(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return addDays(d, offset * 7);
  }, [offset]);

  const days = useMemo(
    () => Array.from({ length: DAYS }, (_, i) => addDays(start, i)),
    [start],
  );

  const rows = (vehicles.data ?? []).filter(
    (v) =>
      (branch === "all" || v.branch_id === branch) &&
      (category === "all" || v.category === category),
  );

  const categories = Array.from(new Set((vehicles.data ?? []).map((v) => v.category)));

  // Logica di occupazione condivisa con il motore di prenotazione pubblico.
  function cellFor(vehicleId: string, day: string) {
    return reservationForDay(reservations.data ?? [], vehicleId, day);
  }

  return (
    <AdminShell
      section="calendario"
      title="Calendario disponibilità"
      subtitle="Griglia veicolo × giorno: verde disponibile, magenta contratto in corso, rosa prenotazione confermata."
      actions={
        <>
          <Select value={branch} onValueChange={setBranch}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Sede" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le sedi</SelectItem>
              {/* Vista operativa: solo sedi attive. */}
              {onlyActive(branches.data).map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le categorie</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" onClick={() => setOffset((o) => o - 1)} aria-label="Settimana precedente">
              <ChevronLeft className="size-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => setOffset(0)}>
              Oggi
            </Button>
            <Button size="icon" variant="outline" onClick={() => setOffset((o) => o + 1)} aria-label="Settimana successiva">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </>
      }
    >
      <Card className="overflow-hidden p-0 shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-secondary/70">
                <th className="sticky left-0 z-10 min-w-56 border-b border-r border-border bg-secondary/70 px-3 py-2 text-left font-semibold">
                  Veicolo
                </th>
                {days.map((d) => {
                  const weekend = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <th
                      key={iso(d)}
                      className={cn(
                        "min-w-10 border-b border-r border-border px-1 py-2 text-center font-semibold",
                        weekend && "bg-muted",
                      )}
                    >
                      <span className="block text-[10px] uppercase text-muted-foreground">
                        {d.toLocaleDateString("it-IT", { weekday: "narrow" })}
                      </span>
                      {d.getDate()}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.id} className="hover:bg-muted/50">
                  <th className="sticky left-0 z-10 border-b border-r border-border bg-card px-3 py-2 text-left font-normal">
                    <Link
                      to="/gestionale/veicoli/$vehicleId"
                      params={{ vehicleId: v.id }}
                      className="block"
                    >
                      <span className="block text-sm font-semibold text-foreground">{v.model}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {v.plate} · {v.category} · {v.mileage.toLocaleString("it-IT")} km
                      </span>
                      {openRequestsFor(maintenance.data, v.id).length > 0 ? (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                          Manutenzione aperta
                        </span>
                      ) : null}
                    </Link>
                  </th>
                  {days.map((d) => {
                    const day = iso(d);
                    const res = cellFor(v.id, day);
                    const fermo = maintenanceForDay(maintenance.data, v.id, day);
                    const inMaintenance = v.status === "manutenzione" || Boolean(fermo);
                    return (
                      <td
                        key={day}
                        title={
                          res
                            ? `${res.code} · ${res.customer_name} (${res.date_from} → ${res.date_to})`
                            : inMaintenance
                              ? fermo
                                ? `Fermo manutenzione: ${fermo.descrizione ?? ""}`.trim()
                                : "In manutenzione"
                              : "Disponibile"
                        }
                        className={cn(
                          "border-b border-r border-border px-0 py-2.5 text-center",
                          !res && !inMaintenance && "bg-[oklch(0.93_0.05_150)]",
                          res?.status === "in_corso" && "bg-[oklch(0.62_0.19_350)]",
                          res?.status === "confermata" && "bg-[oklch(0.85_0.09_350)]",
                          res?.status === "chiusa" && "bg-muted",
                          inMaintenance && !res && "bg-[oklch(0.9_0.12_85)]",
                        )}
                      />
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {[
          ["oklch(0.93 0.05 150)", "Disponibile"],
          ["oklch(0.62 0.19 350)", "Contratto in corso"],
          ["oklch(0.85 0.09 350)", "Prenotazione confermata"],
          ["oklch(0.9 0.12 85)", "Manutenzione"],
        ].map(([color, label]) => (
          <span key={label} className="inline-flex items-center gap-2">
            <span className="size-3 rounded" style={{ background: color }} aria-hidden />
            {label}
          </span>
        ))}
      </div>
    </AdminShell>
  );
}
