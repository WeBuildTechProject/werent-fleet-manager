import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestCustomerMagicLink } from "@/lib/customer-portal.functions";
import { PUBLIC_SITE_ONLY } from "@/lib/site-mode";

export const Route = createFileRoute("/area-clienti/accedi")({
  beforeLoad: () => {
    if (PUBLIC_SITE_ONLY) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Accedi all'area clienti — We Rent" },
      {
        name: "description",
        content:
          "Accedi all'area clienti We Rent con un link sicuro via email: consulta i tuoi noleggi, scarica le fatture e gestisci i consensi privacy.",
      },
      { property: "og:title", content: "Accedi all'area clienti — We Rent" },
      {
        property: "og:description",
        content: "Link di accesso via email per consultare noleggi, fatture e consensi We Rent.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CustomerLoginPage,
});

function CustomerLoginPage() {
  const sendLink = useServerFn(requestCustomerMagicLink);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await sendLink({ data: { email: email.trim(), origin: window.location.origin } });
      setSent(true);
    } catch (error) {
      toast.error("Richiesta non riuscita", {
        description: error instanceof Error ? error.message : "Riprova più tardi.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[--gradient-hero] px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link to="/" className="font-display text-3xl tracking-tight text-foreground">
            <span className="font-extrabold">we</span>
            <span className="font-extrabold text-primary">rent</span>
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">Area clienti</p>
        </div>

        <Card className="rounded-3xl border-border/60 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ShieldCheck className="size-5 text-primary" /> Accesso senza password
            </CardTitle>
            <CardDescription>
              Inserisci l&apos;email usata per il noleggio: ti inviamo un link di accesso valido una
              sola volta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3 rounded-2xl bg-secondary p-4">
                  <Mail className="mt-0.5 size-5 shrink-0 text-primary" />
                  <p>
                    Se l&apos;indirizzo è presente nella nostra anagrafica, riceverai a breve
                    un&apos;email con il link di accesso. Controlla anche la cartella spam.
                  </p>
                </div>
                <Button variant="outline" className="w-full rounded-full" onClick={() => setSent(false)}>
                  Usa un altro indirizzo
                </Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer-email">Email</Label>
                  <Input
                    id="customer-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@esempio.it"
                  />
                </div>
                <Button type="submit" className="w-full rounded-full" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Inviami il link di accesso
                </Button>
              </form>
            )}
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Sei dello staff We Rent?{" "}
              <Link to="/auth" className="font-semibold text-primary">
                Accedi al gestionale
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
