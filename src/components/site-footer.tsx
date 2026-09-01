import { Link } from "@tanstack/react-router";
import { Mail, MapPin, Phone, Share2 } from "lucide-react";
import { toast } from "sonner";

import { branches, company } from "@/lib/company";
import { useI18n } from "@/lib/i18n";
import { PUBLIC_SITE_ONLY } from "@/lib/site-mode";

export function SiteFooter() {
  const { t, lang } = useI18n();

  /** Condivide (o copia) il link diretto all'accesso gestionale: utile allo staff. */
  const shareStaffLink = async () => {
    const url = `${window.location.origin}/auth`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: t("Area gestionale We Rent", "We Rent staff console"), url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success(t("Link copiato", "Link copied"));
    } catch {
      /* condivisione annullata dall'utente */
    }
  };

  return (
    <footer id="site-footer" className="bg-ink text-ink-foreground">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-display text-2xl">
              <span className="font-extrabold">we</span>
              <span className="font-extrabold text-primary-soft">rent</span>
            </p>
            <p className="mt-4 text-sm text-ink-foreground/70">
              {t(
                "Autonoleggio in Sardegna e a Milano. Flotta nuova, tariffe trasparenti, assistenza 24/7.",
                "Car rental in Sardinia and Milan. New fleet, transparent rates, 24/7 support.",
              )}
            </p>
            <p className="mt-6 text-xs text-ink-foreground/50">
              {company.name} · {t("Gruppo", "Part of")} {company.group}
              <br />
              P.IVA {company.vat} · REA {company.rea}
              <br />
              {t("Sede legale", "Registered office")}: {company.legalAddress}
              <br />
              {t("Capitale sociale", "Share capital")} {company.shareCapital} · ATECO {company.ateco}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-ink-foreground/60">
              {t("Naviga", "Explore")}
            </h3>
            <ul className="mt-4 space-y-2 text-sm">
              {[
                { to: "/flotta", label: t("Flotta", "Fleet") },
                { to: "/prenota", label: t("Prenota", "Book now") },
                { to: "/dove-siamo", label: t("Dove siamo", "Locations") },
                { to: "/contatti", label: t("Contatti", "Contact") },
                { to: "/privacy-policy", label: t("Privacy policy", "Privacy policy") },
                { to: "/cookie-policy", label: t("Cookie policy", "Cookie policy") },
              ].map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="text-ink-foreground/75 transition-colors hover:text-primary-soft">
                    {item.label}
                  </Link>
                </li>
              ))}
              {!PUBLIC_SITE_ONLY && (
                <li>
                  <Link to="/area-clienti/accedi" className="text-ink-foreground/75 transition-colors hover:text-primary-soft">
                    {t("Area clienti", "Customer area")}
                  </Link>
                </li>
              )}
              {!PUBLIC_SITE_ONLY && (
                <li className="pt-3">
                  <div className="flex items-center gap-2">
                    <Link
                      to="/auth"
                      className="inline-flex items-center rounded-full border border-ink-foreground/25 px-4 py-1.5 text-xs font-bold text-ink-foreground transition-colors hover:border-primary-soft hover:text-primary-soft"
                    >
                      {t("Area gestionale", "Staff console")}
                    </Link>
                    <button
                      type="button"
                      onClick={shareStaffLink}
                      aria-label={t("Condividi il link dell'area gestionale", "Share the staff console link")}
                      className="inline-flex size-8 items-center justify-center rounded-full text-ink-foreground/60 transition-colors hover:text-primary-soft"
                    >
                      <Share2 className="size-4" aria-hidden />
                    </button>
                  </div>
                </li>
              )}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-ink-foreground/60">
              {t("Per le aziende", "For business")}
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-ink-foreground/75">
              <li>
                <Link to="/business" className="transition-colors hover:text-primary-soft">
                  {t("Convenzioni aziendali", "Corporate agreements")}
                </Link>
              </li>
              <li>
                <Link to="/business" className="transition-colors hover:text-primary-soft">
                  {t("Noleggio a lungo termine", "Long-term rental")}
                </Link>
              </li>
              <li>
                <Link to="/flotta" className="transition-colors hover:text-primary-soft">
                  {t("Veicoli commerciali", "Commercial vehicles")}
                </Link>
              </li>
              <li className="pt-2">
                <a href={`mailto:${company.email}`} className="font-semibold hover:text-primary-soft">
                  {company.email}
                </a>
                <br />
                <a href={company.phoneHref} className="font-semibold hover:text-primary-soft">
                  {company.phone}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-ink-foreground/60">
              {t("Contatti", "Contact")}
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-ink-foreground/75">
              <li className="flex items-center gap-2">
                <Phone className="size-4 text-primary-soft" aria-hidden />
                <a href={company.phoneHref}>{company.phone}</a>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="size-4 text-primary-soft" aria-hidden />
                <a href={`mailto:${company.email}`}>{company.email}</a>
              </li>
              {branches.map((b) => (
                <li key={b.id} className="flex gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary-soft" aria-hidden />
                  <span>
                    <span className="font-semibold text-ink-foreground">{b.city}</span>
                    <br />
                    {b.address}
                    <br />
                    <span className="text-ink-foreground/50">{b.area[lang]}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-ink-foreground/10 pt-6 text-xs text-ink-foreground/50 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {company.name}. {t("Tutti i diritti riservati.", "All rights reserved.")}
          </p>
          <p>{t("*Km illimitati sulle tariffe settimanali e mensili.", "*Unlimited mileage on weekly and monthly rates.")}</p>
        </div>
      </div>
    </footer>
  );
}
