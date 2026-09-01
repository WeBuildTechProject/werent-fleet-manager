import { createFileRoute } from "@tanstack/react-router";

import { useI18n } from "@/lib/i18n";
import { privacySections } from "@/lib/privacy";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | We Rent S.r.l." },
      {
        name: "description",
        content:
          "Informativa privacy di We Rent S.r.l. ai sensi del Regolamento UE 2016/679: dati trattati, finalità, base giuridica, conservazione e diritti.",
      },
      { property: "og:title", content: "Privacy Policy | We Rent S.r.l." },
      { property: "og:description", content: "Come We Rent tratta i dati personali dei clienti." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { t, lang } = useI18n();
  const sections = privacySections(lang);

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="eyebrow">{t("Informativa", "Notice")}</p>
      <h1 className="mt-2 text-4xl">Privacy Policy</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {t("Ultimo aggiornamento: gennaio 2026", "Last updated: January 2026")}
      </p>
      <div className="mt-10 space-y-8">
        {sections.map((section) => (
          <article key={section.heading}>
            <h2 className="text-xl">{section.heading}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{section.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
