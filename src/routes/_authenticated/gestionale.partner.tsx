import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { AdminShell } from "@/components/gestionale/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { logAudit, partnersQuery, reservationsQuery } from "@/lib/gestionale";

export const Route = createFileRoute("/_authenticated/gestionale/partner")({
  component: PartnersPage,
});

function PartnersPage() {
  const queryClient = useQueryClient();
  const partners = useQuery(partnersQuery);
  const reservations = useQuery(reservationsQuery);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    company_name: "",
    vat_number: "",
    contact_name: "",
    email: "",
    phone: "",
    discount_pct: "0",
    notes: "",
  });

  const createPartner = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("partners").insert({
        company_name: form.company_name,
        vat_number: form.vat_number,
        contact_name: form.contact_name,
        email: form.email,
        phone: form.phone,
        discount_pct: Number(form.discount_pct) || 0,
        notes: form.notes || null,
        status: "in_valutazione",
      });
      if (error) throw new Error(error.message);
      await logAudit("create", "partner");
    },
    onSuccess: async () => {
      toast.success("Partner creato");
      setOpen(false);
      setForm({
        company_name: "",
        vat_number: "",
        contact_name: "",
        email: "",
        phone: "",
        discount_pct: "0",
        notes: "",
      });
      await queryClient.invalidateQueries({ queryKey: ["gestionale", "partners"] });
    },
    onError: (e: Error) => toast.error("Salvataggio non riuscito", { description: e.message }),
  });

  const rows = partners.data ?? [];

  return (
    <AdminShell
      section="partner"
      title="CRM Partner business"
      subtitle="Convenzioni aziendali, sconti negoziati e contratti collegati."
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full">
              <Plus className="size-4" /> Nuovo partner
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuovo partner business</DialogTitle>
              <DialogDescription>
                La convenzione parte in stato «in valutazione» fino all'approvazione.
              </DialogDescription>
            </DialogHeader>
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                createPartner.mutate();
              }}
            >
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="company">Ragione sociale</Label>
                <Input
                  id="company"
                  required
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vat">P.IVA</Label>
                <Input
                  id="vat"
                  value={form.vat_number}
                  onChange={(e) => setForm({ ...form, vat_number: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact">Referente</Label>
                <Input
                  id="contact"
                  value={form.contact_name}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-email">Email</Label>
                <Input
                  id="p-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-phone">Telefono</Label>
                <Input
                  id="p-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="discount">Sconto %</Label>
                <Input
                  id="discount"
                  type="number"
                  min={0}
                  max={60}
                  value={form.discount_pct}
                  onChange={(e) => setForm({ ...form, discount_pct: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="notes">Note</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <DialogFooter className="sm:col-span-2">
                <Button type="submit" disabled={createPartner.isPending} className="rounded-full">
                  Salva partner
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <Card className="overflow-hidden p-0 shadow-card">
        {partners.isPending ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Caricamento partner…</p>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Nessun partner in anagrafica — aggiungine uno con «Nuovo partner».
          </p>
        ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Azienda</TableHead>
              <TableHead>Referente</TableHead>
              <TableHead>Contatti</TableHead>
              <TableHead className="text-right">Sconto</TableHead>
              <TableHead className="text-right">Contratti</TableHead>
              <TableHead>Stato</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => {
              const count = (reservations.data ?? []).filter((r) => r.partner_id === p.id).length;
              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <span className="font-semibold">{p.company_name}</span>
                    <span className="block text-xs text-muted-foreground">
                      P.IVA {p.vat_number || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{p.contact_name || "—"}</TableCell>
                  <TableCell className="text-xs">
                    <span className="block">{p.email}</span>
                    <span className="block text-muted-foreground">{p.phone}</span>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{Number(p.discount_pct)}%</TableCell>
                  <TableCell className="text-right">{count}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "attivo" ? "default" : "secondary"}>
                      {p.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        )}
      </Card>
    </AdminShell>
  );
}
