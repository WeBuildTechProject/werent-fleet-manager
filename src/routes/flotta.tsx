import { Link, createFileRoute } from "@tanstack/react-router";
import { JsonLd } from "@/components/json-ld";
import { absoluteUrl, buildBreadcrumbJsonLd } from "@/lib/seo";
import { Briefcase, Check, DoorOpen, Fuel, Settings2, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { BookingClassTabs, RentHubEmbed } from "@/components/booking/renthub-embed";
import { SearchWidget } from "@/components/search-widget";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { categories, includedItems, vehicles, type CategoryId } from "@/lib/fleet";
import { useI18n } from "@/lib/i18n";
import { PUBLIC_SITE_ONLY } from "@/lib/site-mode";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/flotta")({
  head: () => ({
    meta: [
      { title: "Flotta a noleggio — auto, van e furgoni | We Rent" },
      {
        name: "description",
        content:
          "Economy, Premium, Van 9 posti e veicoli commerciali fino a 15 m³. Filtra per categoria, cambio, carburante e prezzo e prenota online.",
      },
      { property: "og:title", content: "Flotta a noleggio — auto, van e furgoni | We Rent" },
      {
        property: "og:description",
        content: "Tutti i veicoli sono nuovi, manutenuti e pronti al ritiro a Cagliari, Olbia e Milano Linate.",
      },
      { property: "og:url", content: absoluteUrl("/flotta") },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/flotta") }],
  }),
  // Deep-link dalle fasce promo: /flotta?class=van pre-filtra la categoria.
  validateSearch: (search: Record<string, unknown>): { class?: string } =>
    typeof search["class"] === "string" ? { class: search["class"] as string } : {},
  component: FlottaPage,
});

type Sort = "price-asc" | "price-desc" | "popular";

const categoryIds = categories.map((c) => c.id);

