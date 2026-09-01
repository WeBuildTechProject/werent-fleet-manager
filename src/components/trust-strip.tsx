import { BadgeCheck, Clock, MapPin, ShieldCheck } from "lucide-react";

import { useI18n } from "@/lib/i18n";

export function TrustStrip() {
  const { t } = useI18n();

  const items = [
    { icon: MapPin, value: "3", label: t("sedi operative: Cagliari, Olbia, Milano Linate", "operating branches: Cagliari, Olbia, Milan Linate") },
    { icon: Clock, value: "24/7", label: t("assistenza stradale, anche di notte", "roadside assistance, day and night") },
    { icon: BadgeCheck, value: "48h", label: t("cancellazione gratuita entro le 48 ore prima del ritiro", "free cancellation up to 48 hours before pick-up") },
    { icon: ShieldCheck, value: "RCA", label: t("e IVA sempre incluse nel prezzo", "and VAT always included in the price") },
  ];

  return (
    <section className="border-y border-border bg-secondary/60">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.value + item.label} className="flex items-start gap-3">
            <item.icon className="mt-1 size-5 shrink-0 text-primary" aria-hidden />
            <p className="text-sm text-muted-foreground">
              <span className="block font-display text-2xl text-foreground">{item.value}</span>
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
