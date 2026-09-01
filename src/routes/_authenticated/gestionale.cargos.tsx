import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Download, Loader2, RefreshCw, Send, ShieldAlert, TestTube2 } from "lucide-react";
import { toast } from "sonner";

import { AdminShell } from "@/components/gestionale/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  cargosSettingKeys,
  cargosStatusLabels,
  cargosTabelle,
  CARGOS_FIELDS,
  CARGOS_RECORD_LENGTH,
} from "@/lib/cargos";
import {
  checkCargosReservation,
  getCargosOverview,
  previewCargosRecord,
  refreshCargosTabella,
  saveCargosMapping,
  sendCargosReservation,
} from "@/lib/cargos.functions";
import { branchesQuery, formatDate, onlyActive, vehicleCategoriesQuery } from "@/lib/gestionale";

export const Route = createFileRoute("/_authenticated/gestionale/cargos")({
  component: CargosPage,
});

/** Modalità di pagamento interne per cui serve un codice CaRGOS. */
const paymentModes = ["stripe", "contanti", "bonifico", "non_specificato"] as const;

function CargosPage() {
  const queryClient = useQueryClient();
  const overviewFn = useServerFn(getCargosOverview);
  const previewFn = useServerFn(previewCargosRecord);
  const checkFn = useServerFn(checkCargosReservation);
  const sendFn = useServerFn(sendCargosReservation);
  const saveMappingFn = useServerFn(saveCargosMapping);
  const refreshTabellaFn = useServerFn(refreshCargosTabella);

  const overview = useQuery({
    queryKey: ["gestionale", "cargos", "overview"],
    queryFn: () => overviewFn(),
  });
  const branches = useQuery(branchesQuery);
  const categories = useQuery(vehicleCategoriesQuery);

  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<{ code: string; record: string | null; notes: string[] } | null>(null);

  const savedMapping = useMemo(() => {
    const map: Record<string, string> = {};
    for (const row of overview.data?.settings ?? []) map[row.key] = row.value ?? "";
    return map;
  }, [overview.data?.settings]);

  useEffect(() => {
    setMapping(savedMapping);
  }, [savedMapping]);

  const mappingRows = useMemo(() => {
    const rows: { key: string; label: string; hint: string }[] = [
      {
        key: cargosSettingKeys.organizzazione,
        label: "Codice organizzazione",
        hint: "Assegnato dal portale CaRGOS (la variabile d'ambiente, se presente, ha priorità)",
      },
      {
        key: cargosSettingKeys.tipoDocumentoDefault,
        label: "Tipo documento predefinito",
        hint: "Codice dalla tabella ufficiale dei tipi documento",
      },
    ];
    for (const branch of onlyActive(branches.data)) {
      rows.push({
        key: cargosSettingKeys.luogoPolizia(branch.id),
        label: `Luogo polizia · ${branch.name}`,
        hint: "Codice del luogo di polizia competente per la sede",
      });
    }
    for (const category of onlyActive(categories.data)) {
      rows.push({
        key: cargosSettingKeys.tipoVeicolo(category.id),
        label: `Tipo veicolo · ${category.label_it}`,
        hint: "Codice dalla tabella ufficiale dei tipi veicolo",
      });
    }
    for (const mode of paymentModes) {
      rows.push({
        key: cargosSettingKeys.tipoPagamento(mode),
        label: `Tipo pagamento · ${mode}`,
        hint: "Codice dalla tabella ufficiale dei tipi pagamento",
      });
    }
    return rows;
  }, [branches.data, categories.data]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["gestionale", "cargos", "overview"] });

  const saveMapping = useMutation({
    mutationFn: async () => {
      const entries = mappingRows
        .map((row) => ({ key: row.key, value: (mapping[row.key] ?? "").trim(), description: row.label }))
        .filter((entry) => entry.value !== "" && entry.value !== (savedMapping[entry.key] ?? ""));
      if (entries.length === 0) return { saved: 0 };
      return saveMappingFn({ data: { entries } });
    },
    onSuccess: async (result) => {
      toast.success(result.saved > 0 ? `Mapping salvato (${result.saved} codici)` : "Nessuna modifica da salvare");
      await invalidate();
    },
    onError: (e: Error) => toast.error("Salvataggio non riuscito", { description: e.message }),
  });

  const runPreview = useMutation({
    mutationFn: async (input: { reservationId: string; code: string }) => ({
      code: input.code,
      result: await previewFn({ data: { reservationId: input.reservationId } }),
    }),
    onSuccess: ({ code, result }) => {
      setPreview({
        code,
        record: result.record,
        notes: [
          ...result.missingMappings.map((m) => `Mapping mancante: ${m}`),
          ...result.issues.map((i) => `${i.label}: ${i.message}`),
        ],
      });
    },
    onError: (e: Error) => toast.error("Anteprima non riuscita", { description: e.message }),
  });

  const check = useMutation({
    mutationFn: (reservationId: string) => checkFn({ data: { reservationId } }),
    onSuccess: async (result) => {
      if (result.stato === "errore") {
        toast.error("Validazione non superata", { description: result.messages.join(" · ") });
      } else {
        toast.success(`Tracciato validato (adapter ${result.mode})`);
      }
      await invalidate();
    },
    onError: (e: Error) => toast.error("Validazione non riuscita", { description: e.message }),
  });

  const send = useMutation({
    mutationFn: (reservationId: string) => sendFn({ data: { reservationId } }),
    onSuccess: async (result) => {
      if (result.stato === "inviato") {
        toast.success(`Contratto comunicato (adapter ${result.mode})`, {
          description: result.transactionId ? `Transazione ${result.transactionId}` : undefined,
        });
      } else {
        toast.error("Invio non riuscito", { description: result.messages.join(" · ") });
      }
      await invalidate();
    },
    onError: (e: Error) => toast.error("Invio non riuscito", { description: e.message }),
  });

  const refreshTabella = useMutation({
    mutationFn: (tabellaId: number) => refreshTabellaFn({ data: { tabellaId } }),
    onSuccess: async (result) => {
      toast.message(result.message ?? `Tabella aggiornata: ${result.imported} righe`);
      await invalidate();
    },
    onError: (e: Error) => toast.error("Scarico tabella non riuscito", { description: e.message }),
  });

  const mode = overview.data?.mode ?? "mock";

  return (
    <AdminShell
      title="Comunicazioni CaRGOS"
      subtitle="Trasmissione dei contratti di noleggio alla Polizia di Stato (art. 17 D.L. 113/2018)"
      section="cargos"
    >
      <div className="space-y-6">
        <Card className="border-amber-500/40 bg-amber-500/5 p-4">
          <div className="flex flex-wrap items-start gap-3">
            <ShieldAlert className="mt-0.5 size-5 text-amber-600" />
            <div className="min-w-0 flex-1 space-y-1 text-sm">
              <div className="flex flex-wrap items-center gap-2 font-semibold">
                <span>Adapter attivo:</span>
                <Badge variant={mode === "live" ? "default" : "secondary"}>
                  {mode === "live" ? "reale (portale CaRGOS)" : "mock (nessun invio reale)"}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Il tracciato record ({CARGOS_RECORD_LENGTH} caratteri, {CARGOS_FIELDS.length} campi) è una
                ricostruzione del manuale ufficiale: va verificato riga per riga sul documento originale prima di
                qualunque invio reale. Fino ad allora RentHub resta il sistema di riferimento e non va spento.
              </p>
              {mode === "live" && !overview.data?.tracciatoVerificato ? (
                <p className="font-medium text-amber-700">
                  Invio definitivo bloccato: manca la conferma di verifica del tracciato.
                </p>
              ) : null}
              {mode === "live" && !overview.data?.cifraturaVerificata ? (
                <p className="font-medium text-amber-700">
                  Invio definitivo bloccato: manca la conferma del formato di cifratura del token (ApiKey).
                </p>
              ) : null}
            </div>
          </div>
        </Card>

        <Tabs defaultValue="stato">
          <TabsList>
            <TabsTrigger value="stato">Stato comunicazioni</TabsTrigger>
            <TabsTrigger value="coda">Contratti da comunicare</TabsTrigger>
            <TabsTrigger value="mapping">Codici e mapping</TabsTrigger>
          </TabsList>

          <TabsContent value="stato" className="space-y-4">
            <Card className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contratto</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Periodo</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Transazione</TableHead>
                    <TableHead>Tentativi</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(overview.data?.transmissions ?? []).map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-semibold">{t.reservation_code}</TableCell>
                      <TableCell>{t.customer_name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {t.date_from ? `${formatDate(t.date_from)} → ${formatDate(t.date_to)}` : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            t.stato === "inviato" ? "default" : t.stato === "errore" ? "destructive" : "secondary"
                          }
                        >
                          {cargosStatusLabels[t.stato] ?? t.stato}
                        </Badge>
                        {t.errore?.messaggi?.length ? (
                          <p className="mt-1 flex items-start gap-1 text-xs text-destructive">
                            <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                            <span>{t.errore.messaggi.join(" · ")}</span>
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{t.transaction_id ?? "—"}</TableCell>
                      <TableCell>
                        {t.tentativi}
                        {t.next_attempt_at ? (
                          <span className="block text-xs text-muted-foreground">
                            prossimo: {new Date(t.next_attempt_at).toLocaleString("it-IT")}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="space-x-2 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            runPreview.mutate({ reservationId: t.reservation_id, code: t.reservation_code })
                          }
                        >
                          Tracciato
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => send.mutate(t.reservation_id)}>
                          {send.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                          <span className="ml-1">Riprova</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(overview.data?.transmissions ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        Nessuna comunicazione registrata.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </Card>

            {preview ? (
              <Card className="space-y-2 p-4">
                <p className="text-sm font-semibold">
                  Tracciato {preview.code} · {preview.record?.length ?? 0}/{CARGOS_RECORD_LENGTH} caratteri
                </p>
                {preview.notes.length > 0 ? (
                  <ul className="list-inside list-disc text-sm text-destructive">
                    {preview.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                ) : null}
                {preview.record ? (
                  <Textarea readOnly rows={6} value={preview.record} className="font-mono text-xs" />
                ) : null}
              </Card>
            ) : null}
          </TabsContent>

          <TabsContent value="coda" className="space-y-4">
            <Card className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contratto</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Periodo</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(overview.data?.pending ?? []).map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-semibold">{r.code}</TableCell>
                      <TableCell>{r.customer_name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(r.date_from)} → {formatDate(r.date_to)}
                      </TableCell>
                      <TableCell className="space-x-2 text-right">
                        {r.is_demo ? (
                          <Badge variant="secondary">Prenotazione demo — esclusa da CaRGOS</Badge>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => runPreview.mutate({ reservationId: r.id, code: r.code })}
                            >
                              Tracciato
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => check.mutate(r.id)}>
                              <TestTube2 className="size-4" />
                              <span className="ml-1">Valida</span>
                            </Button>
                            <Button size="sm" onClick={() => send.mutate(r.id)}>
                              <Send className="size-4" />
                              <span className="ml-1">Comunica</span>
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(overview.data?.pending ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        Nessun contratto concluso in attesa di comunicazione.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="mapping" className="space-y-4">
            <Card className="space-y-4 p-4">
              <div>
                <h2 className="font-semibold">Tabelle di codifica ufficiali</h2>
                <p className="text-sm text-muted-foreground">
                  Scaricate dal portale: nessun codice è scritto nel software.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {cargosTabelle.map((tabella) => {
                  const info = overview.data?.tabelle?.[tabella.id];
                  return (
                    <Button
                      key={tabella.id}
                      variant="outline"
                      size="sm"
                      onClick={() => refreshTabella.mutate(tabella.id)}
                      disabled={refreshTabella.isPending}
                    >
                      <Download className="size-4" />
                      <span className="ml-1">
                        {tabella.label}
                        {info ? ` · ${info.righe} righe` : " · vuota"}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </Card>

            <Card className="space-y-4 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-semibold">Mapping dei codici</h2>
                  <p className="text-sm text-muted-foreground">
                    Ogni sede, categoria e modalità di pagamento va associata al codice ufficiale corrispondente.
                  </p>
                </div>
                <Button onClick={() => saveMapping.mutate()} disabled={saveMapping.isPending}>
                  {saveMapping.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  <span className="ml-1">Salva mapping</span>
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {mappingRows.map((row) => (
                  <div key={row.key} className="space-y-1">
                    <Label htmlFor={row.key}>{row.label}</Label>
                    <Input
                      id={row.key}
                      value={mapping[row.key] ?? ""}
                      placeholder="codice ufficiale"
                      onChange={(e) => setMapping((prev) => ({ ...prev, [row.key]: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">{row.hint}</p>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminShell>
  );
}
