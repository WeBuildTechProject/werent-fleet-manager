import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDownRight, ArrowUpRight, Loader2, Minus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ratePlansQuery } from "@/lib/gestionale";
import { applyRateSuggestion, getRevenueOverview, type RevenueRow } from "@/lib/revenue.functions";

/**
 * Revenue Assistant: mostra l'occupazione prevista per categoria × sede e, solo
 * fuori soglia, un suggerimento di adeguamento con il relativo bottone.
 * Nessun adeguamento automatico: la scrittura avviene sul click dell'operatore.
 */
/** Formato con i centesimi: gli adeguamenti percentuali producono decimali. */
const euro2 = (v: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v);

export function RevenueAssistant({ canWrite }: { canWrite: boolean }) {
  const queryClient = useQueryClient();
  const fetchOverview = useServerFn(getRevenueOverview);
  const applyFn = useServerFn(applyRateSuggestion);

  const overview = useQuery({
    queryKey: ["gestionale", "revenue-overview"],
    queryFn: () => fetchOverview({ data: undefined }),
  });

  const apply = useMutation({
    mutationFn: (row: RevenueRow) =>
      applyFn({
        data: {
          planId: row.planId!,
          newDailyRate: row.suggestion!.suggestedRate,
          reason: `Occupazione prevista ${row.averagePct}% · ${row.categoryLabel}/${row.branchName}`,
        },
      }),
    onSuccess: async (res) => {
      toast.success(
        `Tariffa aggiornata da ${euro2(res.previous)} a ${euro2(res.next)} — modifica registrata nel log attività.`,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["gestionale", "revenue-overview"] }),
        queryClient.invalidateQueries({ queryKey: ratePlansQuery.queryKey }),
      ]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (overview.isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Calcolo occupazione prevista…
      </div>
    );
  }

  const data = overview.data;
  const rows = data?.rows ?? [];

  return (
    <Card className="p-4">
      <div className="mb-4">
        <h2 className="font-display text-lg font-bold">Revenue Assistant</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Occupazione prevista nei prossimi {data?.horizonDays ?? 14} giorni per categoria e sede.
          Sopra il {data?.settings.highThreshold}% viene suggerito un aumento di{" "}
          {data?.settings.increasePct}%, sotto il {data?.settings.lowThreshold}% una riduzione di{" "}
          {data?.settings.decreasePct}%. Le soglie sono configurabili nelle impostazioni
          (<span className="font-mono">revenue_*</span>) senza rilasci.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nessuna combinazione categoria/sede con veicoli assegnati.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Categoria / sede</TableHead>
              <TableHead>Flotta</TableHead>
              <TableHead>Occupazione media</TableHead>
              <TableHead>Picco</TableHead>
              <TableHead>Listino attivo</TableHead>
              <TableHead>Suggerimento</TableHead>
              <TableHead className="text-right">Azione</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const s = row.suggestion;
              return (
                <TableRow key={`${row.categoryId}-${row.branchId}`}>
                  <TableCell className="font-medium">
                    {row.categoryLabel}
                    <span className="text-muted-foreground"> · {row.branchName}</span>
                  </TableCell>
                  <TableCell>{row.fleetSize}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        s?.direction === "aumento"
                          ? "default"
                          : s?.direction === "riduzione"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {row.averagePct}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.peakPct}%</TableCell>
                  <TableCell className="text-sm">
                    {row.planId ? (
                      <>
                        {row.planName} · {euro2(row.currentDailyRate ?? 0)}
                        {row.planIsGlobal ? (
                          <span className="block text-xs text-muted-foreground">
                            listino valido per tutte le sedi
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-muted-foreground">nessun listino attivo</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {s ? (
                      <span className="flex items-center gap-1">
                        {s.direction === "aumento" ? (
                          <ArrowUpRight className="size-4 text-primary" />
                        ) : (
                          <ArrowDownRight className="size-4 text-muted-foreground" />
                        )}
                        {s.deltaPct > 0 ? "+" : ""}
                        {s.deltaPct}% — da {euro2(s.currentRate)} a {euro2(s.suggestedRate)}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Minus className="size-4" /> tariffa adeguata
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {s && row.planId ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canWrite || apply.isPending}
                        onClick={() => apply.mutate(row)}
                      >
                        Applica
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        Il suggerimento è una regola a soglie, non una previsione: resta sempre una proposta e
        nessuna tariffa cambia senza il click su “Applica”. Ogni applicazione è registrata nel log
        attività con valore precedente e nuovo.
      </p>
    </Card>
  );
}
