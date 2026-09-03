import { Link, createFileRoute } from "@tanstack/react-router";
import { JsonLd } from "@/components/json-ld";
import { absoluteUrl, buildBreadcrumbJsonLd } from "@/lib/seo";
import { Building2, Check, FileSignature, Headphones, Loader2, Phone, Receipt, Truck } from "lucide-react";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPartnerLead } from "@/lib/booking.functions";
import { company } from "@/lib/company";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/business")({
  head: () => ({
    meta: [
      { title: "Convenzioni aziendali e noleggio business | We Rent" },
      {
        name: "description",
        content:
          "Tariffe dedicate, contratto quadro, referente dedicato e flotta su misura per aziende, professionisti e team in trasferta.",
      },
      { property: "og:title", content: "Convenzioni aziendali e noleggio business | We Rent" },
      {
        property: "og:description",
        content: "We Rent è il partner di mobilità della tua impresa in Sardegna e a Milano.",
      },
      { property: "og:url", content: absoluteUrl("/business") },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/business") }],
  }),
  component: BusinessPage,
});

const schema = z.object({
  company: z.string().trim().min(2, "Inserisci la ragione sociale").max(120),
  name: z.string().trim().min(2, "Inserisci nome e cognome").max(120),
  email: z.string().trim().email("Email non valida").max(255),
  phone: z.string().trim().max(30).optional(),
  message: z.string().trim().max(1500).optional(),
  // honeypot anti-spam: se compilato, la richiesta è di un bot
  website: z.string().max(0).optional(),
});

