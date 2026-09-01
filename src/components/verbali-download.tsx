import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { FileSignature, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getReservationVerbali } from "@/lib/verbali.functions";
import { VERBALE_LABELS, type VerbaleKind } from "@/lib/verbali";

/**
 * Download dei verbali firmati: il link firmato viene richiesto al click e
 * dura pochi minuti, così non resta mai un URL riutilizzabile nella pagina.
 * Usato sia in area clienti sia nel gestionale.
 */
export function VerbaliDownload({
  reservationId,
  hasConsegna,
  hasRientro,
  size = "sm",
}: {
  reservationId: string;
  hasConsegna: boolean;
  hasRientro: boolean;
  size?: "sm" | "default";
}) {
  const fetchLinks = useServerFn(getReservationVerbali);
  const [pending, setPending] = useState<VerbaleKind | null>(null);

  const kinds = [
    ...(hasConsegna ? (["consegna"] as const) : []),
    ...(hasRientro ? (["rientro"] as const) : []),
  ];
  if (kinds.length === 0) return null;

  async function open(kind: VerbaleKind) {
    setPending(kind);
    try {
      const links = await fetchLinks({ data: { reservationId } });
      const match = links.find((l) => l.kind === kind);
      if (!match) throw new Error("Verbale non disponibile.");
      window.open(match.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error("Verbale non scaricabile", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {kinds.map((kind) => (
        <Button
          key={kind}
          size={size}
          variant="outline"
          className="rounded-full"
          disabled={pending !== null}
          onClick={() => open(kind)}
        >
          {pending === kind ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FileSignature className="size-4" />
          )}
          {VERBALE_LABELS[kind]}
        </Button>
      ))}
    </div>
  );
}
