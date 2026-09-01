import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Car, ClipboardList, Search, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { globalSearch, type SearchResult } from "@/lib/search.functions";
import { cn } from "@/lib/utils";

const groupMeta = {
  reservation: { label: "Prenotazioni", icon: ClipboardList },
  vehicle: { label: "Veicoli", icon: Car },
  customer: { label: "Clienti", icon: Users },
} as const;

const groupOrder = ["reservation", "vehicle", "customer"] as const;

/** Ricerca globale: targa, nome cliente o codice prenotazione da qualunque sezione. */
export function GlobalSearch() {
  const navigate = useNavigate();
  const run = useServerFn(globalSearch);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 300);
    return () => clearTimeout(t);
  }, [term]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }
      if (e.key === "/" && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const enabled = debounced.length >= 2;
  const { data, isFetching } = useQuery({
    queryKey: ["gestionale", "global-search", debounced],
    queryFn: () => run({ data: { query: debounced } }),
    enabled,
    staleTime: 30_000,
  });

  const results: SearchResult[] = useMemo(() => data?.results ?? [], [data]);
  const flat = useMemo(
    () => groupOrder.flatMap((kind) => results.filter((r) => r.kind === kind)),
    [results],
  );

  useEffect(() => setActive(0), [debounced, results.length]);

  function go(result: SearchResult) {
    setOpen(false);
    setTerm("");
    navigate({
      to: result.to,
      ...(result.search ? { search: result.search } : {}),
    } as never);
  }

  return (
    <div ref={containerRef} className="relative hidden w-44 shrink-0 md:block xl:w-56 2xl:w-72">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/50"
        aria-hidden
      />
      <Input
        ref={inputRef}
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => (flat.length ? (i + 1) % flat.length : 0));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (flat.length ? (i - 1 + flat.length) % flat.length : 0));
          } else if (e.key === "Enter") {
            const target = flat[active];
            if (target) {
              e.preventDefault();
              go(target);
            }
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="Cerca targa, cliente, codice…"
        aria-label="Ricerca globale gestionale"
        className="border-white/15 bg-white/10 pl-9 text-white placeholder:text-white/50 focus-visible:ring-white/40"
      />

      {open && enabled ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg">
          {isFetching && flat.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">Ricerca in corso…</p>
          ) : flat.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">Nessun risultato</p>
          ) : (
            groupOrder.map((kind) => {
              const items = results.filter((r) => r.kind === kind);
              if (items.length === 0) return null;
              const meta = groupMeta[kind];
              return (
                <div key={kind} className="py-1">
                  <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {meta.label}
                  </p>
                  {items.map((item) => {
                    const isActive = flat[active]?.id === item.id && flat[active]?.kind === kind;
                    return (
                      <button
                        key={`${kind}-${item.id}`}
                        type="button"
                        onMouseEnter={() => setActive(flat.indexOf(item))}
                        onClick={() => go(item)}
                        className={cn(
                          "flex w-full items-start gap-2 rounded-md px-3 py-2 text-left text-sm",
                          isActive ? "bg-secondary" : "hover:bg-secondary/60",
                        )}
                      >
                        <meta.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                        <span className="min-w-0">
                          <span className="block font-semibold">{item.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {item.subtitle}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
