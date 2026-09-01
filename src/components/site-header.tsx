import { Link } from "@tanstack/react-router";
import { Globe, Menu, Phone } from "lucide-react";
import { useState } from "react";

import { whatsappHref } from "@/components/whatsapp-fab";
import { WhatsappIcon } from "@/components/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { company } from "@/lib/company";
import { useI18n } from "@/lib/i18n";
import { PUBLIC_SITE_ONLY } from "@/lib/site-mode";
import { cn } from "@/lib/utils";

function Wordmark() {
  return (
    <Link to="/" className="font-display text-2xl tracking-tight text-foreground">
      <span className="font-extrabold">we</span>
      <span className="font-extrabold text-primary">rent</span>
    </Link>
  );
}

function LangSwitch() {
  const { lang, setLang } = useI18n();
  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1">
      <Globe className="size-3.5 text-muted-foreground" aria-hidden />
      {(["it", "en"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-bold uppercase transition-colors",
            lang === code
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {code}
        </button>
      ))}
    </div>
  );
}

export function SiteHeader() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const nav = [
    { to: "/", label: t("Home", "Home") },
    { to: "/flotta", label: t("Flotta", "Fleet") },
    { to: "/business", label: t("Business", "Business") },
    { to: "/dove-siamo", label: t("Dove siamo", "Locations") },
    { to: "/contatti", label: t("Contatti", "Contact") },
  ] as const;

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Wordmark />

        <nav
          className="hidden items-center gap-5 lg:flex lg:gap-7"
          aria-label={t("Navigazione principale", "Main navigation")}
        >
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "text-primary" }}
              inactiveProps={{ className: "text-foreground/80 hover:text-foreground" }}
              className="text-sm font-semibold transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <LangSwitch />
          <a
            href={company.phoneHref}
            className="text-muted-foreground transition-colors hover:text-primary"
            aria-label={t("Chiama We Rent", "Call We Rent")}
          >
            <Phone className="size-4" />
          </a>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground transition-colors hover:text-primary"
            aria-label="WhatsApp"
          >
            <WhatsappIcon className="size-4" outline />
          </a>
          <a href={company.phoneHref} className="hidden text-sm font-bold xl:inline">
            {company.phone}
          </a>
          {!PUBLIC_SITE_ONLY && (
            <Link
              to="/area-clienti/accedi"
              className="text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
            >
              {t("Area clienti", "Customer area")}
            </Link>
          )}
          <Button asChild size="sm" className="rounded-full px-5">
            <Link to="/prenota">{t("Prenota", "Book now")}</Link>
          </Button>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <LangSwitch />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label={t("Apri il menu", "Open menu")}>
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] sm:w-80">
              <SheetTitle className="text-left">{t("Menu", "Menu")}</SheetTitle>
              <nav className="mt-6 flex flex-col gap-1">
                {nav.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-3 text-base font-semibold hover:bg-secondary"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-6 space-y-3 border-t border-border pt-6">
                <Button asChild className="w-full rounded-full">
                  <Link to="/prenota" onClick={() => setOpen(false)}>
                    {t("Prenota", "Book now")}
                  </Link>
                </Button>
                {!PUBLIC_SITE_ONLY && (
                  <Link
                    to="/area-clienti/accedi"
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-3 py-3 text-base font-semibold text-muted-foreground hover:bg-secondary"
                  >
                    {t("Area clienti", "Customer area")}
                  </Link>
                )}
                <a href={company.phoneHref} className="block text-sm font-bold">
                  {company.phone}
                </a>
                <a href={`mailto:${company.email}`} className="block text-sm text-muted-foreground">
                  {company.email}
                </a>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
