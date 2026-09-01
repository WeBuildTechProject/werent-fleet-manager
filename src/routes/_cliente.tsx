import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PUBLIC_SITE_ONLY } from "@/lib/site-mode";

/**
 * Guscio dell'area clienti: gate lato client (la sessione Supabase vive in
 * localStorage) con redirect al login cliente — completamente separato dal
 * gate staff `_authenticated`, che porta invece a /auth.
 */
export const Route = createFileRoute("/_cliente")({
  ssr: false,
  beforeLoad: async () => {
    if (PUBLIC_SITE_ONLY) throw redirect({ to: "/" });
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/area-clienti/accedi" });
    return { user: data.user };
  },
  component: CustomerShell,
});

function CustomerShell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/area-clienti/accedi", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="font-display text-2xl tracking-tight">
              <span className="font-extrabold">we</span>
              <span className="font-extrabold text-primary">rent</span>
            </Link>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
              Area clienti
            </span>
          </div>
          <Button variant="ghost" size="sm" className="rounded-full" onClick={signOut}>
            <LogOut className="mr-2 size-4" /> Esci
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
