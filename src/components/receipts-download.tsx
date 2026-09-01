import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { getReservationReceipts } from "@/lib/receipts.functions";

const euro = (v: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(v);

/**
 * Ricevute di pagamento scaricabili, accanto ai verbali della prenotazione.
 * L'elenco è caricato dal server; l'URL firmato dura pochi minuti.
 */
export function ReceiptsDownload({
  reservationId,
  size = "sm",
}: {
  reservationId: string;
  size?: "sm" | "default";
}) {
  const fetchReceipts = useServerFn(getReservationReceipts);
  const [pending, setPending] = useState<string | null>(null);
  const { data } = useQuery({
    queryKey: ["ricevute", reservationId],
    queryFn: () => fetchReceipts({ data: { reservationId } }),
    staleTime: 60_000,
  });

  const receipts = data ?? [];
  if (receipts.length === 0) return null;

  async function open(paymentId: string) {
    setPending(paymentId);
    try {
      const links = await fetchReceipts({ data: { reservationId } });
      const match = links.find((l) => l.paymentId === paymentId);
      if (!match) throw new Error("Ricevuta non disponibile.");
      window.open(match.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error("Ricevuta non scaricabile", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {receipts.map((r) => (
        <Button
          key={r.paymentId}
          size={size}
          variant="outline"
          className="rounded-full"
          disabled={pending !== null}
          onClick={() => open(r.paymentId)}
        >
          {pending === r.paymentId ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Receipt className="size-4" />
          )}
          Ricevuta {euro(r.amount)}
        </Button>
      ))}
    </div>
  );
}
