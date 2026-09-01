import { isVehicleAvailable, type Reservation } from "@/lib/gestionale";

/** Helper puri del motore di prenotazione (fuori dal modulo delle server functions). */
export function daysOf(from: string, to: string) {
  return Math.max(1, Math.round((+new Date(to) - +new Date(from)) / 86_400_000));
}

/**
 * Le sedi sono risolte dal loro codice (CAG/OLB/LIN...) leggendo la tabella
 * branches: nessuna mappa di UUID scritta a mano nel client.
 */
export async function resolveBranchId(
  admin: { from: (t: "branches") => any },
  code: string,
): Promise<string> {
  const { data, error } = await admin
    .from("branches")
    .select("id")
    .ilike("code", code)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`Sede non trovata: ${code}`);
  return data.id as string;
}

export { isVehicleAvailable };
export type { Reservation };
