import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { PUBLIC_SITE_ONLY } from "@/lib/site-mode";

export const Route = createFileRoute("/auth")({
  beforeLoad: () => {
    if (PUBLIC_SITE_ONLY) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Accesso staff — Gestionale We Rent" },
      {
        name: "description",
        content:
          "Area riservata allo staff We Rent: accedi al gestionale per flotta, prenotazioni, calendario disponibilità e partner business.",
      },
      { property: "og:title", content: "Accesso staff — Gestionale We Rent" },
      {
        property: "og:description",
        content: "Area riservata allo staff We Rent per la gestione di flotta e prenotazioni.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Accesso non riuscito", { description: error.message });
      return;
    }
    navigate({ to: "/gestionale" });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/gestionale`,
        data: { full_name: fullName },
      },
    });
    setLoading(false);
    if (error) {
      toast.error("Registrazione non riuscita", { description: error.message });
      return;
    }
    toast.success("Account creato", {
      description: "Se richiesta, conferma l'indirizzo email per completare l'accesso.",
    });
    navigate({ to: "/gestionale" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[--gradient-hero] px-4 py-16">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link to="/" className="font-display text-3xl tracking-tight text-foreground">
            <span className="font-extrabold">we</span>
            <span className="font-extrabold text-primary">rent</span>
          </Link>
          <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-card/80 px-3 py-1 text-xs font-semibold text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary" aria-hidden /> Area gestionale riservata
          </p>
        </div>

        <Card className="border-border/70 shadow-elev">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Accesso staff</CardTitle>
            <CardDescription>
              Gestisci flotta, prenotazioni, calendario disponibilità e partner business.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="w-full">
                <TabsTrigger value="login" className="flex-1">
                  Accedi
                </TabsTrigger>
                <TabsTrigger value="signup" className="flex-1">
                  Nuovo operatore
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={signIn} className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email aziendale</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nome@werentsrl.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full rounded-full" disabled={loading}>
                    {loading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <KeyRound className="size-4" />
                    )}
                    Entra nel gestionale
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={signUp} className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome e cognome</Label>
                    <Input
                      id="name"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Maria Sanna"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-up">Email aziendale</Label>
                    <Input
                      id="email-up"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password-up">Password</Label>
                    <Input
                      id="password-up"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimo 8 caratteri. Il ruolo iniziale è Operatore front desk: un Admin può
                      ampliarlo.
                    </p>
                  </div>
                  <Button type="submit" className="w-full rounded-full" disabled={loading}>
                    {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                    Crea account operatore
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          We Rent S.r.l. · P.IVA 04131090922 ·{" "}
          <Link to="/" className="underline">
            torna al sito
          </Link>
        </p>
      </div>
    </div>
  );
}
