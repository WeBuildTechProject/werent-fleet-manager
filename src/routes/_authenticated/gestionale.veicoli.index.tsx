import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronRight } from "lucide-react";

import { AdminShell } from "@/components/gestionale/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
  branchesQuery,
  onlyActive,
  damagesQuery,
  formatDate,
  formatEuro,
  vehicleStatusLabels,
  vehiclesQuery,
} from "@/lib/gestionale";

export const Route = createFileRoute("/_authenticated/gestionale/veicoli/")({
  component: VehiclesPage,
});

function VehiclesPage() {
  const vehicles = useQuery(vehiclesQuery);
  const branches = useQuery(branchesQuery);
  const [showInactive, setShowInactive] = useState(false);
  const damages = useQuery(damagesQuery);

  const [q, setQ] = useState("");
  const [branch, setBranch] = useState("all");
  const [status, setStatus] = useState("all");

  const term = q.trim().toLowerCase();
  const rows = (vehicles.data ?? []).filter(
    (v) =>
      (!term || v.model.toLowerCase().includes(term) || v.plate.toLowerCase().includes(term)) &&
      (branch === "all" || v.branch_id === branch) &&
      (status === "all" || v.status === status),
  );

  return (
    <AdminShell
      section="veicoli"
      title="Flotta"
      subtitle={`${rows.length} veicoli · scheda con schema danni interattivo e scadenze`}
      actions={
        <>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Modello o targa"
            className="w-52"
            aria-label="Cerca veicolo"
          />
          <Select value={branch} onValueChange={setBranch}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Sede" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le sedi</SelectItem>
              {/* Le sedi disattivate compaiono solo su richiesta esplicita, per
                  non allungare i filtri con record storici. */}
              {onlyActive(branches.data, showInactive).map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                  {b.active ? "" : " (storico)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Stato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli stati</SelectItem>
              {Object.entries(vehicleStatusLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 whitespace-nowrap text-xs text-muted-foreground">
            <Checkbox
              checked={showInactive}
              onCheckedChange={(v) => setShowInactive(v === true)}
            />
            Mostra anche sedi storiche
          </label>
        </>
      }
    >
      <Card className="overflow-hidden p-0 shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Veicolo</TableHead>
              <TableHead>Sede</TableHead>
              <TableHead className="text-right">Km</TableHead>
              <TableHead className="text-right">Tariffa</TableHead>
              <TableHead>Revisione</TableHead>
              <TableHead className="text-right">Danni aperti</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((v) => {
              const open = (damages.data ?? []).filter(
                (d) => d.vehicle_id === v.id && d.status !== "chiuso",
              ).length;
              const branchName = (branches.data ?? []).find((b) => b.id === v.branch_id)?.name;
              return (
                <TableRow key={v.id}>
                  <TableCell>
                    <span className="font-semibold">{v.model}</span>
                    <span className="block font-mono text-xs text-muted-foreground">{v.plate}</span>
                  </TableCell>
                  <TableCell className="text-sm">{branchName ?? "—"}</TableCell>
                  <TableCell className="text-right text-sm">
                    {v.mileage.toLocaleString("it-IT")}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {formatEuro(Number(v.daily_rate))}
                  </TableCell>
                  <TableCell className="text-sm">
                    {v.next_service_date ? formatDate(v.next_service_date) : "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm">{open}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        v.status === "disponibile"
                          ? "default"
                          : v.status === "manutenzione"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {vehicleStatusLabels[v.status] ?? v.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      to="/gestionale/veicoli/$vehicleId"
                      params={{ vehicleId: v.id }}
                      className="inline-flex items-center text-sm font-semibold text-primary"
                    >
                      Scheda <ChevronRight className="size-4" />
                    </Link>
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