function BusinessPage() {
  const { t } = useI18n();
  const [sending, setSending] = useState(false);
  const sendLead = useServerFn(createPartnerLead);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const benefits = [
    {
      icon: Receipt,
      title: t("Tariffe dedicate", "Dedicated rates"),
      body: t(
        "Sconti riservati alle aziende convenzionate, fatturazione elettronica e pagamento a 30 giorni.",
        "Reserved discounts for partner companies, e-invoicing and 30-day payment terms.",
      ),
    },
    {
      icon: FileSignature,
      title: t("Contratto quadro", "Master agreement"),
      body: t(
        "Un unico accordo per tutti i noleggi dei tuoi collaboratori, con condizioni sempre valide.",
        "One agreement covering all your team's rentals, with always-valid conditions.",
      ),
    },
    {
      icon: Headphones,
      title: t("Referente dedicato", "Dedicated contact"),
      body: t(
        "Un contatto diretto per prenotazioni prioritarie e gestione flotta, raggiungibile anche via WhatsApp.",
        "A direct contact for priority bookings and fleet management, also reachable on WhatsApp.",
      ),
    },
    {
      icon: Truck,
      title: t("Flotta su misura", "Tailored fleet"),
      body: t(
        "Auto, premium, van e furgoni fino a 15 m³, disponibili anche per il lungo periodo.",
        "Cars, premium, vans and up to 15 m³ commercial vehicles, also on long-term rental.",
      ),
    },
  ];

  const segments = [
    {
      title: t("Libero professionista", "Freelancer"),
      body: t(
        "Noleggio flessibile senza immobilizzare capitale: paghi solo i giorni che usi, deduzione fiscale sulla fattura.",
        "Flexible rental with no capital tied up: pay only for the days you use, fully invoiced.",
      ),
    },
    {
      title: t("Azienda e PMI", "Company & SME"),
      body: t(
        "Convenzione con tariffe fisse per tutto l'anno, veicoli sostitutivi e supporto logistico per cantieri e sedi distaccate.",
        "Agreement with fixed year-round rates, replacement vehicles and logistics support for sites and branches.",
      ),
    },
    {
      title: t("Giovani conducenti", "Young drivers"),
      body: t(
        "Veicoli abilitati ai neopatentati e conducenti dai 19 anni, con supplemento giovane conducente trasparente.",
        "Vehicles suitable for newly licensed and 19+ drivers, with a transparent young-driver fee.",
      ),
    },
  ];

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const parsed = schema.safeParse(data);

    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] = issue.message;
      setErrors(next);
      return;
    }
    if (parsed.data.website) return; // honeypot

    setErrors({});
    setSending(true);
    try {
      await sendLead({
        data: {
          company_name: parsed.data.company,
          contact_name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.phone ?? "",
          fleet_size: "",
          message: parsed.data.message ?? "",
        },
      });
      form.reset();
      toast.success(
        t(
          "Richiesta inviata: ti ricontattiamo entro 24 ore.",
          "Request sent: we'll get back to you within 24 hours.",
        ),
      );
    } catch (error) {
      toast.error(t("Invio non riuscito", "Sending failed"), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSending(false);
    }
  };


  return (
    <>
      <JsonLd data={buildBreadcrumbJsonLd([{ name: "Business", path: "/business" }])} />
      <section className="bg-gradient-hero">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <p className="eyebrow text-ink/60">Business</p>
          <h1 className="mt-2 max-w-3xl text-4xl text-ink sm:text-5xl">
            {t("La mobilità della tua azienda, ", "Your company's mobility, ")}
            <span className="text-ink/55">{t("semplificata.", "simplified.")}</span>
          </h1>
          <p className="mt-4 max-w-2xl text-ink/80">
            {t(
              "Trasferte, logistica, eventi. We Rent è il partner di mobilità della tua impresa, con soluzioni pensate per team e professionisti.",
              "Business travel, logistics, events. We Rent is your company's mobility partner, with solutions designed for teams and professionals.",
            )}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full px-7">
              <a href="#convenzione">{t("Richiedi convenzione", "Request an agreement")}</a>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full border-ink/20 px-7">
              <a href={company.phoneHref}>
                <Phone className="size-4" />
                {company.phone}
              </a>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b) => (
            <article key={b.title} className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <b.icon className="size-5" aria-hidden />
              </span>
              <h2 className="mt-4 text-lg">{b.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{b.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-secondary/60 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p className="eyebrow">{t("Soluzioni per ogni cliente", "Solutions for every client")}</p>
          <h2 className="mt-2 text-3xl font-black sm:text-4xl">{t("Scegli il tuo profilo", "Choose your profile")}</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {segments.map((s) => (
              <article key={s.title} className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <h3 className="text-lg">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
                <Link
                  to="/flotta"
                  className="mt-4 inline-block text-sm font-bold text-primary hover:underline"
                >
                  {t("Vedi i veicoli", "See vehicles")} →
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="convenzione" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6">
        <div className="grid gap-10 rounded-3xl bg-ink p-8 text-ink-foreground shadow-elev lg:grid-cols-2 lg:p-12">
          <div>
            <h2 className="text-3xl sm:text-4xl">{t("Richiedi una convenzione", "Request an agreement")}</h2>
            <p className="mt-4 text-ink-foreground/75">
              {t(
                "Raccontaci le esigenze della tua azienda: ti ricontattiamo entro 24 ore con una proposta personalizzata.",
                "Tell us your company's needs: we'll come back within 24 hours with a tailored proposal.",
              )}
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              {[
                t("Preventivo dedicato", "Dedicated quote"),
                t("Nessun impegno", "No commitment"),
                t("Referente sempre reperibile", "Account manager always available"),
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <Check className="size-4 text-primary-soft" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-ink-foreground/70">
              {t("Oppure scrivici a ", "Or email us at ")}
              <a href={`mailto:${company.email}`} className="font-semibold underline">
                {company.email}
              </a>
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm text-ink-foreground/70">
              <Building2 className="size-4 text-primary-soft" aria-hidden />
              {company.name} · P.IVA {company.vat}
            </p>
          </div>

          <form onSubmit={onSubmit} className="rounded-2xl bg-card p-6 text-card-foreground shadow-card" noValidate>
            <div className="space-y-4">
              <div>
                <Label htmlFor="company">{t("Azienda *", "Company *")}</Label>
                <Input id="company" name="company" required maxLength={120} className="mt-1.5" />
                {errors["company"] && <p className="mt-1 text-xs text-destructive">{errors["company"]}</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="name">{t("Nome e cognome *", "Full name *")}</Label>
                  <Input id="name" name="name" required maxLength={120} className="mt-1.5" />
                  {errors["name"] && <p className="mt-1 text-xs text-destructive">{errors["name"]}</p>}
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" name="email" type="email" required maxLength={255} className="mt-1.5" />
                  {errors["email"] && <p className="mt-1 text-xs text-destructive">{errors["email"]}</p>}
                </div>
              </div>
              <div>
                <Label htmlFor="phone">{t("Telefono", "Phone")}</Label>
                <Input id="phone" name="phone" type="tel" maxLength={30} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="message">{t("Messaggio", "Message")}</Label>
                <Textarea
                  id="message"
                  name="message"
                  rows={4}
                  maxLength={1500}
                  className="mt-1.5"
                  placeholder={t("Numero di veicoli, periodo, sede…", "Number of vehicles, period, branch…")}
                />
              </div>
              {/* honeypot: invisibile agli utenti, compilato solo dai bot */}
              <div className="hidden" aria-hidden>
                <label htmlFor="website">Website</label>
                <input id="website" name="website" tabIndex={-1} autoComplete="off" />
              </div>
              <Button type="submit" size="lg" className="w-full rounded-full" disabled={sending}>
                {sending && <Loader2 className="size-4 animate-spin" />}
                {t("Invia richiesta", "Send request")}
              </Button>
              <p className="text-xs text-muted-foreground">
                {t(
                  "Inviando accetti il trattamento dei dati secondo la privacy policy.",
                  "By submitting you accept data processing as described in our privacy policy.",
                )}
              </p>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
