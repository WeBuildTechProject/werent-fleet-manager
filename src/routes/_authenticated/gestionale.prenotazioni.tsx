import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Download, Plus, Search } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { hasCapability } from "@/lib/roles";
import {
  myRolesQuery,
  branchesQuery,
  daysBetween,
  formatEuro,
  logAudit,
  partnersQuery,
  paymentsQuery,
  damagesQuery,
  ratePlansQuery,
  reservationStatusLabels,
  vehicleCategoriesQuery,
  reservationsQuery,
  vehiclesQuery,
} from "@/lib/gestionale";
import { registerManualPayment } from "@/lib/payments.functions";
import { HandoverDialog } from "@/components/gestionale/handover-dialog";
import { ReservationDocumentsDialog } from "@/components/gestionale/reservation-documents-dialog";
import { VerbaliDownload } from "@/components/verbali-download";
import { computePrice, pickRatePlan } from "@/lib/pricing";
import {
  InsurancePackagePicker,
  type InsuranceCatalog,
} from "@/components/booking/insurance-packages";
import {
  insurancePackageComponentsQuery,
  insurancePackagesQuery,
  insuranceSpecsQuery,
  onlyActive,
} from "@/lib/gestionale";

export const Route = createFileRoute("/_authenticated/gestionale/prenotazioni")({
  // `q` arriva dalla ricerca globale in topbar e preimposta il filtro elenco.
  validateSearch: (search: Record<string, unknown>): { q?: string } =>
    typeof search['q'] === "string" ? { q: search['q'] as string } : {},
  component: ReservationsPage,
});

const steps = [
  "Cliente",
  "Periodo e sedi",
  "Veicolo",
  "Tariffa",
  "Extra e note",
  "Conferma",
] as const;

const today = new Date().toISOString().slice(0, 10);

