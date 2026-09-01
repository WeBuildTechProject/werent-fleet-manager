import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  expirationTypeLabels,
  expirationUrgency,
  vehicleExpirationsQuery,
  vehiclesQuery,
  type VehicleExpiration,
} from "@/lib/gestionale";
import { completeExpiration } from "@/lib/fleet-ops.functions";
import {
  createMaintenanceRequest,
  maintenanceRequestsQuery,
  type MaintenanceRequest,
} from "@/lib/maintenance";

/** La scadenza successiva è pianificata di default a 12 mesi o +15.000 km. */
function nextOf(expiration: VehicleExpiration, mileage: number) {
  if (expiration.data_scadenza) {
    const d = new Date(expiration.data_scadenza);
    d.setFullYear(d.getFullYear() + 1);
    return { data_scadenza: d.toISOString().slice(0, 10), priorita: expiration.priorita };
  }
  return {
    km_scadenza: Math.round((expiration.km_scadenza ?? mileage) + 15_000),
    priorita: expiration.priorita,
  };
}

export function ExpirationsCard({ canWrite, limit = 6 }: { canWrite: boolean; limit?: number }) {
  const queryClient = useQueryClient();
  const expirations = useQuery(vehicleExpirationsQuery);
  const vehicles = useQuery(vehiclesQuery);
  const requests = useQuery(maintenanceRequestsQuery);

  /** Una scadenza genera al massimo una richiesta di manutenzione aperta. */
  const hasRequest = (expirationId: string) =>
    (requests.data ?? []).some(
      (r: MaintenanceRequest) => r.origine === "scadenza" && r.origine_id === expirationId,
    );

  const createRequest = useMutation({
    mutationFn: createMaintenanceRequest,
    onSuccess: async () => {
      toast.success("Richiesta di manutenzione creata dalla scadenza");
      await queryClient.invalidateQueries({ queryKey: ["gestionale", "maintenance-requests"] });
    },
    onError: (e: Error) => toast.error("Creazione non riuscita", { description: e.message }),
  });

  const run = useServerFn(completeExpiration);
  const complete = useMutation({
    mutationFn: (e: VehicleExpiration) => {
      const mileage = Number(
        (vehicles.data ?? []).find((v) => v.id === e.vehicle_id)?.mileage ?? 0,
      );
      return run({
        data: {
          expirationId: e.id,
          dataEsecuzione: new Date().toISOString().slice(0, 10),
          next: nextOf(e, mileage),
        },
      });
    },
    onSuccess: async () => {
      toast.success("Scadenza eseguita e prossima pianificata");
      await queryClient.invalidateQueries({ queryKey: ["gestionale", "vehicle-expirations"] });
    },
    onError: (e: Error) => toast.error("Aggiornamento non riuscito", { description: e.message }),
  });

  const rows = (expirations.data ?? [])
    .filter((e) => !e.eseguita)
    .map((e) => {
      const vehicle = (vehicles.data ?? []).find((v) => v.id === e.vehicle_id);
      return { e, vehicle, urgency: expirationUrgency(e, Number(vehicle?.mileage ?? 0)) };
    })
    .sort((a, b) => {
      const order = { scaduta: 0, urgente: 1, prossima: 2, ok: 3 } as const;
      return order[a.urgency.level] - order[b.urgency.level];
    })
    .slice(0, limit);

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="size-4 text-primary" aria-hidden /> Scadenze in arrivo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessuna scadenza aperta.</p>
        ) : null}
        {rows.map(({ e, vehicle, urgency }) => (
          <div
            key={e.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2.5"
          >
            <div>
              <p className="text-sm font-semibold">
                {expirationTypeLabels[e.tipo] ?? e.tipo} · {vehicle?.plate ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {vehicle?.model ?? "Veicolo"} · {urgency.label}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  urgency.level === "scaduta"
                    ? "destructive"
                    : urgency.level === "urgente"
                      ? "default"
                      : "secondary"
                }
              >
                {urgency.level}
              </Badge>
              {canWrite && (urgency.level === "scaduta" || urgency.level === "urgente") ? (
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-full"
                  disabled={createRequest.isPending || hasRequest(e.id)}
                  onClick={() =>
                    createRequest.mutate({
                      vehicleId: e.vehicle_id,
                      origine: "scadenza",
                      origineId: e.id,
                      descrizione: `${expirationTypeLabels[e.tipo] ?? e.tipo} — ${vehicle?.plate ?? "veicolo"} (${urgency.label})`,
                    })
                  }
                >
                  {hasRequest(e.id) ? "Manutenzione aperta" : "Crea manutenzione"}
                </Button>
              ) : null}
              {canWrite ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  disabled={complete.isPending}
                  onClick={() => complete.mutate(e)}
                >
                  Segna come eseguita
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
