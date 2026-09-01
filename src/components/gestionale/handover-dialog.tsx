import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { SignaturePad } from "@/components/gestionale/signature-pad";
import {
  VehicleDamageScheme,
  viewLabel,
} from "@/components/gestionale/vehicle-damage-scheme";
import {
  daysBetween,
  equipmentOptions,
  formatEuro,
  type Damage,
  type DamageView,
  type Reservation,
  type Vehicle,
  type VehicleCategory,
} from "@/lib/gestionale";
import { checkinVehicle, checkoutVehicle } from "@/lib/fleet-ops.functions";
import {
  computeReturnCharges,
  findDamagePrice,
  isChargeInRange,
  pickRatePlan,
  resolveKmPolicy,
  type RatePlan,
} from "@/lib/pricing";
import {
  damageComponentsQuery,
  damagePriceConfigQuery,
  damageSeveritiesQuery,
  damageTypesQuery,
  onlyActive,
} from "@/lib/gestionale";

type DraftDamage = {
  key: string;
  view: string;
  pos_x: number;
  pos_y: number;
  damage_type: string;
  severity: string;
  description: string;
  charge_amount: number;
  out_of_service: boolean;
  /** Tassonomia: componente + gravità dal dizionario, con nota di fuori range. */
  component_id: string | null;
  severity_id: string | null;
  charge_note: string | null;
  label: string;
};

/**
 * Consegna (check-out) e rientro (check-in) del veicolo: km, carburante in
 * LITRI assoluti sulla capacità reale del serbatoio, dotazioni, danni sullo
 * schema interattivo e firma del cliente. Il calcolo definitivo è server-side.
 */
