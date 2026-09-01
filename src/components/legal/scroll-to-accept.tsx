import { useEffect, useRef, useState } from "react";
import { ArrowDown, Check } from "lucide-react";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { renderLegalMarkdown } from "@/lib/legal.tsx";

/**
 * Accettazione vincolante: la casella si sblocca solo dopo che il testo è stato
 * scorso fino in fondo. Il riquadro è l'unico punto in cui il documento viene
 * mostrato integralmente in fase di prenotazione, così l'accettazione è
 * documentabile (versione + timestamp salvati sulla prenotazione).
 */
export function ScrollToAccept({
  title,
  content,
  version,
  label,
  checked,
  onCheckedChange,
  scrollHint,
  readHint,
}: {
  title: string;
  content: string | undefined;
  version: number | undefined;
  label: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  scrollHint: string;
  readHint: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [read, setRead] = useState(false);

  useEffect(() => {
    const element = boxRef.current;
    if (!element || read) return;
    const check = () => {
      if (element.scrollTop + element.clientHeight >= element.scrollHeight - 24) setRead(true);
    };
    check();
    element.addEventListener("scroll", check, { passive: true });
    return () => element.removeEventListener("scroll", check);
  }, [read, content]);

  // Se il testo non è ancora disponibile la casella resta bloccata: nessuna
  // accettazione "alla cieca" di un documento non mostrato.
  const unlocked = read && Boolean(content);

  useEffect(() => {
    if (!unlocked && checked) onCheckedChange(false);
  }, [unlocked, checked, onCheckedChange]);

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">{title}</p>
        {version ? (
          <span className="text-xs text-muted-foreground">Versione {version}</span>
        ) : null}
      </div>
      <div
        ref={boxRef}
        tabIndex={0}
        role="region"
        aria-label={title}
        className="h-56 overflow-y-auto rounded-md border border-border bg-background p-4 text-sm"
      >
        {content ? (
          renderLegalMarkdown(content)
        ) : (
          <p className="text-muted-foreground">Caricamento del documento…</p>
        )}
      </div>
      <p
        className={cn(
          "flex items-center gap-2 text-xs",
          unlocked ? "text-primary" : "text-muted-foreground",
        )}
        aria-live="polite"
      >
        {unlocked ? <Check className="size-3.5" aria-hidden /> : <ArrowDown className="size-3.5" aria-hidden />}
        {unlocked ? readHint : scrollHint}
      </p>
      <label className={cn("flex items-start gap-3 text-sm", !unlocked && "opacity-60")}>
        <Checkbox
          checked={checked}
          disabled={!unlocked}
          onCheckedChange={(value) => onCheckedChange(value === true)}
          aria-required
        />
        <span>
          {label} <span className="text-destructive">*</span>
        </span>
      </label>
    </div>
  );
}
