import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Eye, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import {
  damageComponentsQuery,
  damagePriceConfigQuery,
  damageSeveritiesQuery,
  damageTypesQuery,
  logAudit,
  onlyActive,
  vehicleCategoriesQuery,
} from "@/lib/gestionale";

type DraftCell = { min: string; rec: string; max: string };

const cellKey = (componentId: string, severityId: string) => `${componentId}|${severityId}`;

/**
 * Prezzario danni per categoria veicolo: griglia componenti × gravità con
 * range min/consigliato/max. L'azione "Copia su un'altra categoria" velocizza
 * la compilazione iniziale della flotta.
 */
export function DamagePriceGrid({ canWrite }: { canWrite: boolean }) {
  const queryClient = useQueryClient();
  const categories = useQuery(vehicleCategoriesQuery);
  const types = useQuery(damageTypesQuery);
  const components = useQuery(damageComponentsQuery);
  const severities = useQuery(damageSeveritiesQuery);
  const prices = useQuery(damagePriceConfigQuery);

  const activeCategories = onlyActive(categories.data);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [typeId, setTypeId] = useState<string | null>(null);
  const [copyTarget, setCopyTarget] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, DraftCell>>({});

  const currentCategoryId = categoryId ?? activeCategories[0]?.id ?? null;
  const typeList = onlyActive(types.data);
  const currentTypeId = typeId ?? typeList[0]?.id ?? null;
  const severityList = onlyActive(severities.data);
  const componentList = useMemo(
    () => onlyActive(components.data).filter((c) => c.damage_type_id === currentTypeId),
    [components.data, currentTypeId],
  );

  const priceFor = (componentId: string, severityId: string) =>
    (prices.data ?? []).find(
      (p) =>
        p.category_id === currentCategoryId &&
        p.component_id === componentId &&
        p.severity_id === severityId,
    ) ?? null;

  const draftOf = (componentId: string, severityId: string): DraftCell => {
    const key = cellKey(componentId, severityId);
    if (drafts[key]) return drafts[key]!;
    const existing = priceFor(componentId, severityId);
    return {
      min: existing ? String(Number(existing.prezzo_min)) : "",
      rec: existing ? String(Number(existing.prezzo_consigliato)) : "",
      max: existing ? String(Number(existing.prezzo_max)) : "",
    };
  };

  const setDraft = (componentId: string, severityId: string, patch: Partial<DraftCell>) => {
    const key = cellKey(componentId, severityId);
    const base = draftOf(componentId, severityId);
    setDrafts((prev) => ({ ...prev, [key]: { ...base, ...patch } }));
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!currentCategoryId) throw new Error("Seleziona una categoria");
      const rows = Object.entries(drafts)
        .map(([key, cell]) => {
          const [component_id, severity_id] = key.split("|") as [string, string];
          const min = Number(cell.min);
          const rec = Number(cell.rec);
          const max = Number(cell.max);
          if (!cell.min && !cell.rec && !cell.max) return null;
          if ([min, rec, max].some((n) => !Number.isFinite(n) || n < 0)) return null;
          if (min > max) throw new Error("Il prezzo minimo non può superare il massimo");
          return {
            category_id: currentCategoryId,
            component_id,
            severity_id,
            prezzo_min: min,
            prezzo_consigliato: rec,
            prezzo_max: max,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);
      if (rows.length === 0) throw new Error("Nessuna modifica da salvare");
      const { error } = await supabase
        .from("damage_price_config")
        .upsert(rows, { onConflict: "category_id,component_id,severity_id" });
      if (error) throw new Error(error.message);
      await logAudit("update", "damage_price_config", currentCategoryId);
      return rows.length;
    },
    onSuccess: async (count) => {
      toast.success(`Prezzario aggiornato (${count} voci)`);
      setDrafts({});
      await queryClient.invalidateQueries({ queryKey: damagePriceConfigQuery.queryKey });
    },
    onError: (e: Error) => toast.error("Salvataggio non riuscito", { description: e.message }),
  });

  const copy = useMutation({
    mutationFn: async () => {
      if (!currentCategoryId || !copyTarget) throw new Error("Scegli la categoria di destinazione");
      if (copyTarget === currentCategoryId) throw new Error("Le categorie sono uguali");
      const source = (prices.data ?? []).filter((p) => p.category_id === currentCategoryId);
      if (source.length === 0) throw new Error("La categoria di origine non ha prezzi configurati");
      const { error } = await supabase.from("damage_price_config").upsert(
        source.map((p) => ({
          category_id: copyTarget,
          component_id: p.component_id,
          severity_id: p.severity_id,
          prezzo_min: Number(p.prezzo_min),
          prezzo_consigliato: Number(p.prezzo_consigliato),
          prezzo_max: Number(p.prezzo_max),
        })),
        { onConflict: "category_id,component_id,severity_id" },
      );
      if (error) throw new Error(error.message);
      await logAudit("copy", "damage_price_config", copyTarget);
      return source.length;
    },
    onSuccess: async (count) => {
      toast.success(`Copiate ${count} voci sulla categoria selezionata`);
      await queryClient.invalidateQueries({ queryKey: damagePriceConfigQuery.queryKey });
    },
    onError: (e: Error) => toast.error("Copia non riuscita", { description: e.message }),
  });

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h2 className="font-display text-xl">Prezzario danni</h2>
        <p className="text-sm text-muted-foreground">
          Range di addebito per categoria veicolo, componente e gravità. In consegna e rientro
          l'operatore vede questo range: può uscirne motivando l'importo.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Categoria veicolo</Label>
          <Select
            value={currentCategoryId ?? ""}
            onValueChange={(v) => {
              setCategoryId(v);
              setDrafts({});
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              {activeCategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label_it}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Area</Label>
          <Select value={currentTypeId ?? ""} onValueChange={setTypeId}>
            <SelectTrigger>
              <SelectValue placeholder="Area" />
            </SelectTrigger>
            <SelectContent>
              {typeList.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.label_it}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Copia su categoria</Label>
          <Select value={copyTarget ?? ""} onValueChange={setCopyTarget}>
            <SelectTrigger>
              <SelectValue placeholder="Destinazione" />
            </SelectTrigger>
            <SelectContent>
              {activeCategories
                .filter((c) => c.id !== currentCategoryId)
                .map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label_it}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2">
          {canWrite ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                disabled={copy.isPending}
                onClick={() => copy.mutate()}
              >
                <Copy className="size-4" /> Copia
              </Button>
              <Button
                type="button"
                className="rounded-full"
                disabled={save.isPending || Object.keys(drafts).length === 0}
                onClick={() => save.mutate()}
              >
                <Save className="size-4" /> Salva
              </Button>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <Eye className="size-3.5" /> Sola lettura
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Componente</TableHead>
              {severityList.map((s) => (
                <TableHead key={s.id}>{s.label_it} (min / cons. / max)</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {componentList.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.label_it}</TableCell>
                {severityList.map((s) => {
                  const d = draftOf(c.id, s.id);
                  return (
                    <TableCell key={s.id}>
                      <div className="flex gap-1">
                        {(["min", "rec", "max"] as const).map((field) => (
                          <Input
                            key={field}
                            className="w-16"
                            type="number"
                            min={0}
                            step="1"
                            disabled={!canWrite}
                            aria-label={`${c.label_it} ${s.label_it} ${field}`}
                            value={d[field]}
                            onChange={(e) => setDraft(c.id, s.id, { [field]: e.target.value })}
                          />
                        ))}
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
            {componentList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={severityList.length + 1} className="text-muted-foreground">
                  Nessun componente per quest'area.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
