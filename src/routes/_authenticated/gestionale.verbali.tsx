import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { AlertTriangle, FileCheck2, Loader2, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";

import { AdminShell } from "@/components/gestionale/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { branchesQuery } from "@/lib/gestionale";
import { getVerbaliCommunications, retryVerbaleCommunication } from "@/lib/verbali.functions";

export const Route = createFileRoute("/_authenticated/gestionale/verbali")({
  head: () => ({ meta: [
    { title: "Verbali e comunicazioni | Gestionale We Rent" },
    { name: "description", content: "Controlla lo stato dei verbali firmati e delle comunicazioni email delle prenotazioni." },
    { property: "og:title", content: "Verbali e comunicazioni | Gestionale We Rent" },
    { property: "og:description", content: "Controlla lo stato dei verbali firmati e delle comunicazioni email delle prenotazioni." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: VerbaliPage,
});

const stateLabel: Record<string, string> = { inviata: "Inviata", fallita: "Fallita", in_coda: "In coda" };

function VerbaliPage() {
  const client = useQueryClient();
  const fetchRows = useServerFn(getVerbaliCommunications);
  const retry = useServerFn(retryVerbaleCommunication);
  const rows = useQuery({ queryKey: ["gestionale", "verbali-comunicazioni"], queryFn: () => fetchRows() });
  const branches = useQuery(branchesQuery);
  const [reservationFilter, setReservationFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => (rows.data ?? []).filter((row) => {
    const reservationTerm = reservationFilter.toLowerCase();
    const reservationMatch = !reservationTerm || [row.reservation_code, row.riferimento_id]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(reservationTerm));
    const branchMatch = branchFilter === "all" || row.branch_id === branchFilter;
    return reservationMatch && branchMatch && (statusFilter === "all" || row.stato === statusFilter);
  }), [rows.data, reservationFilter, branchFilter, statusFilter]);

  const retryMutation = useMutation({
    mutationFn: (notificationId: string) => retry({ data: { notificationId } }),
    onSuccess: async () => { toast.success("Verbale rigenerato e comunicazione reinviata"); await client.invalidateQueries({ queryKey: ["gestionale", "verbali-comunicazioni"] }); },
    onError: (error: Error) => toast.error("Operazione non riuscita", { description: error.message }),
  });

  return (
    <AdminShell section="verbali" title="Verbali e comunicazioni" subtitle="Controllo dei verbali firmati e delle email collegate alle prenotazioni">
      <Card className="mb-5 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input className="max-w-xs" placeholder="Filtra codice prenotazione" value={reservationFilter} onChange={(event) => setReservationFilter(event.target.value)} />
          <Select value={branchFilter} onValueChange={setBranchFilter}><SelectTrigger className="w-56"><SelectValue placeholder="Sede" /></SelectTrigger><SelectContent><SelectItem value="all">Tutte le sedi</SelectItem>{(branches.data ?? []).map((branch) => <SelectItem key={branch.id} value={branch.id}>{branch.name}</SelectItem>)}</SelectContent></Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-40"><SelectValue placeholder="Stato" /></SelectTrigger><SelectContent><SelectItem value="all">Tutti gli stati</SelectItem><SelectItem value="inviata">Inviata</SelectItem><SelectItem value="in_coda">In coda</SelectItem><SelectItem value="fallita">Fallita</SelectItem></SelectContent></Select>
          <span className="ml-auto text-sm text-muted-foreground">{filtered.length} comunicazioni</span>
        </div>
      </Card>
      {rows.isLoading ? <Card className="flex items-center gap-2 p-8 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Caricamento…</Card> : rows.error ? <Card className="p-8 text-sm text-destructive">{(rows.error as Error).message}</Card> : filtered.length === 0 ? <Card className="p-8 text-center text-sm text-muted-foreground">Nessun verbale o invio corrisponde ai filtri.</Card> : (
        <Card>
          <Table><TableHeader><TableRow><TableHead>Verbale</TableHead><TableHead>Prenotazione</TableHead><TableHead>Sede</TableHead><TableHead>Destinatario</TableHead><TableHead>Stato</TableHead><TableHead>Ultimo evento</TableHead><TableHead className="text-right">Azione</TableHead></TableRow></TableHeader><TableBody>{filtered.map((row) => { const failed = row.stato === "fallita"; return <TableRow key={row.id}><TableCell><div className="flex items-center gap-2 font-medium"><FileCheck2 className="size-4 text-primary" />{row.tipo === "verbale_consegna" ? "Consegna" : "Rientro"}</div><p className="mt-1 text-xs text-muted-foreground">{row.canale}</p></TableCell><TableCell className="font-mono text-xs">{row.reservation_code ?? row.riferimento_id ?? "—"}</TableCell><TableCell>{row.branch_name ?? "—"}</TableCell><TableCell>{row.destinatario_email ?? "—"}</TableCell><TableCell><Badge variant={failed ? "destructive" : row.stato === "inviata" ? "secondary" : "outline"}>{failed ? <AlertTriangle className="mr-1 size-3" /> : null}{stateLabel[row.stato] ?? row.stato}</Badge>{failed && row.errore ? <p className="mt-1 max-w-xs text-xs text-destructive">{row.errore}</p> : null}</TableCell><TableCell className="text-sm text-muted-foreground">{row.sent_at ? new Date(row.sent_at).toLocaleString("it-IT") : new Date(row.scheduled_for).toLocaleString("it-IT")}</TableCell><TableCell className="text-right">{failed || row.stato === "in_coda" ? <Button size="sm" variant="outline" disabled={retryMutation.isPending} onClick={() => retryMutation.mutate(row.id)}><RefreshCw className="size-4" /> Rigenera e reinvia</Button> : <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Send className="size-3" /> Consegnata</span>}</TableCell></TableRow>; })}</TableBody></Table>
        </Card>
      )}
    </AdminShell>
  );
}