function FlottaPage() {
  const { t, lang } = useI18n();
  const { class: initialClass } = Route.useSearch();
  const [selectedCats, setSelectedCats] = useState<CategoryId[]>(
    initialClass && categoryIds.includes(initialClass as CategoryId)
      ? [initialClass as CategoryId]
      : [],
  );
  const [gearboxes, setGearboxes] = useState<string[]>([]);
  const [fuels, setFuels] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState(130);
  const [sort, setSort] = useState<Sort>("popular");

  const toggle = <T extends string>(list: T[], value: T, set: (v: T[]) => void) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const results = useMemo(() => {
    const filtered = vehicles.filter(
      (v) =>
        (selectedCats.length === 0 || selectedCats.includes(v.category)) &&
        (gearboxes.length === 0 || gearboxes.includes(v.gearbox)) &&
        (fuels.length === 0 || fuels.includes(v.fuel)) &&
        v.pricePerDay <= maxPrice,
    );
    return [...filtered].sort((a, b) =>
      sort === "price-asc"
        ? a.pricePerDay - b.pricePerDay
        : sort === "price-desc"
          ? b.pricePerDay - a.pricePerDay
          : b.popularity - a.popularity,
    );
  }, [selectedCats, gearboxes, fuels, maxPrice, sort]);

  const fuelLabels: Record<string, string> = {
    benzina: t("Benzina", "Petrol"),
    diesel: t("Diesel", "Diesel"),
    ibrida: t("Ibrida", "Hybrid"),
    elettrica: t("Elettrica", "Electric"),
  };

  return (
    <>
      <JsonLd data={buildBreadcrumbJsonLd([{ name: "Flotta", path: "/flotta" }])} />
      <section className="bg-gradient-hero">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <p className="eyebrow text-ink/60">{t("La flotta", "The fleet")}</p>
          <h1 className="mt-2 max-w-3xl text-4xl text-ink sm:text-5xl">
            {t("Un veicolo per ogni viaggio.", "A vehicle for every journey.")}
          </h1>
          <p className="mt-4 max-w-2xl text-ink/80">
            {t(
              "Dalla city car al furgone cargo — tutti i veicoli sono nuovi, manutenuti e pronti al ritiro.",
              "From city cars to cargo vans — every vehicle is new, serviced and ready for pick-up.",
            )}
          </p>
        </div>
      </section>

      <section className="mx-auto -mt-8 max-w-7xl px-4 sm:px-6">
        {PUBLIC_SITE_ONLY ? (
          <>
            <BookingClassTabs />
            <RentHubEmbed compact frameId="renthub-frame-flotta" />
          </>
        ) : (
          <SearchWidget variant="page" />
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                {t("Categoria", "Category")}
              </h2>
              <div className="mt-3 space-y-2">
                {categories.map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`cat-${c.id}`}
                      checked={selectedCats.includes(c.id)}
                      onCheckedChange={() => toggle(selectedCats, c.id, setSelectedCats)}
                    />
                    <Label htmlFor={`cat-${c.id}`} className="text-sm font-medium">
                      {c.label[lang]}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                {t("Cambio", "Gearbox")}
              </h2>
              <div className="mt-3 space-y-2">
                {(["manuale", "automatico"] as const).map((g) => (
                  <div key={g} className="flex items-center gap-2">
                    <Checkbox
                      id={`gear-${g}`}
                      checked={gearboxes.includes(g)}
                      onCheckedChange={() => toggle(gearboxes, g, setGearboxes)}
                    />
                    <Label htmlFor={`gear-${g}`} className="text-sm font-medium capitalize">
                      {g === "manuale" ? t("Manuale", "Manual") : t("Automatico", "Automatic")}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                {t("Alimentazione", "Fuel")}
              </h2>
              <div className="mt-3 space-y-2">
                {Object.keys(fuelLabels).map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <Checkbox
                      id={`fuel-${f}`}
                      checked={fuels.includes(f)}
                      onCheckedChange={() => toggle(fuels, f, setFuels)}
                    />
                    <Label htmlFor={`fuel-${f}`} className="text-sm font-medium">
                      {fuelLabels[f]}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                {t("Prezzo massimo al giorno", "Max price per day")}
              </h2>
              <p className="mt-2 font-display text-2xl text-primary">€{maxPrice}</p>
              <Slider
                className="mt-3"
                min={29}
                max={130}
                step={5}
                value={[maxPrice]}
                onValueChange={([v]) => setMaxPrice(v ?? 130)}
                aria-label={t("Prezzo massimo", "Max price")}
              />
            </div>
          </aside>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {results.length} {t("veicoli disponibili", "vehicles available")}
              </p>
              <div className="flex items-center gap-2">
                <Label htmlFor="sort" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {t("Ordina", "Sort")}
                </Label>
                <select
                  id="sort"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as Sort)}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold"
                >
                  <option value="popular">{t("Popolarità", "Popularity")}</option>
                  <option value="price-asc">{t("Prezzo crescente", "Price low to high")}</option>
                  <option value="price-desc">{t("Prezzo decrescente", "Price high to low")}</option>
                </select>
              </div>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {results.map((v) => {
                const category = categories.find((c) => c.id === v.category)!;
                return (
                  <article
                    key={v.id}
                    className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-shadow hover:shadow-elev"
                  >
                    <div className="aspect-[16/10] bg-muted">
                      <img
                        src={v.image}
                        srcSet={v.imageSrcSet}
                        sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 90vw"
                        alt={`${v.model} — ${t("noleggio", "rental")} We Rent`}
                        width={1536}
                        height={1024}
                        loading="lazy"
                        className="size-full object-cover"
                      />
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <Badge className="w-fit rounded-full bg-accent text-accent-foreground">
                        {category.label[lang]}
                      </Badge>
                      <h3 className="mt-3 text-xl">{v.model}</h3>
                      <p className="text-xs text-muted-foreground">{t("o simile", "or similar")}</p>

                      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                        {[
                          { icon: Users, label: t("Posti", "Seats"), value: String(v.seats) },
                          { icon: DoorOpen, label: t("Porte", "Doors"), value: String(v.doors) },
                          { icon: Briefcase, label: t("Bagagli", "Luggage"), value: String(v.luggage) },
                          {
                            icon: Settings2,
                            label: t("Cambio", "Gearbox"),
                            value: v.gearbox === "manuale" ? t("Manuale", "Manual") : t("Automatico", "Automatic"),
                          },
                          { icon: Fuel, label: t("Alimentazione", "Fuel"), value: fuelLabels[v.fuel] ?? v.fuel },
                        ].map((spec) => (
                          <div key={spec.label} className="flex items-center gap-2 rounded-lg bg-secondary/70 px-2.5 py-1.5">
                            <spec.icon className="size-3.5 text-muted-foreground" aria-hidden />
                            <dt className="sr-only">{spec.label}</dt>
                            <dd className="truncate text-xs font-semibold">{spec.value}</dd>
                          </div>
                        ))}
                      </dl>

                      <div className="mt-5 flex items-end justify-between gap-3 pt-2">
                        <p>
                          <span className="eyebrow block">{t("A partire da", "From")}</span>
                          <span className="font-display text-3xl text-primary">€{v.pricePerDay}</span>
                          <span className="text-sm font-semibold text-muted-foreground">
                            /{t("giorno", "day")}
                          </span>
                        </p>
                        <Button asChild className="rounded-full px-6">
                          <Link to="/prenota" search={{ class: v.category }}>
                            {t("Prenota", "Book")}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {results.length === 0 && (
              <p className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                {t(
                  "Nessun veicolo con questi filtri. Prova ad allargare la fascia di prezzo.",
                  "No vehicles match these filters. Try widening the price range.",
                )}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="bg-secondary/60 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="eyebrow">{t("Sempre incluso", "Always included")}</p>
          <h2 className="mt-2 text-3xl font-black sm:text-4xl">{t("Cosa è incluso nel prezzo", "What's included")}</h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {includedItems.map((item) => (
              <li
                key={item.it}
                className={cn("flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-card")}
              >
                <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <span className="text-sm">{item[lang]}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-muted-foreground">
            {t(
              "*Km illimitati sulle tariffe settimanali e mensili; sulle tariffe giornaliere sono inclusi 200 km/giorno.",
              "*Unlimited mileage on weekly and monthly rates; daily rates include 200 km/day.",
            )}
          </p>
        </div>
      </section>
    </>
  );
}
