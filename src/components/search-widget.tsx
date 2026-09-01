import { Link, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { enGB, it as itLocale } from "date-fns/locale";
import { CalendarDays, Car, Clock, MapPin, Plane, Plus, Search, Tag, Truck, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { branches } from "@/lib/company";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function isoDate(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function parseIso(value: string): Date | undefined {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function toIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Fasce orarie leggibili: slot ogni 30 minuti, come nel pattern Sixt. */
const timeBands: { it: string; en: string; from: number; to: number }[] = [
  { it: "Mattino presto", en: "Early morning", from: 6, to: 9 },
  { it: "Mattina – pomeriggio", en: "Morning – afternoon", from: 9, to: 13 },
  { it: "Pomeriggio", en: "Afternoon", from: 13, to: 18 },
  { it: "Sera", en: "Evening", from: 18, to: 24 },
];

function slotsFor(from: number, to: number) {
  const out: string[] = [];
  for (let h = from; h < to; h += 1) {
    out.push(`${String(h).padStart(2, "0")}:00`, `${String(h).padStart(2, "0")}:30`);
  }
  return out;
}

function Field({
  label,
  icon,
  children,
  className,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card px-3 py-2 text-left", className)}>
      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </div>
  );
}

const baseField =
  "w-full border-0 bg-transparent p-0 text-sm font-semibold shadow-none outline-none focus-visible:ring-0";

const triggerText = "w-full truncate text-left text-sm font-semibold";

/** Popover di selezione sede: elenco filtrabile a sinistra, dettaglio a destra. */
function BranchPicker({
  label,
  value,
  onChange,
  /** Prima voce speciale del campo restituzione. */
  resetOption,
}: {
  label: string;
  value: string;
  onChange: (code: string) => void;
  resetOption?: { label: string; onSelect: () => void };
}) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState(value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return branches;
    return branches.filter((b) =>
      [b.city, b.name, b.address, b.code].some((field) => field.toLowerCase().includes(q)),
    );
  }, [query]);

  const selected = branches.find((b) => b.code === value);
  const detail = branches.find((b) => b.code === preview) ?? selected ?? branches[0]!;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setQuery("");
          setPreview(value);
        }
      }}
    >
      <Field label={label} icon={<Search className="size-3" />}>
        <PopoverTrigger asChild>
          <button type="button" className={triggerText}>
            {selected?.city ?? t("Aeroporto, città o indirizzo", "Airport, city or address")}
          </button>
        </PopoverTrigger>
      </Field>

      <PopoverContent align="start" className="w-[min(44rem,calc(100vw-2rem))] p-0">
        <div className="border-b border-border p-3">
          <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
            <Search className="size-4 text-muted-foreground" aria-hidden />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Aeroporto, città o indirizzo", "Airport, city or address")}
              className={baseField}
            />
          </div>
        </div>

        <div className="grid gap-0 sm:grid-cols-2">
          <div className="p-3 sm:border-r sm:border-border">
            {resetOption ? (
              <button
                type="button"
                onClick={() => {
                  resetOption.onSelect();
                  setOpen(false);
                }}
                className="mb-2 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-bold text-primary hover:bg-accent"
              >
                <X className="size-4" aria-hidden />
                {resetOption.label}
              </button>
            ) : null}

            <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("Le nostre sedi", "Our branches")}
            </p>
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-sm text-muted-foreground">
                {t("Nessuna sede corrispondente.", "No matching branch.")}
              </p>
            ) : (
              <ul>
                {filtered.map((b) => (
                  <li key={b.code}>
                    <button
                      type="button"
                      onMouseEnter={() => setPreview(b.code)}
                      onFocus={() => setPreview(b.code)}
                      onClick={() => {
                        onChange(b.code);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left hover:bg-accent",
                        b.code === value && "bg-accent",
                      )}
                    >
                      <Plane className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                      <span>
                        <span className="block text-sm font-bold">{b.city}</span>
                        <span className="block text-xs text-muted-foreground">{b.name}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-secondary/40 p-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {detail.area[lang]}
            </p>
            <p className="mt-1 text-base font-bold">{detail.name}</p>
            <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
              {detail.address}
            </p>
            <Link
              to="/dove-siamo"
              hash={detail.id}
              onClick={() => setOpen(false)}
              className="mt-4 inline-block text-sm font-bold text-primary hover:underline"
            >
              {t("Dettagli sede", "Branch details")}
            </Link>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Pannello di scelta orario a fasce. */
function TimePicker({
  label,
  panelTitle,
  value,
  onChange,
}: {
  label: string;
  panelTitle: string;
  value: string;
  onChange: (time: string) => void;
}) {
  const { lang } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Field label={label} icon={<Clock className="size-3" />}>
        <PopoverTrigger asChild>
          <button type="button" className={triggerText}>
            {value}
          </button>
        </PopoverTrigger>
      </Field>
      <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] p-4">
        <p className="text-sm font-bold">{panelTitle}</p>
        <div className="mt-3 max-h-72 space-y-4 overflow-y-auto pr-1">
          {timeBands.map((band) => (
            <div key={band.it}>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                {band[lang]}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {slotsFor(band.from, band.to).map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => {
                      onChange(slot);
                      setOpen(false);
                    }}
                    className={cn(
                      "rounded-lg border border-border px-2 py-1.5 text-sm font-semibold transition-colors hover:bg-accent",
                      slot === value && "border-primary bg-primary text-primary-foreground hover:bg-primary",
                    )}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export type SearchWidgetInitial = {
  from?: string | undefined;
  to?: string | undefined;
  date_from?: string | undefined;
  time_from?: string | undefined;
  date_to?: string | undefined;
  time_to?: string | undefined;
  age?: string | undefined;
  promo?: string | undefined;
};

export function SearchWidget({
  variant = "hero",
  initial,
  /** Se impostato, il form cerca sempre in questa macro-classe e nasconde il toggle. */
  fixedClass,
}: {
  variant?: "hero" | "page";
  /** Valori già scelti dall'utente (es. tornando su "Modifica ricerca"). */
  initial?: SearchWidgetInitial;
  fixedClass?: string;
}) {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [splitDropoff, setSplitDropoff] = useState(
    Boolean(initial?.to && initial?.from && initial.to !== initial.from),
  );
  const [from, setFrom] = useState(initial?.from ?? branches[0]!.code);
  const [to, setTo] = useState(initial?.to ?? initial?.from ?? branches[0]!.code);
  const [dateFrom, setDateFrom] = useState(initial?.date_from ?? isoDate(1));
  const [timeFrom, setTimeFrom] = useState(initial?.time_from ?? "10:00");
  const [dateTo, setDateTo] = useState(initial?.date_to ?? isoDate(4));
  const [timeTo, setTimeTo] = useState(initial?.time_to ?? "10:00");
  const [age, setAge] = useState(initial?.age ?? "25+");
  const [promo, setPromo] = useState(initial?.promo ?? "");
  const [calendarOpen, setCalendarOpen] = useState(false);
  /** Intervallo in corso di selezione nel calendario condiviso. */
  const [draft, setDraft] = useState<DateRange | undefined>(undefined);

  const committed: DateRange | undefined = useMemo(() => {
    const start = parseIso(dateFrom);
    const end = parseIso(dateTo);
    return start ? { from: start, to: end } : undefined;
  }, [dateFrom, dateTo]);

  /** true mentre l'utente sta ricominciando la selezione dal campo ritiro. */
  const [picking, setPicking] = useState(false);
  const range = picking ? draft : committed;

  /** Prepara la selezione: dal campo ritiro si riparte da zero. */
  const prepareCalendar = (reset: boolean) => {
    setPicking(reset);
    setDraft(reset ? undefined : committed);
  };

  const locale = lang === "it" ? itLocale : enGB;
  const fmt = (iso: string) => {
    const d = parseIso(iso);
    return d ? format(d, "EEE d MMM", { locale }) : "—";
  };

  // Il calendario condiviso resta un solo mese su mobile.
  const [months, setMonths] = useState(1);
  useEffect(() => setMonths(isMobile ? 1 : 3), [isMobile]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    navigate({
      to: "/prenota",
      search: {
        from,
        to: splitDropoff ? to : from,
        date_from: dateFrom,
        time_from: timeFrom,
        date_to: dateTo,
        time_to: timeTo,
        ...(fixedClass ? { class: fixedClass } : {}),
        age,
        ...(promo ? { promo } : {}),
      },
    });
  };

  const onRangeSelect = (next: DateRange | undefined) => {
    if (!next?.from) {
      setDraft(undefined);
      return;
    }
    setDraft(next);
    setDateFrom(toIso(next.from));
    if (next.to && toIso(next.to) !== toIso(next.from)) {
      setDateTo(toIso(next.to));
      setPicking(false);
      setDraft(undefined);
      setCalendarOpen(false);
    }
  };

  const calendar = (
    <PopoverContent align="start" className="w-auto max-w-[calc(100vw-2rem)] p-0">
      <Calendar
        mode="range"
        numberOfMonths={months}
        selected={range}
        {...(parseIso(dateFrom) ? { defaultMonth: parseIso(dateFrom)! } : {})}
        disabled={{ before: new Date() }}
        onSelect={onRangeSelect}
        locale={locale}
        className={cn("pointer-events-auto p-3")}
      />
    </PopoverContent>
  );

  return (
    <form
      onSubmit={submit}
      className={cn(
        "rounded-2xl bg-card/95 p-5 shadow-elev backdrop-blur sm:p-6",
        variant === "hero" ? "border border-border/60" : "border border-border",
      )}
      aria-label={t("Ricerca veicoli", "Vehicle search")}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {fixedClass ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground">
            <Truck className="size-3.5" aria-hidden />
            {t("Veicoli commerciali", "Commercial vehicles")}
          </span>
        ) : (
          <>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground">
              <Car className="size-3.5" aria-hidden />
              {t("Auto", "Cars")}
            </span>
            <Link
              to="/veicoli-commerciali"
              className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-xs font-bold text-secondary-foreground transition-colors hover:bg-accent"
            >
              <Truck className="size-3.5" aria-hidden />
              {t("Veicoli commerciali", "Commercial vehicles")}
            </Link>
          </>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        {splitDropoff ? (
          <>
            <BranchPicker label={t("Ritiro", "Pick-up")} value={from} onChange={setFrom} />
            <BranchPicker
              label={t("Restituzione", "Drop-off")}
              value={to}
              onChange={setTo}
              resetOption={{
                label: t("Restituzione al punto di ritiro", "Return to pick-up location"),
                onSelect: () => {
                  setTo(from);
                  setSplitDropoff(false);
                },
              }}
            />
          </>
        ) : (
          <div className="lg:col-span-2">
            <BranchPicker
              label={t("Ritiro e restituzione", "Pick-up and drop-off")}
              value={from}
              onChange={(code) => {
                setFrom(code);
                setTo(code);
              }}
            />
            <button
              type="button"
              onClick={() => setSplitDropoff(true)}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
            >
              <Plus className="size-3.5" aria-hidden />
              {t("Posizione di restituzione diversa", "Different drop-off location")}
            </button>
          </div>
        )}

        {/* Un solo calendario condiviso, apribile da entrambi i campi data. */}
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverAnchor asChild>
            <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2">
              <Field label={t("Data di ritiro", "Pick-up date")} icon={<CalendarDays className="size-3" />}>
                <button
                  type="button"
                  className={cn(triggerText, "block")}
                  onClick={() => {
                    prepareCalendar(true);
                    setCalendarOpen(true);
                  }}
                >
                  {fmt(dateFrom)}
                </button>
              </Field>
              <Field label={t("Data di restituzione", "Drop-off date")} icon={<CalendarDays className="size-3" />}>
                <button
                  type="button"
                  className={cn(triggerText, "block")}
                  onClick={() => {
                    prepareCalendar(false);
                    setCalendarOpen(true);
                  }}
                >
                  {fmt(dateTo)}
                </button>
              </Field>
            </div>
          </PopoverAnchor>
          {calendar}
        </Popover>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <TimePicker
          label={t("Ora di ritiro", "Pick-up time")}
          panelTitle={t("Seleziona l'ora di ritiro", "Select pick-up time")}
          value={timeFrom}
          onChange={setTimeFrom}
        />
        <TimePicker
          label={t("Ora di restituzione", "Drop-off time")}
          panelTitle={t("Seleziona l'ora di restituzione", "Select drop-off time")}
          value={timeTo}
          onChange={setTimeTo}
        />

        <Field label={t("Età conducente", "Driver age")} icon={<UserRound className="size-3" />}>
          <Select value={age} onValueChange={setAge}>
            <SelectTrigger
              aria-label={t("Età conducente", "Driver age")}
              className="h-auto w-full border-0 bg-transparent p-0 text-sm font-semibold shadow-none focus:ring-0 focus-visible:ring-0"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="19-24">19 – 24</SelectItem>
              <SelectItem value="25+">25+</SelectItem>
              <SelectItem value="70+">70+</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field
          label={t("Codice promo (opzionale)", "Promo code (optional)")}
          icon={<Tag className="size-3" />}
          className="sm:col-span-2"
        >
          <Input
            className={baseField}
            value={promo}
            onChange={(e) => setPromo(e.target.value)}
            placeholder={t("Convenzione o promo", "Agreement or promo")}
            maxLength={24}
          />
        </Field>

        <Button type="submit" size="lg" className="h-full min-h-12 rounded-xl text-base font-bold">
          <Search className="size-4" />
          {t("Cerca", "Search")}
        </Button>
      </div>
    </form>
  );
}
