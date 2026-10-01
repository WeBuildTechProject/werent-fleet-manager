/**
 * Collegamento al gestionale We Rent (WE RENT MANAGEMENT SYSTEM, API /api/public/v1).
 * Solo lato server: la chiave non arriva mai al browser.
 *
 * Variabili (in sviluppo nel file .env, in produzione come segreto Cloudflare):
 *   WERENT_API_URL  es. http://localhost:8080 sul Mac, https://gestionale.werentsrl.com in produzione
 *   WERENT_API_KEY  chiave creata nel gestionale (Impostazioni → Collegamento con il sito)
 */

export class WerentApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function settings() {
  const url = (process.env["WERENT_API_URL"] ?? "").replace(/\/$/, "");
  const key = process.env["WERENT_API_KEY"] ?? "";
  if (!url || !key)
    throw new WerentApiError(
      503,
      "not_configured",
      "Prenotazione online momentaneamente non disponibile",
    );
  return { url, key };
}

export async function werentApi<T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<T> {
  const { url, key } = settings();
  let res: Response;
  try {
    res = await fetch(`${url}/api/public/v1${path}`, {
      method,
      headers: {
        authorization: `Bearer ${key}`,
        ...(body !== undefined ? { "content-type": "application/json" } : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new WerentApiError(
      503,
      "unreachable",
      "Prenotazione online momentaneamente non disponibile: riprova tra poco o contattaci",
    );
  }
  const text = await res.text();
  const data = text ? (JSON.parse(text) as Record<string, unknown>) : null;
  if (!res.ok) {
    // Errori del gestionale: il messaggio è già scritto per il cliente. Chiave errata o errori interni: messaggio generico.
    const generic = res.status === 401 || res.status >= 500;
    throw new WerentApiError(
      res.status,
      String(data?.["error"] ?? "error"),
      generic && res.status !== 503
        ? "Prenotazione online momentaneamente non disponibile: riprova tra poco o contattaci"
        : String(data?.["message"] ?? "Richiesta non riuscita"),
    );
  }
  return data as T;
}

/** "2026-10-15" + "10:00" ora italiana → istante ISO con fuso (legale o solare). */
export function romeToIso(date: string, time: string): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const [hh, mm] = time.split(":").map(Number) as [number, number];
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const offsetAt = (ms: number) => {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Rome",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(new Date(ms))
        .map((p) => [p.type, p.value]),
    );
    const asUtc = Date.UTC(
      +parts["year"]!,
      +parts["month"]! - 1,
      +parts["day"]!,
      +parts["hour"]!,
      +parts["minute"]!,
    );
    return asUtc - ms;
  };
  const instant = guess - offsetAt(guess - offsetAt(guess));
  return new Date(instant).toISOString();
}