function ReservationsPage() {
  const queryClient = useQueryClient();
  const { data: myRoles } = useQuery(myRolesQuery);
  const canWrite = hasCapability(myRoles, "write_reservations");
  const canViewDocuments = hasCapability(myRoles, "view_sensitive_docs");
  const reservations = useQuery(reservationsQuery);
  const vehicles = useQuery(vehiclesQuery);
  const branches = useQuery(branchesQuery);
  const partners = useQuery(partnersQuery);
  const ratePlans = useQuery(ratePlansQuery);
  const payments = useQuery(paymentsQuery);
  const categories = useQuery(vehicleCategoriesQuery);
  const damages = useQuery(damagesQuery);
  const insurancePackages = useQuery(insurancePackagesQuery);
  const insuranceSpecs = useQuery(insuranceSpecsQuery);
  const insuranceComponents = useQuery(insurancePackageComponentsQuery);
  const [insurancePackageId, setInsurancePackageId] = useState<string | null>(null);

  /** Consegna/rientro: pannello aperto sulla prenotazione selezionata. */
  const [handover, setHandover] = useState<{ id: string; mode: "checkout" | "checkin" } | null>(null);
  const [documentsFor, setDocumentsFor] = useState<{ id: string; code: string } | null>(null);

  async function refreshAfterHandover() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["gestionale", "reservations"] }),
      queryClient.invalidateQueries({ queryKey: ["gestionale", "vehicles"] }),
      queryClient.invalidateQueries({ queryKey: ["gestionale", "damages"] }),
    ]);
  }

  const runManualPayment = useServerFn(registerManualPayment);
  const collectBalance = useMutation({
    mutationFn: (input: { reservationId: string; amount: number }) =>
      runManualPayment({
        data: { reservationId: input.reservationId, amount: input.amount, type: "saldo", notes: "Saldo incassato al ritiro" },
      }),
    onSuccess: async () => {
      toast.success("Saldo registrato");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["gestionale", "payments"] }),
        queryClient.invalidateQueries({ queryKey: ["gestionale", "reservations"] }),
      ]);
    },
    onError: (e: Error) => toast.error("Registrazione non riuscita", { description: e.message }),
  });

  /** Incassato = somma dei pagamenti riusciti (Stripe o in sede). */
  const paidByReservation = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of payments.data ?? []) {
      if (p.status !== "succeeded") continue;
      map.set(p.reservation_id, (map.get(p.reservation_id) ?? 0) + Number(p.amount));
    }
    return map;
  }, [payments.data]);

  const { q: initialQ } = Route.useSearch();
  const [q, setQ] = useState(initialQ ?? "");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    date_from: today,
    date_to: today,
    pickup_branch_id: "",
    dropoff_branch_id: "",
    vehicle_id: "",
    daily_rate: "",
    partner_id: "",
    notes: "",
  });

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (reservations.data ?? []).filter((r) => {
      const matchesTerm =
        !term ||
        r.code.toLowerCase().includes(term) ||
        r.customer_name.toLowerCase().includes(term) ||
        (r.customer_email ?? "").toLowerCase().includes(term);
      return matchesTerm && (status === "all" || r.status === status);
    });
  }, [reservations.data, q, status]);

  const days = Math.max(1, daysBetween(form.date_from, form.date_to));
  const discount = Number(
    (partners.data ?? []).find((p) => p.id === form.partner_id)?.discount_pct ?? 0,
  );
  // Prezzo calcolato dal motore condiviso con il flusso pubblico (src/lib/pricing.ts):
  // listino attivo per categoria/sede/periodo, poi fallback sulla tariffa manuale.
  const selectedVehicle = (vehicles.data ?? []).find((v) => v.id === form.vehicle_id);
  const manualRate = Number(form.daily_rate) || 0;
  const plan = pickRatePlan(
    ratePlans.data ?? [],
    selectedVehicle?.category_id ?? null,
    form.pickup_branch_id || null,
    form.date_from,
  );
  // Solo i pacchetti attivi sono proponibili in sede: quelli storici restano
  // leggibili sulle prenotazioni passate ma non si possono più vendere.
  const insuranceCatalog: InsuranceCatalog = {
    packages: onlyActive(insurancePackages.data),
    specs: onlyActive(insuranceSpecs.data),
    components: insuranceComponents.data ?? [],
  };
  const insurancePkg =
    insuranceCatalog.packages.find((p) => p.id === insurancePackageId) ?? null;

  const priceBreakdown = computePrice({
    days,
    fallbackDailyRate: manualRate || Number(selectedVehicle?.daily_rate ?? 0),
    ratePlan: manualRate ? null : plan,
    partnerDiscountPct: discount,
    insurancePackage: insurancePkg,
  });
  const rate = priceBreakdown.dailyRate;
  const total = priceBreakdown.total;

  const create = useMutation({
    mutationFn: async () => {
      const code = `WR-${Date.now().toString().slice(-6)}`;
      const dropoff = (branches.data ?? []).find((b) => b.id === form.dropoff_branch_id);
      const extraNote = [
        form.notes,
        dropoff && dropoff.id !== form.pickup_branch_id ? `Riconsegna: ${dropoff.name}` : "",
        `Tariffa giornaliera: ${rate} €`,
        insurancePkg ? `Copertura: ${insurancePkg.nome}` : "",
      ]
        .filter(Boolean)
        .join(" · ");
      const { error } = await supabase.from("reservations").insert({
        code,
        customer_name: form.customer_name,
        customer_email: form.customer_email,
        customer_phone: form.customer_phone,
        vehicle_id: form.vehicle_id || null,
        branch_id: form.pickup_branch_id || null,
        partner_id: form.partner_id || null,
        date_from: form.date_from,
        date_to: form.date_to,
        total_amount: total,
        insurance_package_id: insurancePkg?.id ?? null,
        insurance_amount: priceBreakdown.insuranceTotal,
        status: "confermata",
        notes: extraNote,
      });
      if (error) throw new Error(error.message);
      await logAudit("create", "reservation");
    },
    onSuccess: async () => {
      toast.success("Prenotazione creata");
      setOpen(false);
      setStep(0);
      await queryClient.invalidateQueries({ queryKey: ["gestionale", "reservations"] });
    },
    onError: (e: Error) => toast.error("Creazione non riuscita", { description: e.message }),
  });

  function exportCsv() {
    const header = "codice;cliente;dal;al;stato;totale\n";
    const body = rows
      .map((r) => [r.code, r.customer_name, r.date_from, r.date_to, r.status, r.total_amount].join(";"))
      .join("\n");
    const url = URL.createObjectURL(new Blob([header + body], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "prenotazioni-werent.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AdminShell
      section="prenotazioni"
      title="Prenotazioni e contratti"
      subtitle={
        reservations.isPending
          ? "Caricamento prenotazioni…"
          : `${rows.length} record · wizard in 6 passaggi per apertura contratto`
      }
      actions={
        <>
          <Button size="sm" variant="outline" className="rounded-full" onClick={exportCsv}>
            <Download className="size-4" /> Esporta CSV
          </Button>
          {canWrite ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-full">
                <Plus className="size-4" /> Nuova prenotazione
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  Passo {step + 1} di {steps.length} — {steps[step]}
                </DialogTitle>
                <DialogDescription>
                  Compila i dati del contratto; il totale si aggiorna in tempo reale.
                </DialogDescription>
              </DialogHeader>

              <div className="flex gap-1">
                {steps.map((s, i) => (
                  <span
                    key={s}
                    className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-secondary"}`}
                  />
                ))}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {step === 0 ? (
                  <>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="cn">Cliente</Label>
                      <Input
                        id="cn"
                        value={form.customer_name}
                        onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ce">Email</Label>
                      <Input
                        id="ce"
                        type="email"
                        value={form.customer_email}
                        onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cp">Telefono</Label>
                      <Input
                        id="cp"
                        value={form.customer_phone}
                        onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                      />
                    </div>
                  </>
                ) : null}

                {step === 1 ? (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="df">Ritiro</Label>
                      <Input
                        id="df"
                        type="date"
                        value={form.date_from}
                        onChange={(e) => setForm({ ...form, date_from: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="dt">Riconsegna</Label>
                      <Input
                        id="dt"
                        type="date"
                        value={form.date_to}
                        onChange={(e) => setForm({ ...form, date_to: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Sede di ritiro</Label>
                      <Select
                        value={form.pickup_branch_id}
                        onValueChange={(v) => setForm({ ...form, pickup_branch_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona" />
                        </SelectTrigger>
                        <SelectContent>
                          {onlyActive(branches.data).map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Sede di riconsegna</Label>
                      <Select
                        value={form.dropoff_branch_id}
                        onValueChange={(v) => setForm({ ...form, dropoff_branch_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Come ritiro" />
                        </SelectTrigger>
                        <SelectContent>
                          {onlyActive(branches.data).map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : null}

                {step === 2 ? (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Veicolo</Label>
                    <Select
                      value={form.vehicle_id}
                      onValueChange={(v) => {
                        const vehicle = (vehicles.data ?? []).find((x) => x.id === v);
                        setForm({
                          ...form,
                          vehicle_id: v,
                          daily_rate: vehicle ? String(vehicle.daily_rate) : form.daily_rate,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona veicolo" />
                      </SelectTrigger>
                      <SelectContent>
                        {(vehicles.data ?? [])
                          .filter((v) => v.status !== "dismesso")
                          .map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.model} · {v.plate} · {formatEuro(Number(v.daily_rate))}/g
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                {step === 3 ? (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="dr">Tariffa giornaliera (€)</Label>
                      <Input
                        id="dr"
                        type="number"
                        min={0}
                        value={form.daily_rate}
                        onChange={(e) => setForm({ ...form, daily_rate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Convenzione partner</Label>
                      <Select
                        value={form.partner_id}
                        onValueChange={(v) => setForm({ ...form, partner_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Nessuna" />
                        </SelectTrigger>
                        <SelectContent>
                          {(partners.data ?? []).map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.company_name} (−{Number(p.discount_pct)}%)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : null}

                {step === 4 ? (
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Copertura assicurativa</Label>
                    <InsurancePackagePicker
                      catalog={insuranceCatalog}
                      categoryId={selectedVehicle?.category_id ?? null}
                      days={days}
                      selectedId={insurancePackageId}
                      onSelect={setInsurancePackageId}
                    />
                  </div>
                ) : null}

                {step === 4 ? (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="nt">Note operative</Label>
                    <Input
                      id="nt"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="Seggiolino, secondo conducente, consegna in aeroporto…"
                    />
                  </div>
                ) : null}

                {step === 5 ? (
                  <div className="sm:col-span-2 space-y-2 rounded-lg border border-border bg-secondary/40 p-4 text-sm">
                    <p className="font-semibold">{form.customer_name || "Cliente da inserire"}</p>
                    <p className="text-muted-foreground">
                      {form.date_from} → {form.date_to} · {days} giorni
                    </p>
                    <p className="text-muted-foreground">
                      {(vehicles.data ?? []).find((v) => v.id === form.vehicle_id)?.model ??
                        "Veicolo non assegnato"}
                    </p>
                    {insurancePkg ? (
                      <p className="text-muted-foreground">
                        Copertura {insurancePkg.nome} ·{" "}
                        {formatEuro(priceBreakdown.insuranceTotal)}
                      </p>
                    ) : null}
                    <p className="font-display text-2xl">{formatEuro(total)}</p>
                    {discount ? (
                      <p className="text-xs text-muted-foreground">Sconto convenzione −{discount}%</p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <DialogFooter className="justify-between sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  disabled={step === 0}
                  onClick={() => setStep((s) => s - 1)}
                >
                  Indietro
                </Button>
                {step < steps.length - 1 ? (
                  <Button type="button" className="rounded-full" onClick={() => setStep((s) => s + 1)}>
                    Avanti
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="rounded-full"
                    disabled={create.isPending || !form.customer_name}
                    onClick={() => create.mutate()}
                  >
                    Conferma prenotazione
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
          ) : null}
        </>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-64 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca per codice, cliente o email"
            className="pl-9"
            aria-label="Cerca prenotazioni"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            {Object.entries(reservationStatusLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden p-0 shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Codice</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Veicolo</TableHead>
              <TableHead>Periodo</TableHead>
              <TableHead className="text-right">Totale</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead className="text-right">Incassato</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const vehicle = (vehicles.data ?? []).find((v) => v.id === r.vehicle_id);
              const paid = paidByReservation.get(r.id) ?? 0;
              const residual = Math.round((Number(r.total_amount) - paid) * 100) / 100;
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.code}</TableCell>
                  <TableCell>
                    <span className="font-semibold">{r.customer_name}</span>
                    <span className="block text-xs text-muted-foreground">{r.customer_email}</span>
                  </TableCell>
                  <TableCell className="text-sm">{vehicle?.model ?? "—"}</TableCell>
                  <TableCell className="text-sm">
                    {r.date_from} → {r.date_to}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatEuro(Number(r.total_amount))}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        r.status === "in_corso"
                          ? "default"
                          : r.status === "annullata"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {reservationStatusLabels[r.status] ?? r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {formatEuro(paid)}
                    {residual > 0 ? (
                      <span className="block text-xs text-muted-foreground">
                        saldo {formatEuro(residual)}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    {r.verbale_consegna_url || r.verbale_rientro_url ? (
                      <span className="mr-2 inline-flex align-middle">
                        <VerbaliDownload
                          reservationId={r.id}
                          hasConsegna={Boolean(r.verbale_consegna_url)}
                          hasRientro={Boolean(r.verbale_rientro_url)}
                        />
                      </span>
                    ) : null}
                    {canViewDocuments ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mr-2 rounded-full"
                        onClick={() => setDocumentsFor({ id: r.id, code: r.code })}
                      >
                        Documenti
                      </Button>
                    ) : null}
                    {canWrite && r.status === "confermata" ? (
                      <Button
                        size="sm"
                        className="mr-2 rounded-full"
                        onClick={() => setHandover({ id: r.id, mode: "checkout" })}
                      >
                        Consegna veicolo
                      </Button>
                    ) : null}
                    {canWrite && r.status === "in_corso" ? (
                      <Button
                        size="sm"
                        className="mr-2 rounded-full"
                        onClick={() => setHandover({ id: r.id, mode: "checkin" })}
                      >
                        Rientro veicolo
                      </Button>
                    ) : null}
                    {canWrite && residual > 0 && r.status !== "annullata" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={collectBalance.isPending}
                        onClick={() =>
                          collectBalance.mutate({ reservationId: r.id, amount: residual })
                        }
                      >
                        Registra saldo incassato
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {handover
        ? (() => {
            const reservation = (reservations.data ?? []).find((r) => r.id === handover.id);
            if (!reservation) return null;
            const vehicle = (vehicles.data ?? []).find((v) => v.id === reservation.vehicle_id);
            return (
              <HandoverDialog
                mode={handover.mode}
                reservation={reservation}
                vehicle={vehicle}
                category={(categories.data ?? []).find((c) => c.id === vehicle?.category_id)}
                ratePlans={ratePlans.data ?? []}
                existingDamages={(damages.data ?? []).filter((d) => d.vehicle_id === vehicle?.id)}
                open
                onOpenChange={(next) => {
                  if (!next) setHandover(null);
                }}
                onDone={refreshAfterHandover}
              />
            );
          })()
        : null}

      {canViewDocuments && documentsFor ? (
        <ReservationDocumentsDialog
          reservationId={documentsFor.id}
          code={documentsFor.code}
          open
          onOpenChange={(next) => {
            if (!next) setDocumentsFor(null);
          }}
        />
      ) : null}
    </AdminShell>
  );
}
