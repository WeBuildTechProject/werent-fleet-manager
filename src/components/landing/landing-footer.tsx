import { Link } from "@tanstack/react-router";

import { company } from "@/lib/company";

/**
 * Footer minimo per le landing page Google Ads: dati legali obbligatori e
 * link a privacy/cookie, senza la mappa completa del sito principale (che
 * inviterebbe il visitatore a lasciare la pagina prima di convertire).
 */
export function LandingFooter() {
  return (
    <footer className="bg-ink py-8 text-ink-foreground">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 text-xs text-ink-foreground/60 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          © {new Date().getFullYear()} {company.name} — {company.legalAddress} · P.IVA {company.vat}
        </p>
        <div className="flex items-center gap-4">
          <Link to="/privacy-policy" className="transition-colors hover:text-primary-soft">
            Privacy
          </Link>
          <Link to="/cookie-policy" className="transition-colors hover:text-primary-soft">
            Cookie
          </Link>
          <Link to="/" className="transition-colors hover:text-primary-soft">
            werentsrl.com
          </Link>
        </div>
      </div>
    </footer>
  );
}
