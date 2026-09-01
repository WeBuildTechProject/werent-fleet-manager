import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, FileText, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DOCUMENT_LABELS } from "@/lib/documents";
import { getReservationDocuments } from "@/lib/documents.functions";
import { VerbaliDownload } from "@/components/verbali-download";
import { regenerateVerbale } from "@/lib/verbali.functions";
import { VERBALE_LABELS, type VerbaleKind } from "@/lib/verbali";
import { supabase } from "@/integrations/supabase/client";

/**
 * Consultazione staff dei documenti allegati alla prenotazione.
 * Le URL sono firmate lato server e valide 5 minuti: nessun file è pubblico.
 */
export function ReservationDocumentsDialog({
  reservationId,
  code,
  open,
  onOpenChange,
}: {
  reservationId: string;
  code: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const fetchDocs = useServerFn(getReservationDocuments);
  const reservation = useQuery({
    queryKey: ["reservation-verbali", reservationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reservations")
        .select("verbale_consegna_url, verbale_rientro_url, signed_at, checkin_signed_at")
        .eq("id", reservationId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: open,
    staleTime: 60_000,
  });

  const runRegenerate = useServerFn(regenerateVerbale);
  const regenerate = useMutation({
    mutationFn: (kind: VerbaleKind) => runRegenerate({ data: { reservationId, kind } }),
    onSuccess: async () => {
      toast.success("Verbale rigenerato e inviato");
      await reservation.refetch();
    },
    onError: (e: Error) => toast.error("Verbale non rigenerato", { description: e.message }),
  });

  // Evento già firmato ma verbale assente: la generazione automatica è fallita.
  const missing: VerbaleKind[] = [
    ...(reservation.data?.signed_at && !reservation.data?.verbale_consegna_url
      ? (["consegna"] as const)
      : []),
    ...(reservation.data?.checkin_signed_at && !reservation.data?.verbale_rientro_url
      ? (["rientro"] as const)
      : []),
  ];

  const docs = useQuery({
    queryKey: ["reservation-documents", reservationId],
    queryFn: () => fetchDocs({ data: { reservationId } }),
    enabled: open,
    staleTime: 60_000,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Documenti cliente · {code}</DialogTitle>
          <DialogDescription>
            Documenti d'identità e patente forniti dal cliente. Accesso riservato e tracciato: non
            condividere i link, scadono dopo pochi minuti.
          </DialogDescription>
        </DialogHeader>

        {reservation.data?.verbale_consegna_url ||
        reservation.data?.verbale_rientro_url ||
        missing.length > 0 ? (
          <div className="space-y-3 border-b border-border pb-4">
            <p className="text-sm font-medium">Verbali firmati</p>
            <VerbaliDownload
              reservationId={reservationId}
              hasConsegna={Boolean(reservation.data?.verbale_consegna_url)}
              hasRientro={Boolean(reservation.data?.verbale_rientro_url)}
            />
            {missing.map((kind) => (
              <div key={kind} className="flex flex-wrap items-center gap-2">
                <p className="text-xs text-muted-foreground">
                  {VERBALE_LABELS[kind]} non disponibile per un errore di generazione o invio.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  disabled={regenerate.isPending}
                  onClick={() => regenerate.mutate(kind)}
                >
                  {regenerate.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  Rigenera verbale
                </Button>
              </div>
            ))}
          </div>
        ) : null}

        {docs.isLoading ? (
          <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Caricamento…
          </p>
        ) : docs.error ? (
          <p className="py-6 text-sm text-destructive">{(docs.error as Error).message}</p>
        ) : (docs.data ?? []).length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            Nessun documento allegato a questa prenotazione.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {(docs.data ?? []).map((doc) => (
              <div key={doc.id} className="space-y-2 rounded-lg border border-border p-3">
                <p className="text-sm font-medium">{DOCUMENT_LABELS[doc.tipo].it}</p>
                {doc.isPdf ? (
                  <span className="flex h-28 items-center justify-center rounded-md bg-muted">
                    <FileText className="size-8 text-muted-foreground" />
                  </span>
                ) : (
                  <img
                    src={doc.url}
                    alt={DOCUMENT_LABELS[doc.tipo].it}
                    className="h-28 w-full rounded-md object-cover"
                  />
                )}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(doc.caricato_at).toLocaleDateString("it-IT")}
                  </span>
                  <Button asChild size="sm" variant="outline" className="rounded-full">
                    <a href={doc.url} target="_blank" rel="noreferrer">
                      <Download className="size-4" /> Apri
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
