import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useConsent } from "@/lib/tracking";
import { useI18n } from "@/lib/i18n";

export function CookieBanner() {
  const { bannerOpen, consent, save } = useConsent();
  const { t } = useI18n();
  const [custom, setCustom] = useState(false);
  const [analytics, setAnalytics] = useState(consent?.analytics ?? false);
  const [marketing, setMarketing] = useState(consent?.marketing ?? false);

  if (!bannerOpen) return null;

  return (
    <div
      role="dialog"
      aria-label={t("Preferenze cookie", "Cookie preferences")}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 p-4 shadow-card backdrop-blur"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">
            {t("Rispettiamo la tua privacy", "We respect your privacy")}
          </p>
          <p className="mt-1">
            {t(
              "Usiamo cookie tecnici indispensabili e, solo con il tuo consenso, cookie di misurazione e marketing per le campagne pubblicitarie. ",
              "We use essential technical cookies and, only with your consent, analytics and marketing cookies for advertising campaigns. ",
            )}
            <Link to="/cookie-policy" className="font-semibold text-primary hover:underline">
              {t("Cookie Policy", "Cookie Policy")}
            </Link>
          </p>

          {custom ? (
            <div className="mt-3 space-y-2">
              <label className="flex items-center gap-3">
                <Switch checked disabled aria-readonly />
                <span>{t("Necessari (sempre attivi)", "Necessary (always on)")}</span>
              </label>
              <label className="flex items-center gap-3">
                <Switch checked={analytics} onCheckedChange={setAnalytics} />
                <span>{t("Misurazione", "Analytics")}</span>
              </label>
              <label className="flex items-center gap-3">
                <Switch checked={marketing} onCheckedChange={setMarketing} />
                <span>{t("Marketing (Google Ads)", "Marketing (Google Ads)")}</span>
              </label>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {custom ? (
            <Button
              className="rounded-full"
              onClick={() => save({ necessary: true, analytics, marketing })}
            >
              {t("Salva preferenze", "Save preferences")}
            </Button>
          ) : (
            <Button variant="outline" className="rounded-full" onClick={() => setCustom(true)}>
              {t("Personalizza", "Customise")}
            </Button>
          )}
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => save({ necessary: true, analytics: false, marketing: false })}
          >
            {t("Solo necessari", "Necessary only")}
          </Button>
          <Button
            className="rounded-full"
            onClick={() => save({ necessary: true, analytics: true, marketing: true })}
          >
            {t("Accetta tutto", "Accept all")}
          </Button>
        </div>
      </div>
    </div>
  );
}
