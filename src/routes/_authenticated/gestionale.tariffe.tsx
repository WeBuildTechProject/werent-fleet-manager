import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { AdminShell } from "@/components/gestionale/admin-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  branchesQuery,
  formatEuro,
  logAudit,
  myRolesQuery,
  loyaltyTiersQuery,
  ratePlansQuery,
  vehicleCategoriesQuery,
} from "@/lib/gestionale";
import { hasCapability } from "@/lib/roles";
import { DamagePriceGrid } from "@/components/gestionale/damage-price-grid";
import { RevenueAssistant } from "@/components/gestionale/revenue-assistant";
import { insurancePackagesQuery } from "@/lib/gestionale";

export const Route = createFileRoute("/_authenticated/gestionale/tariffe")({
  component: PricingCatalogPage,
});

type FieldKind = "text" | "number" | "date" | "bool" | "select";

type FieldDef = {
  name: string;
  label: string;
  kind: FieldKind;
  options?: { value: string; label: string }[];
  step?: string;
  optional?: boolean;
};

type Row = Record<string, unknown>;

/** Tutti gli extra/coupon, anche disattivati: qui si amministra il catalogo. */
const allExtrasQuery = {
  queryKey: ["gestionale", "extras", "all"] as const,
  queryFn: async () => {
    const { data, error } = await supabase.from("extras").select("*").order("label_it");
    if (error) throw new Error(error.message);
    return (data ?? []) as Row[];
  },
};

const allCouponsQuery = {
  queryKey: ["gestionale", "coupons", "all"] as const,
  queryFn: async () => {
    const { data, error } = await supabase.from("coupons").select("*").order("code");
    if (error) throw new Error(error.message);
    return (data ?? []) as Row[];
  },
};

