import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Wrench } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatEuro, vehicleDamagesQuery } from "@/lib/gestionale";
import {
  appSettingsQuery,
  createMaintenanceRecord,
  createMaintenanceRequest,
  createOrderLine,
  damageThreshold,
  maintenanceCost,
  maintenanceLinesQuery,
  maintenanceOriginLabels,
  maintenanceRecordStatusLabels,
  maintenanceRecordsQuery,
  maintenanceRequestStatusLabels,
  maintenanceRequestsQuery,
  orderLineStatusLabels,
  updateMaintenanceRecord,
  updateMaintenanceRequest,
  updateOrderLine,
  type MaintenanceRequest,
} from "@/lib/maintenance";

const today = () => new Date().toISOString().slice(0, 10);

export function MaintenancePanel({
  vehicleId,
  canWrite,
}: {
  vehicleId: string;
  canWrite: boolean;
}) {
  const queryClient = useQueryClient();
  const requests = useQuery(maintenanceRequestsQuery);
  const records = useQuery(maintenanceRecordsQuery);
  const lines = useQuery(maintenanceLinesQuery);
  const damages = useQuery(vehicleDamagesQuery(vehicleId));
  const settings = useQuery(appSettingsQuery);

  const [descrizione, setDescrizione] = useState("");
  const [fermoDal, setFermoDal] = useState("");
  const [fermoAl, setFermoAl] = useState("");
  const [officina, setOfficina] = useState<Record<string, string>>({});
  const [lineDraft, setLineDraft] = useState<Record<string, { desc: string; importo: string }>>({});

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["gestionale", "maintenance-requests"] }),
      queryClient.invalidateQueries({ queryKey: ["gestionale", "maintenance-records"] }),
      queryClient.invalidateQueries({ queryKey: ["gestionale", "maintenance-lines"] }),
    ]);
  };

  const vehicleRequests = (requests.data ?? []).filter((r) => r.vehicle_id === vehicleId);
  const threshold = damageThreshold(settings.data);

  /** Danni aperti sopra soglia senza una richiesta collegata: solo suggerimenti. */
  const suggestions = (damages.data ?? []).filter(
    (d) =>
      d.status !== "chiuso" &&
      Number(d.charge_amount) >= threshold &&
      !vehicleRequests.some((r) => r.origine === "danno" && r.origine_id === d.id),
  );

  const create = useMutation({
    mutationFn: createMaintenanceRequest,
    onSuccess: async () => {
      toast.success("Richiesta di manutenzione creata");
      setDescrizione("");
      setFermoDal("");
      setFermoAl("");
      await invalidate();
    },
    onError: (e: Error) => toast.error("Creazione non riuscita", { description: e.message }),
  });

  const patchRequest = useMutation({
    mutationFn: (v: { id: string; stato: string }) =>
      updateMaintenanceRequest(v.id, { stato: v.stato }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error("Aggiornamento non riuscito", { description: e.message }),
  });

  const openRecord = useMutation({
    mutationFn: createMaintenanceRecord,
    onSuccess: async () => {
      toast.success("Pratica aperta");
      await invalidate();
    },
    onError: (e: Error) => toast.error("Apertura non riuscita", { description: e.message }),
  });

  const patchRecord = useMutation({
    mutationFn: (v: { id: string; stato: string }) => updateMaintenanceRecord(v.id, { stato: v.stato }),
    onSuccess: invalidate,
  });

  const addLine = useMutation({
    mutationFn: createOrderLine,
    onSuccess: async () => {
      toast.success("Riga di preventivo aggiunta");
      await invalidate();
    },
    onError: (e: Error) => toast.error("Inserimento non riuscito", { description: e.message }),
  });

  const patchLine = useMutation({
    mutationFn: (v: { id: string; stato_riga: string }) =>
      updateOrderLine(v.id, {
        stato_riga: v.stato_riga,
        data_completamento: v.stato_riga === "approvata" ? today() : null,
      }),
    onSuccess: invalidate,
  });

  const recordsOf = (request: MaintenanceRequest) =>
    (records.data ?? []).filter((r) => r.request_id === request.id);
  const linesOf = (recordId: string) => (lines.data ?? []).filter((l) => l.record_id === recordId);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wrench className="size-4 text-primary" aria-hidden /> Richieste di manutenzione
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {vehicleRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessuna richiesta di manutenzione per questo veicolo.
            </p>
          ) : null}

          {vehicleRequests.map((req) => {
            const reqRecords = recordsOf(req);
            return (
              <div key={req.id} className="rounded-xl border border-border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{req.descrizione}</p>
                    <p className="text-xs text-muted-foreground">
                      {maintenanceOriginLabels[req.origine] ?? req.origine} ·{" "}
                      {formatDate(req.data_segnalazione)}
                      {req.fermo_dal && req.fermo_al
                        ? ` · fermo ${formatDate(req.fermo_dal)} → ${formatDate(req.fermo_al)}`
                        : " · nessun fermo indicato"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={req.stato === "chiusa" ? "secondary" : "default"}>
                      {maintenanceRequestStatusLabels[req.stato] ?? req.stato}
                    </Badge>
                    {canWrite && req.stato !== "chiusa" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => patchRequest.mutate({ id: req.id, stato: "chiusa" })}
                      >
                        Chiudi
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 space-y-3">
                  {reqRecords.map((rec) => {
                    const recLines = linesOf(rec.id);
                    const draft = lineDraft[rec.id] ?? { desc: "", importo: "" };
                    return (
                      <div key={rec.id} className="rounded-lg bg-muted/40 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium">
                            Pratica · {rec.officina}{" "}
                            <span className="text-xs text-muted-foreground">
                              (apertura {formatDate(rec.data_apertura)})
                            </span>
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {maintenanceRecordStatusLabels[rec.stato] ?? rec.stato}
                            </Badge>
                            {canWrite && rec.stato !== "chiusa" ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => patchRecord.mutate({ id: rec.id, stato: "chiusa" })}
                              >
                                Chiudi pratica
                              </Button>
                            ) : null}
                          </div>
                        </div>

                        <ul className="mt-2 space-y-1.5">
                          {recLines.map((l) => (
                            <li
                              key={l.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-card px-2.5 py-1.5 text-xs"
                            >
                              <span className="font-medium">{l.descrizione_lavoro}</span>
                              <span className="flex items-center gap-2">
                                <span>{formatEuro(Number(l.importo))}</span>
                                <Badge
                                  variant={
                                    l.stato_riga === "rifiutata"
                                      ? "destructive"
                                      : l.stato_riga === "proposta"
                                        ? "secondary"
                                        : "default"
                                  }
                                >
                                  {orderLineStatusLabels[l.stato_riga] ?? l.stato_riga}
                                </Badge>
                                {canWrite && l.stato_riga === "proposta" ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 rounded-full px-2"
                                      onClick={() =>
                                        patchLine.mutate({ id: l.id, stato_riga: "approvata" })
                                      }
                                    >
                                      Approva
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2"
                                      onClick={() =>
                                        patchLine.mutate({ id: l.id, stato_riga: "rifiutata" })
                                      }
                                    >
                                      Rifiuta
                                    </Button>
                                  </>
                                ) : null}
                              </span>
                            </li>
                          ))}
                          {recLines.length === 0 ? (
                            <li className="text-xs text-muted-foreground">
                              Nessuna riga di preventivo.
                            </li>
                          ) : null}
                        </ul>

                        <p className="mt-2 text-xs font-semibold">
                          Totale approvato: {formatEuro(maintenanceCost(recLines))}
                        </p>

                        {canWrite ? (
                          <div className="mt-2 flex flex-wrap items-end gap-2">
                            <Input
                              className="h-8 flex-1 min-w-40"
                              placeholder="Descrizione lavoro"
                              value={draft.desc}
                              onChange={(e) =>
                                setLineDraft((d) => ({
                                  ...d,
                                  [rec.id]: { ...draft, desc: e.target.value },
                                }))
                              }
                            />
                            <Input
                              className="h-8 w-28"
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder="Importo €"
                              value={draft.importo}
                              onChange={(e) =>
                                setLineDraft((d) => ({
                                  ...d,
                                  [rec.id]: { ...draft, importo: e.target.value },
                                }))
                              }
                            />
                            <Button
                              size="sm"
                              className="h-8 rounded-full"
                              disabled={!draft.desc || !draft.importo || addLine.isPending}
                              onClick={() =>
                                addLine.mutate(
                                  {
                                    recordId: rec.id,
                                    descrizione: draft.desc,
                                    importo: Number(draft.importo),
                                  },
                                  {
                                    onSuccess: () =>
                                      setLineDraft((d) => ({
                                        ...d,
                                        [rec.id]: { desc: "", importo: "" },
                                      })),
                                  },
                                )
                              }
                            >
                              <Plus className="size-3.5" /> Riga
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}

                  {canWrite && req.stato !== "chiusa" ? (
                    <div className="flex flex-wrap items-end gap-2">
                      <Input
                        className="h-8 w-48"
                        placeholder="Officina"
                        value={officina[req.id] ?? ""}
                        onChange={(e) =>
                          setOfficina((o) => ({ ...o, [req.id]: e.target.value }))
                        }
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-full"
                        disabled={!officina[req.id] || openRecord.isPending}
                        onClick={() =>
                          openRecord.mutate(
                            { requestId: req.id, officina: officina[req.id]! },
                            {
                              onSuccess: () =>
                                setOfficina((o) => ({ ...o, [req.id]: "" })),
                            },
                          )
                        }
                      >
                        Apri pratica officina
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {canWrite ? (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Nuova segnalazione</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="mnt-desc">Descrizione</Label>
                <Textarea
                  id="mnt-desc"
                  rows={3}
                  value={descrizione}
                  onChange={(e) => setDescrizione(e.target.value)}
                  placeholder="Es. rumore sospensione anteriore destra"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="mnt-dal">Fermo dal</Label>
                  <Input
                    id="mnt-dal"
                    type="date"
                    value={fermoDal}
                    onChange={(e) => setFermoDal(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mnt-al">Fermo al</Label>
                  <Input
                    id="mnt-al"
                    type="date"
                    value={fermoAl}
                    onChange={(e) => setFermoAl(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Il fermo indicato rende il veicolo non prenotabile in quel periodo.
              </p>
              <Button
                className="w-full rounded-full"
                disabled={!descrizione || create.isPending}
                onClick={() =>
                  create.mutate({
                    vehicleId,
                    origine: "segnalazione_manuale",
                    descrizione,
                    fermoDal: fermoDal || null,
                    fermoAl: fermoAl || fermoDal || null,
                  })
                }
              >
                Crea richiesta
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">
              Danni sopra soglia ({formatEuro(threshold)})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {suggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nessun danno sopra soglia da valutare.
              </p>
            ) : null}
            {suggestions.map((d) => (
              <div
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-semibold">
                    {d.damage_type} · {formatEuro(Number(d.charge_amount))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {d.description ?? "Danno registrato"} · {formatDate(d.reported_at)}
                  </p>
                </div>
                {canWrite ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() =>
                      create.mutate({
                        vehicleId,
                        origine: "danno",
                        origineId: d.id,
                        descrizione: `Danno ${d.damage_type} (${d.severity}) — ${
                          d.description ?? "riparazione da valutare"
                        }`,
                      })
                    }
                  >
                    Crea richiesta
                  </Button>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** Selettore di stato riutilizzabile (usato dai filtri elenco richieste). */
export function RequestStatusSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-44">
        <SelectValue placeholder="Stato" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Tutti gli stati</SelectItem>
        {Object.entries(maintenanceRequestStatusLabels).map(([k, label]) => (
          <SelectItem key={k} value={k}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
