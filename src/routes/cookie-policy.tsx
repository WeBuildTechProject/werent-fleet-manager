import { createFileRoute } from "@tanstack/react-router";

import { company } from "@/lib/company";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/cookie-policy")({
  head: () => ({
    meta: [
      { title: "Cookie Policy | We Rent S.r.l." },
      {
        name: "description",
        content:
          "Quali cookie utilizza il sito We Rent: tecnici, di preferenza e di misurazione, con durata e modalità di gestione dal browser.",
      },
      { property: "og:title", content: "Cookie Policy | We Rent S.r.l." },
      { property: "og:description", content: "Cookie tecnici, di preferenza e di misurazione usati dal sito We Rent." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CookiePage,
});

function CookiePage() {
  const { t } = useI18n();

  const rows = [
    {
      name: "werent.lang",
      type: t("Preferenza (tecnico)", "Preference (technical)"),
      purpose: t("Memorizza la lingua scelta (IT/EN).", "Stores the selected language (IT/EN)."),
      duration: t("Persistente (localStorage)", "Persistent (localStorage)"),
    },
    {
      name: "sb-*-auth-token",
      type: t("Tecnico", "Technical"),
      purpose: t(
        "Mantiene la sessione dell'area riservata operatori e del motore di prenotazione nativo We Rent.",
        "Keeps the staff area and the native We Rent booking engine session.",
      ),
      duration: t("Sessione / persistente", "Session / persistent"),
    },

    {
      name: "_ga / _ga_*",
      type: t("Misurazione (previa scelta)", "Analytics (opt-in)"),
      purpose: t(
        "Statistiche aggregate e anonime sull'uso del sito; attivati solo se acconsenti.",
        "Aggregated anonymous usage statistics; only enabled with your consent.",
      ),
      duration: t("Fino a 13 mesi", "Up to 13 months"),
    },
  ];

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="eyebrow">{t("Informativa", "Notice")}</p>
      <h1 className="mt-2 text-4xl">Cookie Policy</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {t("Ultimo aggiornamento: gennaio 2026", "Last updated: January 2026")}
      </p>

      <p className="mt-8 text-sm leading-relaxed text-muted-foreground">
        {t(
          `Questo sito, gestito da ${company.name}, utilizza cookie e tecnologie analoghe (localStorage) per funzionare correttamente e, previo consenso, per misurarne l'utilizzo. I cookie tecnici non richiedono consenso perché indispensabili all'erogazione del servizio.`,
          `This website, operated by ${company.name}, uses cookies and similar technologies (localStorage) to work properly and, with your consent, to measure usage. Technical cookies need no consent as they are essential to deliver the service.`,
        )}
      </p>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-card shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-secondary/70">
            <tr>
              <th scope="col" className="px-4 py-3 font-bold">{t("Nome", "Name")}</th>
              <th scope="col" className="px-4 py-3 font-bold">{t("Tipo", "Type")}</th>
              <th scope="col" className="px-4 py-3 font-bold">{t("Finalità", "Purpose")}</th>
              <th scope="col" className="px-4 py-3 font-bold">{t("Durata", "Duration")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-t border-border align-top">
                <td className="px-4 py-3 font-mono text-xs">{r.name}</td>
                <td className="px-4 py-3">{r.type}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.purpose}</td>
                <td className="px-4 py-3">{r.duration}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 text-xl">{t("Come gestire i cookie", "Managing cookies")}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {t(
          "Puoi bloccare o cancellare i cookie dalle impostazioni del tuo browser (Chrome, Safari, Firefox, Edge). La disattivazione dei cookie tecnici può compromettere il funzionamento del modulo di prenotazione. Per qualsiasi chiarimento scrivi a ",
          "You can block or delete cookies from your browser settings (Chrome, Safari, Firefox, Edge). Disabling technical cookies may break the booking module. For any clarification write to ",
        )}
        <a href={`mailto:${company.email}`} className="font-semibold text-primary hover:underline">
          {company.email}
        </a>
        .
      </p>
    </section>
  );
}
