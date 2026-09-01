import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useMemo, useState } from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { AdminShell } from "@/components/gestionale/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import {
  formatDate,
  formatEuro,
  logAudit,
  myRolesQuery,
  reservationStatusLabels,
  reservationsQuery,
} from "@/lib/gestionale";
import { hasCapability } from "@/lib/roles";

export const Route = createFileRoute("/_authenticated/gestionale/clienti")({
  // `q` arriva dalla ricerca globale in topbar e preimposta il filtro elenco.
  validateSearch: (search: Record<string, unknown>): { q?: string } =>
    typeof search['q'] === "string" ? { q: search['q'] as string } : {},
  component: CustomersPage,
});

type Customer = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  fiscal_code: string;
  driving_license_number: string;
  driving_license_expiry: string | null;
  address: string;
  blacklisted: boolean;
  blacklist_reason: string | null;
  created_at: string;
};

const customersQuery = {
  queryKey: ["gestionale", "customers"] as const,
  queryFn: async (): Promise<Customer[]> => {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Customer[];
  },
};

function CustomersPage() {
  const queryClient = useQueryClient();
  const customers = useQuery(customersQuery);
  const reservations = useQuery(reservationsQuery);
  const { data: roles } = useQuery(myRolesQuery);
  const canBlacklist = hasCapability(roles, "manage_blacklist");

  const { q: initialQ } = Route.useSearch();
  const [q, setQ] = useState(initialQ ?? "");
  const [openId, setOpenId] = useState<string | null>(null);

  const term = q.trim().toLowerCase();
  const rows = useMemo(
    () =>
      (customers.data ?? []).filter(
        (c) =>
          !term ||
          c.full_name.toLowerCase().includes(term) ||
          c.email.toLowerCase().includes(term) ||
          c.phone.toLowerCase().includes(term) ||
          c.fiscal_code.toLowerCase().includes(term),
      ),
    [customers.data, term],
  );

  /**
   * Storico collegato all'anagrafica tramite customer_id; il confronto per
   * email resta solo come fallback per le prenotazioni create prima del
   * collegamento (customer_id nullo).
   */
  const historyFor = (c: Customer) =>
    (reservations.data ?? []).filter((r) =>
      r.customer_id
        ? r.customer_id === c.id
        : r.customer_email.trim().toLowerCase() === c.email.trim().toLowerCase(),
    );

  const toggleBlacklist = useMutation({
    mutationFn: async (customer: Customer) => {
      const next = !customer.blacklisted;
      const { error } = await supabase
        .from("customers")
        .update({
          blacklisted: next,
          blacklist_reason: next ? (customer.blacklist_reason ?? "Segnalato dallo staff") : null,
        })
        .eq("id", customer.id);
      if (error) throw new Error(error.message);
      await logAudit(next ? "blacklist_add" : "blacklist_remove", "customers", customer.id);
      return next;
    },
    onSuccess: (next) => {
      queryClient.invalidateQueries({ queryKey: customersQuery.queryKey });
      toast.success(next ? "Cliente inserito in blacklist" : "Cliente rimosso dalla blacklist");
    },
    onError: (e: Error) => toast.error("Operazione non riuscita", { description: e.message }),
  });

  return (
    <AdminShell
      section="clienti"
      title="CRM Clienti"
      subtitle={`${rows.length} clienti in anagrafica · storico noleggi e blacklist`}
      actions={
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nome, email, telefono o CF"
          className="w-64"
          aria-label="Cerca cliente"
        />
      }
    >
      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Contatti</TableHead>
              <TableHead>Patente</TableHead>
              <TableHead>Noleggi</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => {
              const history = historyFor(c);
              const spent = history.reduce((sum, r) => sum + Number(r.total_amount || 0), 0);
              return (
                <Fragment key={c.id}>
                  <TableRow>
                    <TableCell className="font-semibold">{c.full_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.email}
                      <br />
                      {c.phone}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.driving_license_number || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {history.length} · {formatEuro(spent)}
                    </TableCell>
                    <TableCell>
                      {c.blacklisted ? (
                        <Badge variant="destructive">Blacklist</Badge>
                      ) : (
                        <Badge variant="secondary">Regolare</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setOpenId(openId === c.id ? null : c.id)}
                        >
                          {openId === c.id ? "Chiudi" : "Storico"}
                        </Button>
                        {canBlacklist ? (
                          <Button
                            size="sm"
                            variant={c.blacklisted ? "secondary" : "destructive"}
                            disabled={toggleBlacklist.isPending}
                            onClick={() => toggleBlacklist.mutate(c)}
                          >
                            {c.blacklisted ? (
                              <ShieldCheck className="size-4" />
                            ) : (
                              <ShieldAlert className="size-4" />
                            )}
                            {c.blacklisted ? "Riabilita" : "Blacklist"}
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                  {openId === c.id ? (
                    <TableRow key={`${c.id}-history`} className="bg-muted/40">
                      <TableCell colSpan={6}>
                        {history.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Nessun noleggio registrato per questo cliente.
                          </p>
                        ) : (
                          <ul className="space-y-1 text-sm">
                            {history.map((r) => (
                              <li key={r.id} className="flex flex-wrap gap-x-3">
                                <span className="font-mono font-semibold">{r.code}</span>
                                <span className="text-muted-foreground">
                                  {formatDate(r.date_from)} → {formatDate(r.date_to)}
                                </span>
                                <span>{reservationStatusLabels[r.status] ?? r.status}</span>
                                <span className="font-semibold">
                                  {formatEuro(Number(r.total_amount))}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              );
            })}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  Nessun cliente trovato.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Card>
    </AdminShell>
  );
}
