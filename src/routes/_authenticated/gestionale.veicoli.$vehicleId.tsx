import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { AdminShell } from "@/components/gestionale/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { MaintenancePanel } from "@/components/gestionale/maintenance-panel";
import { VehicleProfitability } from "@/components/gestionale/vehicle-profitability";
import { hasCapability } from "@/lib/roles";
import {
  branchesQuery,
  myRolesQuery,
  damageViews,
  formatDate,
  formatEuro,
  logAudit,
  reservationsQuery,
  vehicleDamagesQuery,
  vehicleStatusLabels,
  vehiclesQuery,
  type DamageView,
} from "@/lib/gestionale";

export const Route = createFileRoute("/_authenticated/gestionale/veicoli/$vehicleId")({
  component: VehicleDetailPage,
});

const viewLabel = (id: string) => damageViews.find((v) => v.id === id)?.label ?? id;

const severityColor: Record<string, string> = {
  lieve: "oklch(0.82 0.13 95)",
  medio: "oklch(0.72 0.16 55)",
  grave: "oklch(0.58 0.19 25)",
};

function VehicleDetailPage() {
  const { vehicleId } = useParams({ from: "/_authenticated/gestionale/veicoli/$vehicleId" });
  const queryClient = useQueryClient();
  const vehicles = useQuery(vehiclesQuery);
  const branches = useQuery(branchesQuery);
  const reservations = useQuery(reservationsQuery);
  const { data: myRoles } = useQuery(myRolesQuery);
  const canManageFleet = hasCapability(myRoles, "manage_fleet");
  const damages = useQuery(vehicleDamagesQuery(vehicleId));

  const [view, setView] = useState<DamageView>("fronte");
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
  const [damageType, setDamageType] = useState("graffio");
  const [severity, setSeverity] = useState("lieve");
  const [note, setNote] = useState("");

  const vehicle = (vehicles.data ?? []).find((v) => v.id === vehicleId);
  const branch = (branches.data ?? []).find((b) => b.id === vehicle?.branch_id);
  const history = (reservations.data ?? []).filter((r) => r.vehicle_id === vehicleId);
  const viewDamages = (damages.data ?? []).filter((d) => d.view === view);

  const createDamage = useMutation({
    mutationFn: async () => {
      if (!draft) return;
      const { error } = await supabase.from("vehicle_damages").insert({
        vehicle_id: vehicleId,
        view,
        pos_x: draft.x,
        pos_y: draft.y,
        damage_type: damageType,
        severity,
        description: note || null,
        status: "aperto",
      });
      if (error) throw new Error(error.message);
      await logAudit("create", "vehicle_damage");
    },
    onSuccess: async () => {
      toast.success("Danno registrato sullo schema");
      setDraft(null);
      setNote("");
      await queryClient.invalidateQueries({ queryKey: ["gestionale", "damages"] });
    },
    onError: (e: Error) => toast.error("Registrazione non riuscita", { description: e.message }),
  });

  const closeDamage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("vehicle_damages")
        .update({ status: "chiuso" })
        .eq("id", id);
      if (error) throw new Error(error.message);
      await logAudit("update", "vehicle_damage");
    },
    onSuccess: async () => {
      toast.success("Danno chiuso");
      await queryClient.invalidateQueries({ queryKey: ["gestionale", "damages"] });
    },
  });

  return (
    <AdminShell
      section="veicoli"
      title={vehicle ? `${vehicle.model} · ${vehicle.plate}` : "Scheda veicolo"}
      subtitle={
        vehicle
          ? `${branch?.name ?? "sede da assegnare"} · ${vehicle.mileage.toLocaleString("it-IT")} km · ${formatEuro(Number(vehicle.daily_rate))}/giorno`
          : "Caricamento…"
      }
      actions={
        <Button asChild size="sm" variant="outline" className="rounded-full">
          <Link to="/gestionale/veicoli">
            <ArrowLeft className="size-4" /> Torna alla flotta
          </Link>
        </Button>
      }
    >
      <Tabs defaultValue="danni">
        <TabsList>
          <TabsTrigger value="danni">Schema danni</TabsTrigger>
          <TabsTrigger value="anagrafica">Anagrafica</TabsTrigger>
          <TabsTrigger value="storico">Storico contratti</TabsTrigger>
          <TabsTrigger value="manutenzione">Manutenzione</TabsTrigger>
          <TabsTrigger value="redditivita">Redditività</TabsTrigger>
        </TabsList>

        <TabsContent value="manutenzione" className="mt-4">
          <MaintenancePanel vehicleId={vehicleId} canWrite={canManageFleet} />
        </TabsContent>

        <TabsContent value="redditivita" className="mt-4">
          <VehicleProfitability vehicleId={vehicleId} />
        </TabsContent>

        <TabsContent value="danni" className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card className="shadow-card">
            <CardHeader className="flex-row items-center justify-between gap-3">
              <CardTitle className="text-base">Clicca sullo schema per segnare un danno</CardTitle>
              <div className="flex flex-wrap gap-1">
                {damageViews.map((v) => (
                  <Button
                    key={v.id}
                    size="sm"
                    variant={view === v.id ? "default" : "outline"}
                    className="rounded-full"
                    onClick={() => setView(v.id)}
                  >
                    {v.label}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <svg
                viewBox="0 0 100 60"
                role="img"
                aria-label={`Schema veicolo — ${viewLabel(view)}`}
                className="w-full cursor-crosshair rounded-lg border border-border bg-secondary/40"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setDraft({
                    x: Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10,
                    y: Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10,
                  });
                }}
              >
                {view === "fronte" || view === "retro" ? (
                  <g fill="none" stroke="var(--foreground)" strokeWidth="0.8">
                    <rect x="20" y="14" width="60" height="34" rx="6" />
                    <rect x="28" y="19" width="44" height="13" rx="3" />
                    <circle cx="30" cy="48" r="4" />
                    <circle cx="70" cy="48" r="4" />
                    <rect x="24" y="38" width="12" height="4" rx="2" />
                    <rect x="64" y="38" width="12" height="4" rx="2" />
                  </g>
                ) : (
                  <g fill="none" stroke="var(--foreground)" strokeWidth="0.8">
                    <path d="M8 42 L14 26 L34 18 L66 18 L86 27 L92 42 Z" />
                    <path d="M30 19 L36 30 L64 30 L68 19" />
                    <circle cx="28" cy="44" r="6" />
                    <circle cx="74" cy="44" r="6" />
                  </g>
                )}

                {viewDamages.map((d) => (
                  <circle
                    key={d.id}
                    cx={Number(d.pos_x)}
                    cy={(Number(d.pos_y) / 100) * 60}
                    r="2"
                    fill={severityColor[d.severity] ?? "var(--primary)"}
                    opacity={d.status === "chiuso" ? 0.35 : 1}
                  />
                ))}
                {draft ? (
                  <circle
                    cx={draft.x}
                    cy={(draft.y / 100) * 60}
                    r="2.4"
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="0.8"
                  />
                ) : null}
              </svg>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                {Object.entries(severityColor).map(([k, color]) => (
                  <span key={k} className="inline-flex items-center gap-2">
                    <span className="size-3 rounded-full" style={{ background: color }} aria-hidden />
                    {k}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Registro danni ({damages.data?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(damages.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun danno registrato.</p>
              ) : (
                (damages.data ?? []).map((d) => (
                  <div
                    key={d.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-semibold capitalize">
                        {d.damage_type} · {viewLabel(d.view)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {d.severity} · {formatDate(d.reported_at)}
                        {d.description ? ` · ${d.description}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <Badge variant={d.status === "chiuso" ? "secondary" : "destructive"}>
                        {d.status}
                      </Badge>
                      {d.status !== "chiuso" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => closeDamage.mutate(d.id)}
                        >
                          Chiudi
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="anagrafica" className="mt-4">
          <Card className="shadow-card">
            <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Targa", vehicle?.plate ?? "—"],
                ["Categoria", vehicle?.category ?? "—"],
                ["Tariffa base", vehicle ? formatEuro(Number(vehicle.daily_rate)) : "—"],
                ["Km", vehicle ? vehicle.mileage.toLocaleString("it-IT") : "—"],
                ["Stato", vehicle ? (vehicleStatusLabels[vehicle.status] ?? vehicle.status) : "—"],
                ["Sede", branch?.name ?? "—"],
                [
                  "Prossimo tagliando",
                  vehicle?.next_service_date ? formatDate(vehicle.next_service_date) : "—",
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold capitalize">{value}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storico" className="mt-4">
          <Card className="shadow-card">
            <CardContent className="space-y-2 pt-6">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun contratto collegato.</p>
              ) : (
                history.map((r) => (
                  <div
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2.5 text-sm"
                  >
                    <span className="font-mono text-xs">{r.code}</span>
                    <span className="font-semibold">{r.customer_name}</span>
                    <span className="text-muted-foreground">
                      {r.date_from} → {r.date_to}
                    </span>
                    <span className="font-semibold">{formatEuro(Number(r.total_amount))}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={draft !== null} onOpenChange={(o) => (o ? null : setDraft(null))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuovo danno — {viewLabel(view)}</DialogTitle>
            <DialogDescription>
              Posizione {draft?.x ?? 0}% / {draft?.y ?? 0}% sullo schema selezionato.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={damageType} onValueChange={setDamageType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["graffio", "ammaccatura", "vetro", "cerchio", "interni", "meccanico"].map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Gravità</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["lieve", "medio", "grave"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="dn">Descrizione</Label>
              <Textarea id="dn" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button
              className="rounded-full"
              disabled={createDamage.isPending}
              onClick={() => createDamage.mutate()}
            >
              Registra danno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