export function HandoverDialog({
  mode,
  reservation,
  vehicle,
  category,
  ratePlans,
  existingDamages,
  open,
  onOpenChange,
  onDone,
}: {
  mode: "checkout" | "checkin";
  reservation: Reservation;
  vehicle: Vehicle | undefined;
  category: VehicleCategory | undefined;
  ratePlans: RatePlan[];
  existingDamages: Damage[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => Promise<void> | void;
}) {
  const isCheckout = mode === "checkout";
  const capacity = Number(vehicle?.fuel_capacity_liters ?? 50);

  // I valori devono essere rilevati e digitati esplicitamente a ogni passaggio:
  // nessun chilometraggio o livello carburante viene precompilato come dato verificato.
  const [km, setKm] = useState("");
  const [fuel, setFuel] = useState("");
  // Nessuna dotazione pre-selezionata: la scelta deve essere esplicita.
  const [equipment, setEquipment] = useState<string[]>([]);
  const [signature, setSignature] = useState<string | null>(null);
  /** Conferma esplicita dei dati, distinta dalla firma (Lotto 23). */
  const [dataConfirmed, setDataConfirmed] = useState(false);

  const [view, setView] = useState<DamageView>("fronte");
  const [draftPoint, setDraftPoint] = useState<{ x: number; y: number } | null>(null);
  const [typeId, setTypeId] = useState<string | null>(null);
  const [componentId, setComponentId] = useState<string | null>(null);
  const [severityId, setSeverityId] = useState<string | null>(null);
  const [chargeNote, setChargeNote] = useState("");
  const [note, setNote] = useState("");
  const [charge, setCharge] = useState("0");
  const [outOfService, setOutOfService] = useState(false);
  const [drafts, setDrafts] = useState<DraftDamage[]>([]);

  // Dizionario danni: tipi, componenti, gravità e prezzario per categoria.
  const damageTypes = useQuery(damageTypesQuery);
  const damageComponents = useQuery(damageComponentsQuery);
  const damageSeverities = useQuery(damageSeveritiesQuery);
  const damagePrices = useQuery(damagePriceConfigQuery);

  const types = onlyActive(damageTypes.data);
  const severities = onlyActive(damageSeverities.data);
  const activeTypeId = typeId ?? types[0]?.id ?? null;
  const componentsForType = onlyActive(damageComponents.data).filter(
    (c) => c.damage_type_id === activeTypeId,
  );
  const activeComponentId = componentId ?? componentsForType[0]?.id ?? null;
  const activeSeverityId = severityId ?? severities[0]?.id ?? null;
  const activeComponent = componentsForType.find((c) => c.id === activeComponentId) ?? null;
  const activeSeverity = severities.find((s) => s.id === activeSeverityId) ?? null;

  // Range di prezzo configurato per questa categoria veicolo: è un suggerimento,
  // non un vincolo — un prezzario incompleto non deve bloccare l'operatività.
  const priceRange = findDamagePrice(
    damagePrices.data ?? [],
    vehicle?.category_id ?? null,
    activeComponentId,
    activeSeverityId,
  );
  const chargeAmount = Math.max(0, Number(charge) || 0);
  const outOfRange = chargeAmount > 0 && !isChargeInRange(priceRange, chargeAmount);

  const runCheckout = useServerFn(checkoutVehicle);
  const runCheckin = useServerFn(checkinVehicle);

  const policy = useMemo(() => {
    const plan = pickRatePlan(
      ratePlans,
      vehicle?.category_id ?? null,
      reservation.branch_id,
      reservation.date_from,
    );
    return resolveKmPolicy(plan, category ?? null);
  }, [ratePlans, vehicle?.category_id, reservation.branch_id, reservation.date_from, category]);

  const preview = useMemo(() => {
    if (isCheckout) return null;
    return computeReturnCharges({
      days: daysBetween(reservation.date_from, reservation.date_to),
      kmOut: Number(reservation.checkout_km ?? 0),
      kmIn: Number(km) || 0,
      includedKmPerDay: policy.includedKmPerDay,
      extraKmRate: policy.extraKmRate,
      fuelOut: Number(reservation.checkout_fuel_liters ?? 0),
      fuelIn: Number(fuel) || 0,
      fuelPricePerLiter: Number(category?.fuel_price_per_liter ?? 0),
      damageCharge: drafts.reduce((s, d) => s + d.charge_amount, 0),
    });
  }, [isCheckout, reservation, km, fuel, policy, category, drafts]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        reservationId: reservation.id,
        km: Math.round(Number(km) || 0),
        fuelLiters: Number(fuel) || 0,
        signatureDataUrl: signature ?? "",
        dataConfirmed: dataConfirmed as true,
        damages: drafts.map((d) => ({
          view: d.view,
          pos_x: d.pos_x,
          pos_y: d.pos_y,
          damage_type: d.damage_type,
          severity: d.severity,
          component_id: d.component_id,
          severity_id: d.severity_id,
          charge_note: d.charge_note,
          description: d.description || null,
          charge_amount: isCheckout ? 0 : d.charge_amount,
          out_of_service: isCheckout ? false : d.out_of_service,
        })),
      };
      return isCheckout
        ? runCheckout({ data: { ...payload, equipment } })
        : runCheckin({ data: { ...payload, equipment } });
    },
    onSuccess: async (result) => {
      toast.success(isCheckout ? "Veicolo consegnato" : "Veicolo rientrato");
      // Il verbale è un'operazione a valle: se fallisce l'operazione resta
      // valida, ma l'operatore deve saperlo e rigenerarlo dal dettaglio.
      if (result?.verbale && result.verbale.ok === false) {
        toast.warning("Verbale non generato", {
          description: `${
            isCheckout ? "Consegna registrata" : "Rientro registrato"
          }, ma il verbale non è stato generato o inviato correttamente — riprova dal dettaglio prenotazione.`,
          duration: 10000,
        });
      }
      onOpenChange(false);
      setDrafts([]);
      setDataConfirmed(false);
      setSignature(null);
      await onDone();
    },
    onError: (e: Error) =>
      toast.error(isCheckout ? "Consegna non registrata" : "Rientro non registrato", {
        description: e.message,
      }),
  });

  function addDraft() {
    if (!draftPoint) {
      toast.error("Clicca sullo schema per posizionare il danno");
      return;
    }
    if (outOfRange && !chargeNote.trim()) {
      toast.error("Importo fuori dal prezzario: aggiungi una motivazione");
      return;
    }
    const severityCode = activeSeverity?.code ?? "lieve";
    setDrafts((prev) => [
      ...prev,
      {
        key: `${Date.now()}-${prev.length}`,
        view,
        pos_x: draftPoint.x,
        pos_y: draftPoint.y,
        // Compatibilità con i campi testuali storici di vehicle_damages.
        damage_type: activeComponent?.code ?? "generico",
        severity: severityCode,
        component_id: activeComponentId,
        severity_id: activeSeverityId,
        charge_note: outOfRange ? chargeNote.trim() : null,
        label: `${activeComponent?.label_it ?? "Componente"} · ${activeSeverity?.label_it ?? severityCode}`,
        description: note,
        charge_amount: chargeAmount,
        out_of_service: outOfService,
      },
    ]);
    setDraftPoint(null);
    setNote("");
    setCharge("0");
    setChargeNote("");
    setOutOfService(false);
  }

  const kmOut = Number(reservation.checkout_km ?? 0);
  const kmInvalid = !isCheckout && (Number(km) || 0) < kmOut;

  // Compilazione obbligatoria dei campi che descrivono lo stato del veicolo:
  // valgono identiche per il cliente in autonomia e per l'operatore al banco.
  const kmValue = km.trim() === "" ? null : Number(km);
  const fuelValue = fuel.trim() === "" ? null : Number(fuel);
  const missing: string[] = [];
  if (kmValue === null || !Number.isFinite(kmValue) || kmValue < 0)
    missing.push("chilometraggio");
  if (fuelValue === null || !Number.isFinite(fuelValue) || fuelValue < 0 || fuelValue > capacity)
    missing.push(`carburante (0–${capacity} litri)`);
  if (isCheckout && equipment.length === 0) missing.push("dotazioni consegnate");
  if (kmInvalid) missing.push("chilometraggio non inferiore a quello di uscita");
  const fieldsComplete = missing.length === 0;
  const canConfirm = fieldsComplete && dataConfirmed && Boolean(signature);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isCheckout ? "Consegna veicolo" : "Rientro veicolo"} · {reservation.code}
          </DialogTitle>
          <DialogDescription>
            {vehicle ? `${vehicle.model} · ${vehicle.plate}` : "Veicolo non assegnato"} ·{" "}
            {reservation.date_from} → {reservation.date_to}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="km">
              {isCheckout ? "Chilometraggio di uscita" : "Chilometraggio di rientro"}
            </Label>
            <Input id="km" type="number" min={0} value={km} onChange={(e) => setKm(e.target.value)} />
            {!isCheckout ? (
              <p className={`text-xs ${kmInvalid ? "text-destructive" : "text-muted-foreground"}`}>
                Uscita: {kmOut.toLocaleString("it-IT")} km · km percorsi{" "}
                {Math.max(0, (Number(km) || 0) - kmOut).toLocaleString("it-IT")}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fuel">Carburante (litri su {capacity} l di capacità)</Label>
            <Input
              id="fuel"
              type="number"
              min={0}
              max={capacity}
              step="0.5"
              value={fuel}
              onChange={(e) => setFuel(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Unità di misura unica in tutta l&apos;app: litri assoluti, mai percentuali.
            </p>
          </div>
        </div>

        <fieldset className="space-y-2 rounded-lg border border-border p-3">
          <legend className="px-1 text-sm font-medium">
            {isCheckout ? "Dotazioni consegnate" : "Dotazioni restituite"}
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {equipmentOptions.map((item) => (
              <label key={item} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={equipment.includes(item)}
                  onCheckedChange={(v) =>
                    setEquipment((prev) =>
                      v === true ? [...prev, item] : prev.filter((x) => x !== item),
                    )
                  }
                />
                {item}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="mb-2 text-sm font-medium">
              {isCheckout
                ? "Danni preesistenti: clicca sullo schema"
                : "Nuovi danni rilevati al rientro"}
            </p>
            <VehicleDamageScheme
              view={view}
              onViewChange={setView}
              schemaImageUrl={category?.damage_schema_image_url ?? null}
              markers={[
                ...existingDamages.map((d) => ({
                  id: d.id,
                  view: d.view,
                  pos_x: Number(d.pos_x),
                  pos_y: Number(d.pos_y),
                  severity: d.severity,
                  muted: true,
                })),
                ...drafts.map((d) => ({
                  id: d.key,
                  view: d.view,
                  pos_x: d.pos_x,
                  pos_y: d.pos_y,
                  severity: d.severity,
                })),
              ]}
              draft={draftPoint}
              onPick={setDraftPoint}
            />
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Area</Label>
                <Select
                  value={activeTypeId ?? ""}
                  onValueChange={(v) => {
                    setTypeId(v);
                    setComponentId(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Area" />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.label_it}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Gravità</Label>
                <Select value={activeSeverityId ?? ""} onValueChange={setSeverityId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Gravità" />
                  </SelectTrigger>
                  <SelectContent>
                    {severities.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.label_it}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Componente</Label>
              <Select value={activeComponentId ?? ""} onValueChange={setComponentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Componente" />
                </SelectTrigger>
                <SelectContent>
                  {componentsForType.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label_it}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dmg-note">Nota</Label>
              <Textarea
                id="dmg-note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Descrizione del danno"
              />
            </div>
            {!isCheckout ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="dmg-charge">Importo addebitato (€)</Label>
                  {priceRange ? (
                    <p className="text-xs text-muted-foreground">
                      Prezzario categoria: {formatEuro(Number(priceRange.prezzo_min))} –{" "}
                      {formatEuro(Number(priceRange.prezzo_max))} · consigliato{" "}
                      <button
                        type="button"
                        className="font-semibold text-primary underline"
                        onClick={() => setCharge(String(Number(priceRange.prezzo_consigliato)))}
                      >
                        {formatEuro(Number(priceRange.prezzo_consigliato))}
                      </button>
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Nessun prezzo configurato per questa combinazione: inserisci l'importo a mano.
                    </p>
                  )}
                  <Input
                    id="dmg-charge"
                    type="number"
                    min={0}
                    step="0.01"
                    value={charge}
                    onChange={(e) => setCharge(e.target.value)}
                  />
                </div>
                {outOfRange ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="dmg-charge-note">Motivazione fuori prezzario</Label>
                    <Input
                      id="dmg-charge-note"
                      value={chargeNote}
                      onChange={(e) => setChargeNote(e.target.value)}
                      placeholder="Perché l'importo esce dal range"
                    />
                  </div>
                ) : null}
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={outOfService}
                    onCheckedChange={(v) => setOutOfService(v === true)}
                  />
                  Richiede fermo veicolo (manutenzione)
                </label>
              </>
            ) : null}
            <Button type="button" variant="outline" className="w-full rounded-full" onClick={addDraft}>
              Aggiungi danno allo schema
            </Button>

            {drafts.length > 0 ? (
              <ul className="space-y-1 text-xs text-muted-foreground">
                {drafts.map((d) => (
                  <li key={d.key} className="flex items-center justify-between gap-2">
                    <span>
                      {d.label} · {viewLabel(d.view)}
                      {d.charge_amount > 0 ? ` · ${formatEuro(d.charge_amount)}` : ""}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2"
                      onClick={() => setDrafts((prev) => prev.filter((x) => x.key !== d.key))}
                    >
                      Rimuovi
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        {preview ? (
          <div className="space-y-1 rounded-lg border border-border bg-secondary/40 p-3 text-sm">
            <p className="font-semibold">Addebiti di rientro</p>
            <p className="text-muted-foreground">
              Km percorsi {preview.kmDriven.toLocaleString("it-IT")} · inclusi{" "}
              {preview.includedKm.toLocaleString("it-IT")} · extra {preview.extraKm.toLocaleString("it-IT")} km ={" "}
              {formatEuro(preview.extraKmAmount)}
            </p>
            <p className="text-muted-foreground">
              Carburante mancante {preview.missingLiters} l = {formatEuro(preview.fuelPenalty)}
            </p>
            <p className="text-muted-foreground">Danni addebitati {formatEuro(preview.damageCharge)}</p>
            <p className="font-display text-xl">Totale addebiti {formatEuro(preview.total)}</p>
            <p className="text-xs text-muted-foreground">
              Sommati al totale fatturabile del contratto: entrano nella fattura, non in un importo separato.
            </p>
          </div>
        ) : null}

        <SignaturePad
          onChange={setSignature}
          label={isCheckout ? "Firma del cliente (consegna)" : "Firma del cliente (rientro)"}
        />

        <label className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm">
          <Checkbox
            className="mt-0.5"
            checked={dataConfirmed}
            onCheckedChange={(v) => setDataConfirmed(v === true)}
          />
          <span>
            Confermo che i dati sopra riportati (chilometraggio, carburante, stato del veicolo,
            dotazioni) corrispondono a quanto verificato al momento della{" "}
            {isCheckout ? "consegna" : "riconsegna"}.
          </span>
        </label>

        {!canConfirm ? (
          <p className="text-xs text-destructive">
            {missing.length > 0
              ? `Completa i campi obbligatori: ${missing.join(", ")}.`
              : !dataConfirmed
                ? "Spunta la conferma dei dati rilevati per procedere."
                : "Acquisisci la firma del cliente sul dispositivo per procedere."}
          </p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button
            className="rounded-full"
            disabled={save.isPending || !canConfirm}
            onClick={() => save.mutate()}
          >
            {save.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {isCheckout ? "Conferma consegna" : "Chiudi contratto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
