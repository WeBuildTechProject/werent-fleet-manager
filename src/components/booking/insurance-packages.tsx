import { Check, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  insuranceSpecTypeLabels,
  isMonetarySpec,
  pickInsurancePackages,
  specValueInPackage,
  type InsurancePackage,
  type InsurancePackageComponent,
  type InsuranceSpec,
} from "@/lib/pricing";

const euro = (value: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(
    value,
  );

export type InsuranceCatalog = {
  packages: InsurancePackage[];
  specs: InsuranceSpec[];
  components: InsurancePackageComponent[];
};

/** Righe "cosa include" di un pacchetto, risolvendo override e default. */
export function packageIncludes(pkg: InsurancePackage, catalog: InsuranceCatalog) {
  const links = catalog.components.filter((c) => c.insurance_package_id === pkg.id);
  return links
    .map((link) => {
      const spec = catalog.specs.find((s) => s.id === link.insurance_spec_id);
      if (!spec) return null;
      const value = specValueInPackage(spec, link);
      return {
        id: spec.id,
        label: insuranceSpecTypeLabels[spec.tipo] ?? spec.label_it,
        value,
        detail: isMonetarySpec(spec.tipo)
          ? value === 0
            ? "azzerata"
            : euro(value)
          : "incluso",
      };
    })
    .filter((x): x is { id: string; label: string; value: number; detail: string } => x !== null);
}

/**
 * Confronto a schede tra i pacchetti assicurativi attivi. Condiviso dal flusso
 * pubblico /prenota e dal wizard del gestionale: il prezzo mostrato viene
 * sempre da pricing.ts (prezzo_giorno × giorni), mai ricalcolato qui.
 */
export function InsurancePackagePicker({
  catalog,
  categoryId,
  days,
  selectedId,
  onSelect,
  labels,
}: {
  catalog: InsuranceCatalog;
  categoryId: string | null | undefined;
  days: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  labels?: { perDay?: string; deductible?: string; choose?: string; chosen?: string; total?: string };
}) {
  const list = pickInsurancePackages(catalog.packages, categoryId);
  const l = {
    perDay: labels?.perDay ?? "al giorno",
    deductible: labels?.deductible ?? "Franchigia residua",
    choose: labels?.choose ?? "Scegli",
    chosen: labels?.chosen ?? "Selezionato",
    total: labels?.total ?? "totale periodo",
  };

  if (list.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-secondary/40 p-3 text-sm text-muted-foreground">
        Nessun pacchetto assicurativo attivo per questa categoria.
      </p>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {list.map((pkg) => {
        const includes = packageIncludes(pkg, catalog);
        const selected = selectedId === pkg.id;
        const perDay = Number(pkg.prezzo_giorno);
        return (
          <div
            key={pkg.id}
            className={`flex flex-col gap-3 rounded-2xl border p-4 transition ${
              selected ? "border-primary bg-primary/5 shadow-card" : "border-border bg-card"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="flex items-center gap-1.5 font-display text-lg">
                  <ShieldCheck className="size-4 text-primary" aria-hidden />
                  {pkg.nome}
                </p>
                <p className="text-xs text-muted-foreground">
                  {l.deductible}:{" "}
                  <strong>
                    {Number(pkg.franchigia_residua) === 0
                      ? "0 €"
                      : euro(Number(pkg.franchigia_residua))}
                  </strong>
                </p>
              </div>
              {selected ? <Badge>{l.chosen}</Badge> : null}
            </div>

            <p className="font-display text-2xl">
              {perDay === 0 ? "Incluso" : `${euro(perDay)}`}
              {perDay > 0 ? (
                <span className="ml-1 text-xs font-normal text-muted-foreground">/{l.perDay}</span>
              ) : null}
            </p>
            {perDay > 0 ? (
              <p className="-mt-2 text-xs text-muted-foreground">
                {euro(perDay * Math.max(1, days))} {l.total}
              </p>
            ) : null}

            {pkg.descrizione ? (
              <p className="text-xs text-muted-foreground">{pkg.descrizione}</p>
            ) : null}

            <ul className="space-y-1 text-sm">
              {includes.map((item) => (
                <li key={item.id} className="flex items-start gap-1.5">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                  <span>
                    {item.label}: <span className="text-muted-foreground">{item.detail}</span>
                  </span>
                </li>
              ))}
            </ul>

            <Button
              type="button"
              variant={selected ? "default" : "outline"}
              className="mt-auto w-full rounded-full"
              onClick={() => onSelect(selected ? null : pkg.id)}
            >
              {selected ? l.chosen : l.choose}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