function CatalogEditor({
  title,
  description,
  table,
  fields,
  rows,
  columns,
  canWrite,
  invalidate,
}: {
  title: string;
  description: string;
  table:
    | "vehicle_categories"
    | "rate_plans"
    | "extras"
    | "coupons"
    | "insurance_packages"
    | "loyalty_tiers";
  fields: FieldDef[];
  rows: Row[];
  columns: { label: string; render: (row: Row) => React.ReactNode }[];
  canWrite: boolean;
  invalidate: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Row>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      const payload: Row = {};
      for (const f of fields) {
        const raw = draft[f.name];
        if (f.kind === "number") {
          const num = Number(raw);
          payload[f.name] = raw === "" || raw === undefined || raw === null
            ? f.optional
              ? null
              : 0
            : Number.isFinite(num)
              ? num
              : 0;
        } else if (f.kind === "bool") {
          payload[f.name] = Boolean(raw);
        } else {
          const value = (raw ?? "") as string;
          payload[f.name] = value === "" ? (f.optional ? null : "") : value;
        }
      }
      // Il payload è costruito dai descrittori di campo della singola tabella:
      // i tipi generati non modellano questa forma dinamica.
      const client = supabase.from(table) as unknown as {
        update: (p: Row) => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> };
        insert: (p: Row) => Promise<{ error: { message: string } | null }>;
      };
      const query = editingId
        ? client.update(payload).eq("id", editingId)
        : client.insert(payload);

      const { error } = await query;
      if (error) throw new Error(error.message);
      await logAudit(editingId ? "update" : "create", table, editingId ?? undefined);
    },
    onSuccess: async () => {
      toast.success("Catalogo aggiornato");
      setOpen(false);
      await invalidate();
    },
    onError: (e: Error) => toast.error("Salvataggio non riuscito", { description: e.message }),
  });

  function startEdit(row: Row | null) {
    setEditingId(row ? (row["id"] as string) : null);
    const next: Row = {};
    for (const f of fields) next[f.name] = row ? (row[f.name] ?? "") : f.kind === "bool" ? false : "";
    setDraft(next);
    setOpen(true);
  }

  return (
    <Card className="overflow-hidden p-0 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {canWrite ? (
          <Button size="sm" className="rounded-full" onClick={() => startEdit(null)}>
            <Plus className="size-4" /> Nuovo
          </Button>
        ) : null}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.label}>{c.label}</TableHead>
            ))}
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row["id"] as string}>
              {columns.map((c) => (
                <TableCell key={c.label} className="text-sm">
                  {c.render(row)}
                </TableCell>
              ))}
              <TableCell className="text-right">
                {canWrite ? (
                  <Button size="sm" variant="ghost" onClick={() => startEdit(row)}>
                    <Pencil className="size-4" /> Modifica
                  </Button>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Modifica" : "Nuovo"} · {title}
            </DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.name} className="space-y-1.5">
                <Label htmlFor={`${table}-${f.name}`}>{f.label}</Label>
                {f.kind === "bool" ? (
                  <div className="flex h-9 items-center gap-2">
                    <Checkbox
                      id={`${table}-${f.name}`}
                      checked={Boolean(draft[f.name])}
                      onCheckedChange={(v) => setDraft({ ...draft, [f.name]: v === true })}
                    />
                    <span className="text-sm text-muted-foreground">Attivo</span>
                  </div>
                ) : f.kind === "select" ? (
                  <Select
                    value={(draft[f.name] as string) || ""}
                    onValueChange={(v) => setDraft({ ...draft, [f.name]: v })}
                  >
                    <SelectTrigger id={`${table}-${f.name}`}>
                      <SelectValue placeholder="Seleziona" />
                    </SelectTrigger>
                    <SelectContent>
                      {(f.options ?? []).map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={`${table}-${f.name}`}
                    type={f.kind === "number" ? "number" : f.kind === "date" ? "date" : "text"}
                    step={f.step}
                    value={(draft[f.name] as string | number | undefined) ?? ""}
                    onChange={(e) => setDraft({ ...draft, [f.name]: e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
              Annulla
            </Button>
            <Button className="rounded-full" disabled={save.isPending} onClick={() => save.mutate()}>
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function PricingCatalogPage() {
  const queryClient = useQueryClient();
  const { data: roles } = useQuery(myRolesQuery);
  const canWrite = hasCapability(roles, "manage_pricing");

  const categories = useQuery(vehicleCategoriesQuery);
  const plans = useQuery(ratePlansQuery);
  const extras = useQuery(allExtrasQuery);
  const coupons = useQuery(allCouponsQuery);
  const branches = useQuery(branchesQuery);
  const insurancePackages = useQuery(insurancePackagesQuery);
  const loyaltyTiers = useQuery(loyaltyTiersQuery);


  const invalidate = async (key: readonly unknown[]) => {
    await queryClient.invalidateQueries({ queryKey: key });
  };

  // Nei form del catalogo si assegnano solo entità attive: le storiche restano
  // visibili nelle colonne e nella reportistica, non nelle nuove associazioni.
  const categoryOptions = (categories.data ?? [])
    .filter((c) => c.active)
    .map((c) => ({ value: c.id, label: c.label_it }));
  const branchOptions = [
    ...(branches.data ?? []).filter((b) => b.active).map((b) => ({ value: b.id, label: b.name })),
  ];
  const num = (row: Row, key: string) => Number(row[key] ?? 0);

  return (
    <AdminShell
      section="tariffe"
      title="Catalogo tariffario"
      subtitle="Categorie, listini, extra e coupon — modificabili direttamente dal gestionale"
    >
      {!canWrite ? (
        <p className="mb-4 rounded-lg border border-border bg-secondary/40 p-3 text-sm text-muted-foreground">
          Hai accesso in sola lettura al catalogo. Contatta un amministratore per aggiungere o
          modificare listini, extra, coupon, pacchetti assicurativi e prezzario danni.
        </p>
      ) : null}

      <Tabs defaultValue="categorie">
        <TabsList>
          <TabsTrigger value="categorie">Categorie</TabsTrigger>
          <TabsTrigger value="listini">Listini</TabsTrigger>
          <TabsTrigger value="extra">Extra</TabsTrigger>
          <TabsTrigger value="coupon">Coupon</TabsTrigger>
          <TabsTrigger value="assicurazioni">Assicurazioni</TabsTrigger>
          <TabsTrigger value="danni">Prezzario danni</TabsTrigger>
          <TabsTrigger value="fedelta">Programma fedeltà</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Assistant</TabsTrigger>
        </TabsList>

        <TabsContent value="categorie" className="mt-4">
          <CatalogEditor
            title="Categorie veicolo"
            description="Codice ACRISS, penali, politica km inclusi e prezzo carburante per litro."
            table="vehicle_categories"
            canWrite={canWrite}
            rows={(categories.data ?? []) as unknown as Row[]}
            invalidate={() => invalidate(vehicleCategoriesQuery.queryKey)}
            columns={[
              { label: "Codice", render: (r) => String(r["code"]) },
              { label: "Nome", render: (r) => String(r["label_it"]) },
              { label: "Classe", render: (r) => String(r["macro_class"]) },
              { label: "Km inclusi/g", render: (r) => `${num(r, "included_km_per_day")} km` },
              { label: "€/km extra", render: (r) => `${num(r, "extra_km_rate")} €` },
              { label: "€/litro", render: (r) => `${num(r, "fuel_price_per_liter")} €` },
            ]}
            fields={[
              { name: "code", label: "Codice ACRISS", kind: "text" },
              { name: "label_it", label: "Nome (IT)", kind: "text" },
              { name: "label_en", label: "Nome (EN)", kind: "text" },
              {
                name: "macro_class",
                label: "Classe",
                kind: "select",
                options: [
                  { value: "economy", label: "Economy" },
                  { value: "compact", label: "Compact" },
                  { value: "suv", label: "SUV" },
                  { value: "premium", label: "Premium" },
                  { value: "van", label: "Van" },
                ],
              },
              { name: "damage_penalty", label: "Penale danni (€)", kind: "number", step: "0.01" },
              { name: "theft_penalty", label: "Penale furto (€)", kind: "number", step: "0.01" },
              {
                name: "payment_mode",
                label: "Modalità pagamento",
                kind: "select",
                options: [
                  { value: "caparra", label: "Caparra" },
                  { value: "intero", label: "Intero" },
                  { value: "in_sede", label: "In sede" },
                ],
              },
              { name: "deposit_pct", label: "Caparra (%)", kind: "number", step: "1" },
              { name: "included_km_per_day", label: "Km inclusi al giorno", kind: "number", step: "1" },
              { name: "extra_km_rate", label: "Tariffa km extra (€)", kind: "number", step: "0.01" },
              {
                name: "fuel_price_per_liter",
                label: "Prezzo carburante (€/litro)",
                kind: "number",
                step: "0.01",
              },
              { name: "active", label: "Attivo", kind: "bool" },
            ]}
          />
        </TabsContent>

        <TabsContent value="listini" className="mt-4">
          <CatalogEditor
            title="Listini"
            description="Tariffa giornaliera e settimanale per categoria, sede e periodo di validità."
            table="rate_plans"
            canWrite={canWrite}
            rows={(plans.data ?? []) as unknown as Row[]}
            invalidate={() => invalidate(ratePlansQuery.queryKey)}
            columns={[
              { label: "Nome", render: (r) => String(r["name"]) },
              {
                label: "Categoria",
                render: (r) =>
                  categoryOptions.find((c) => c.value === r["category_id"])?.label ?? "—",
              },
              {
                label: "Sede",
                render: (r) => branchOptions.find((b) => b.value === r["branch_id"])?.label ?? "Tutte",
              },
              { label: "Giorno", render: (r) => formatEuro(num(r, "daily_rate")) },
              { label: "Validità", render: (r) => `${r["valid_from"]} → ${r["valid_to"]}` },
              {
                label: "Stato",
                render: (r) => (
                  <Badge variant={r["active"] ? "default" : "secondary"}>
                    {r["active"] ? "Attivo" : "Sospeso"}
                  </Badge>
                ),
              },
            ]}
            fields={[
              { name: "name", label: "Nome listino", kind: "text" },
              { name: "category_id", label: "Categoria", kind: "select", options: categoryOptions },
              {
                name: "branch_id",
                label: "Sede (vuoto = tutte)",
                kind: "select",
                options: branchOptions,
                optional: true,
              },
              { name: "daily_rate", label: "Tariffa giornaliera (€)", kind: "number", step: "0.01" },
              {
                name: "weekly_rate",
                label: "Tariffa settimanale (€)",
                kind: "number",
                step: "0.01",
                optional: true,
              },
              { name: "valid_from", label: "Valido dal", kind: "date" },
              { name: "valid_to", label: "Valido al", kind: "date" },
              {
                name: "included_km_per_day",
                label: "Km inclusi/giorno (vuoto = categoria)",
                kind: "number",
                step: "1",
                optional: true,
              },
              {
                name: "extra_km_rate",
                label: "€/km extra (vuoto = categoria)",
                kind: "number",
                step: "0.01",
                optional: true,
              },
              { name: "active", label: "Attivo", kind: "bool" },
            ]}
          />
        </TabsContent>

        <TabsContent value="extra" className="mt-4">
          <CatalogEditor
            title="Extra"
            description="Servizi aggiuntivi proposti nel flusso di prenotazione pubblico."
            table="extras"
            canWrite={canWrite}
            rows={extras.data ?? []}
            invalidate={() => invalidate(allExtrasQuery.queryKey)}
            columns={[
              { label: "Codice", render: (r) => String(r["code"]) },
              { label: "Nome", render: (r) => String(r["label_it"]) },
              { label: "Prezzo", render: (r) => formatEuro(num(r, "price_per_day")) },
              { label: "Tipo", render: (r) => String(r["price_type"]) },
              { label: "Qtà max", render: (r) => String(r["max_qty"]) },
              {
                label: "Stato",
                render: (r) => (
                  <Badge variant={r["active"] ? "default" : "secondary"}>
                    {r["active"] ? "Attivo" : "Sospeso"}
                  </Badge>
                ),
              },
            ]}
            fields={[
              { name: "code", label: "Codice", kind: "text" },
              { name: "label_it", label: "Nome (IT)", kind: "text" },
              { name: "label_en", label: "Nome (EN)", kind: "text" },
              { name: "price_per_day", label: "Prezzo (€)", kind: "number", step: "0.01" },
              {
                name: "price_type",
                label: "Tipo prezzo",
                kind: "select",
                options: [
                  { value: "per_giorno", label: "Per giorno" },
                  { value: "una_tantum", label: "Una tantum" },
                ],
              },
              { name: "max_qty", label: "Quantità massima", kind: "number", step: "1" },
              { name: "active", label: "Attivo", kind: "bool" },
            ]}
          />
        </TabsContent>

        <TabsContent value="coupon" className="mt-4">
          <CatalogEditor
            title="Coupon"
            description="Codici promozionali applicati automaticamente in fase di ricerca."
            table="coupons"
            canWrite={canWrite}
            rows={coupons.data ?? []}
            invalidate={() => invalidate(allCouponsQuery.queryKey)}
            columns={[
              { label: "Codice", render: (r) => String(r["code"]) },
              {
                label: "Sconto",
                render: (r) =>
                  r["discount_type"] === "percent"
                    ? `${num(r, "discount_value")}%`
                    : formatEuro(num(r, "discount_value")),
              },
              { label: "Validità", render: (r) => `${r["valid_from"]} → ${r["valid_to"]}` },
              {
                label: "Utilizzi",
                render: (r) => `${num(r, "used_count")}${r["max_uses"] ? ` / ${r["max_uses"]}` : ""}`,
              },
              {
                label: "Stato",
                render: (r) => (
                  <Badge variant={r["active"] ? "default" : "secondary"}>
                    {r["active"] ? "Attivo" : "Sospeso"}
                  </Badge>
                ),
              },
            ]}
            fields={[
              { name: "code", label: "Codice", kind: "text" },
              {
                name: "discount_type",
                label: "Tipo sconto",
                kind: "select",
                options: [
                  { value: "percent", label: "Percentuale" },
                  { value: "fixed", label: "Importo fisso" },
                ],
              },
              { name: "discount_value", label: "Valore", kind: "number", step: "0.01" },
              { name: "valid_from", label: "Valido dal", kind: "date" },
              { name: "valid_to", label: "Valido al", kind: "date" },
              {
                name: "max_uses",
                label: "Utilizzi massimi (vuoto = illimitati)",
                kind: "number",
                step: "1",
                optional: true,
              },
              { name: "active", label: "Attivo", kind: "bool" },
            ]}
          />
        </TabsContent>

        <TabsContent value="assicurazioni" className="mt-4">
          <CatalogEditor
            title="Pacchetti assicurativi"
            description="Pacchetti comparabili proposti al cliente: prezzo al giorno e franchigia residua. Vuoto in categoria = valido per tutte."
            table="insurance_packages"
            canWrite={canWrite}
            rows={(insurancePackages.data ?? []) as unknown as Row[]}
            invalidate={() => invalidate(insurancePackagesQuery.queryKey)}
            columns={[
              { label: "Nome", render: (r) => String(r["nome"]) },
              {
                label: "Categoria",
                render: (r) =>
                  categoryOptions.find((c) => c.value === r["category_id"])?.label ?? "Tutte",
              },
              { label: "€/giorno", render: (r) => formatEuro(num(r, "prezzo_giorno")) },
              {
                label: "Franchigia residua",
                render: (r) => formatEuro(num(r, "franchigia_residua")),
              },
              {
                label: "Stato",
                render: (r) => (
                  <Badge variant={r["active"] ? "default" : "secondary"}>
                    {r["active"] ? "Attivo" : "Sospeso"}
                  </Badge>
                ),
              },
            ]}
            fields={[
              { name: "nome", label: "Nome pacchetto", kind: "text" },
              { name: "descrizione", label: "Descrizione", kind: "text", optional: true },
              {
                name: "category_id",
                label: "Categoria (vuoto = tutte)",
                kind: "select",
                options: categoryOptions,
                optional: true,
              },
              { name: "prezzo_giorno", label: "Prezzo al giorno (€)", kind: "number", step: "0.01" },
              {
                name: "franchigia_residua",
                label: "Franchigia residua (€)",
                kind: "number",
                step: "0.01",
              },
              { name: "sort_order", label: "Ordine", kind: "number", step: "1" },
              { name: "active", label: "Attivo", kind: "bool" },
            ]}
          />
        </TabsContent>

        <TabsContent value="fedelta" className="mt-4">
          <CatalogEditor
            title="Programma fedeltà"
            description="Livelli per frequenza recente: il cliente raggiunge un livello con almeno N noleggi conclusi negli ultimi 12 mesi e ottiene lo sconto indicato, applicato automaticamente in prenotazione. Nessun saldo punti da gestire."
            table="loyalty_tiers"
            canWrite={canWrite}
            rows={(loyaltyTiers.data ?? []) as unknown as Row[]}
            invalidate={() => invalidate(loyaltyTiersQuery.queryKey)}
            columns={[
              { label: "Livello", render: (r) => String(r["nome"]) },
              {
                label: "Noleggi in 12 mesi",
                render: (r) => `≥ ${num(r, "soglia_noleggi_12_mesi")}`,
              },
              { label: "Sconto", render: (r) => `${num(r, "sconto_percentuale")}%` },
              { label: "Ordine", render: (r) => String(num(r, "sort_order")) },
              {
                label: "Stato",
                render: (r) => (
                  <Badge variant={r["active"] ? "default" : "secondary"}>
                    {r["active"] ? "Attivo" : "Sospeso"}
                  </Badge>
                ),
              },
            ]}
            fields={[
              { name: "nome", label: "Nome livello", kind: "text" },
              {
                name: "soglia_noleggi_12_mesi",
                label: "Noleggi conclusi minimi (ultimi 12 mesi)",
                kind: "number",
                step: "1",
              },
              { name: "sconto_percentuale", label: "Sconto %", kind: "number", step: "0.5" },
              { name: "sort_order", label: "Ordine", kind: "number", step: "1" },
              { name: "active", label: "Attivo", kind: "bool" },
            ]}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            Sconto fedeltà e coupon non si sommano: si applica automaticamente il più
            favorevole al cliente (regola configurabile in app_settings ·
            <span className="font-mono"> loyalty_stacking</span>).
          </p>
        </TabsContent>

        <TabsContent value="revenue" className="mt-4">
          <RevenueAssistant canWrite={canWrite} />
        </TabsContent>

        <TabsContent value="danni" className="mt-4">
          <DamagePriceGrid canWrite={canWrite} />
        </TabsContent>
      </Tabs>
    </AdminShell>
  );
}
