import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Car,
  Building2,
  LayoutDashboard,
  LogOut,
  ChartNoAxesCombined,
  ClipboardList,
  FileCheck2,
  Landmark,
  Menu,
  Receipt,
  ShieldCheck,
  Tags,
  Users,
  Lock,
  Settings,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { GlobalSearch } from "@/components/gestionale/global-search";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { myRolesQuery, roleLabels } from "@/lib/gestionale";
import { canAccess, highestRole, landingSection, type Section } from "@/lib/roles";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/gestionale", label: "Cruscotto", icon: LayoutDashboard, exact: true, section: "dashboard" },
  { to: "/gestionale/analytics", label: "Analytics", icon: ChartNoAxesCombined, exact: false, section: "analytics" },
  { to: "/gestionale/calendario", label: "Disponibilità", icon: CalendarDays, exact: false, section: "calendario" },
  { to: "/gestionale/prenotazioni", label: "Prenotazioni", icon: ClipboardList, exact: false, section: "prenotazioni" },
  { to: "/gestionale/veicoli", label: "Flotta", icon: Car, exact: false, section: "veicoli" },
  { to: "/gestionale/clienti", label: "Clienti", icon: Users, exact: false, section: "clienti" },
  { to: "/gestionale/partner", label: "Partner business", icon: Building2, exact: false, section: "partner" },
  { to: "/gestionale/fatture", label: "Documenti fiscali", icon: Receipt, exact: false, section: "fatture" },
  { to: "/gestionale/tariffe", label: "Catalogo tariffe", icon: Tags, exact: false, section: "tariffe" },
  { to: "/gestionale/cargos", label: "Comunicazioni CaRGOS", icon: Landmark, exact: false, section: "cargos" },
] as const satisfies readonly {
  to: string;
  label: string;
  icon: typeof Car;
  exact: boolean;
  section: Section;
}[];

const administrationNav = [
  { to: "/gestionale/documenti-legali", label: "Documenti legali", icon: ShieldCheck, section: "documenti_legali" },
  { to: "/gestionale/verbali", label: "Verbali e comunicazioni", icon: FileCheck2, section: "verbali" },
  { to: "/gestionale/utenti", label: "Utenti e ruoli", icon: ShieldCheck, section: "utenti" },
] as const satisfies readonly {
  to: string;
  label: string;
  icon: typeof ShieldCheck;
  section: Section;
}[];

const sectionPath: Record<Section, string> = {
  dashboard: "/gestionale",
  analytics: "/gestionale/analytics",
  calendario: "/gestionale/calendario",
  prenotazioni: "/gestionale/prenotazioni",
  veicoli: "/gestionale/veicoli",
  clienti: "/gestionale/clienti",
  partner: "/gestionale/partner",
  fatture: "/gestionale/fatture",
  tariffe: "/gestionale/tariffe",
  cargos: "/gestionale/cargos",
  documenti_legali: "/gestionale/documenti-legali",
  utenti: "/gestionale/utenti",
  verbali: "/gestionale/verbali",
};

export function AdminShell({
  title,
  subtitle,
  actions,
  section,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Sezione richiesta: se il ruolo non la include, il contenuto è negato. */
  section?: Section;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: roles, isLoading: rolesLoading } = useQuery(myRolesQuery);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const isActive = (to: string, exact: boolean) =>
    exact ? pathname === to : pathname.startsWith(to);

  const visibleNav = nav.filter((item) => canAccess(roles, item.section));
  const visibleAdministrationNav = administrationNav.filter((item) => canAccess(roles, item.section));
  const topRole = highestRole(roles);
  const denied = Boolean(section) && !rolesLoading && !canAccess(roles, section!);
  const fallback = landingSection(roles);

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b border-border bg-[oklch(0.16_0.01_250)] text-white">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-4 px-4">
          <Link to="/gestionale" className="font-display text-xl tracking-tight">
            <span className="font-extrabold">we</span>
            <span className="font-extrabold text-primary-soft">rent</span>
            <span className="ml-2 text-xs font-semibold uppercase tracking-widest text-white/50">
              gestionale
            </span>
          </Link>

          <nav className="ml-4 hidden min-w-0 items-center gap-1 overflow-hidden xl:flex" aria-label="Navigazione gestionale">
            {visibleNav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition-colors",
                  isActive(item.to, item.exact)
                    ? "bg-white/15 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white",
                )}
              >
                <item.icon className="size-4" aria-hidden />
                {item.label}
              </Link>
            ))}
            {visibleAdministrationNav.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="text-white/70 hover:bg-white/10 hover:text-white">
                    <Settings className="size-4" aria-hidden /> Amministrazione
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Amministrazione</DropdownMenuLabel>
                  {visibleAdministrationNav.map((item) => (
                    <DropdownMenuItem key={item.to} asChild>
                      <Link to={item.to}>
                        <item.icon className="size-4" aria-hidden /> {item.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <GlobalSearch />
            {topRole ? (
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {roleLabels[topRole]}
              </Badge>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              onClick={signOut}
              className="text-white/80 hover:bg-white/10 hover:text-white"
            >
              <LogOut className="size-4" /> Esci
            </Button>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button size="icon" variant="ghost" className="xl:hidden text-white" aria-label="Menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[80vw] sm:w-72">
                <SheetTitle className="text-left">Gestionale</SheetTitle>
                <nav className="mt-6 flex flex-col gap-1">
                  {visibleNav.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold hover:bg-secondary"
                    >
                      <item.icon className="size-4" aria-hidden />
                      {item.label}
                    </Link>
                  ))}
                  {visibleAdministrationNav.length > 0 ? (
                    <>
                      <p className="mt-4 px-3 text-xs font-semibold uppercase text-muted-foreground">Amministrazione</p>
                      {visibleAdministrationNav.map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setOpen(false)}
                          className="inline-flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold hover:bg-secondary"
                        >
                          <item.icon className="size-4" aria-hidden /> {item.label}
                        </Link>
                      ))}
                    </>
                  ) : null}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-4 py-6">
        {denied ? (
          <Card className="mx-auto mt-10 max-w-md space-y-3 p-8 text-center">
            <Lock className="mx-auto size-8 text-muted-foreground" aria-hidden />
            <h1 className="font-display text-2xl">Sezione non accessibile</h1>
            <p className="text-sm text-muted-foreground">
              Il tuo ruolo{topRole ? ` (${roleLabels[topRole]})` : ""} non ha accesso a questa
              sezione del gestionale. Contatta un amministratore se ti serve.
            </p>
            {fallback ? (
              <Button asChild className="rounded-full">
                <Link to={sectionPath[fallback]}>Vai a una sezione consentita</Link>
              </Button>
            ) : null}
          </Card>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl tracking-tight text-foreground">{title}</h1>
                {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
              </div>
              {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
            </div>
            {children}
          </>
        )}
      </div>
    </div>
  );
}
