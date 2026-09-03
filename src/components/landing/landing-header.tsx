import { Link } from "@tanstack/react-router";
import { Phone } from "lucide-react";

import { whatsappHref } from "@/components/whatsapp-fab";
import { WhatsappIcon } from "@/components/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { company } from "@/lib/company";

/**
 * Header minimo per le landing page Google Ads (/noleggio-*): solo wordmark,
 * indicatore di operatività e doppia CTA (telefono + WhatsApp) — niente menu
 * di navigazione verso altre pagine del sito, per non distogliere il
 * visitatore dalla conversione (stessa logica della landing di riferimento
 * webuildtech.eu/elettricista/milano-25min, adattata all'identità We Rent).
 */
export function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link to="/" className="font-display text-2xl tracking-tight text-foreground">
          <span className="font-extrabold">we</span>
          <span className="font-extrabold text-primary">rent</span>
        </Link>

        <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 sm:flex">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-success" />
          </span>
          <span className="text-xs font-semibold text-muted-foreground">Disponibilità in tempo reale</span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            aria-label="WhatsApp"
          >
            <WhatsappIcon className="size-4" outline />
          </a>
          <Button asChild size="sm" className="rounded-full px-4">
            <a href={company.phoneHref}>
              <Phone className="size-4" aria-hidden />
              <span className="hidden sm:inline">{company.phone}</span>
              <span className="sm:hidden">Chiama</span>
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}
