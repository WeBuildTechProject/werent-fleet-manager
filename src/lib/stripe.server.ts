/**
 * Client Stripe minimale basato su fetch: compatibile con il runtime edge
 * (nessun SDK Node, nessun binario nativo).
 *
 * STATO NOTO E DICHIARATO — le chiavi Stripe sono lette solo da variabili
 * d'ambiente server (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET). Finché non
 * sono configurate, il flusso pubblico degrada elegantemente mostrando
 * "pagamento in sede" come unica opzione: nessun errore, nessun placeholder
 * hardcoded. Lo stesso vale per il webhook, che rifiuta le chiamate se il
 * segreto non è presente.
 */

const STRIPE_API = "https://api.stripe.com/v1";

export function stripeSecretKey(): string | null {
  const key = process.env["STRIPE_SECRET_KEY"];
  return key && key.trim().length > 0 ? key.trim() : null;
}

export function stripeWebhookSecret(): string | null {
  const key = process.env["STRIPE_WEBHOOK_SECRET"];
  return key && key.trim().length > 0 ? key.trim() : null;
}

export function isStripeConfigured(): boolean {
  return stripeSecretKey() !== null;
}

/** Serializza un oggetto annidato nel formato form-urlencoded atteso da Stripe. */
function encodeForm(data: Record<string, unknown>, prefix = ""): string[] {
  const parts: string[] = [];
  for (const [rawKey, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    const key = prefix ? `${prefix}[${rawKey}]` : rawKey;
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (item !== null && typeof item === "object") {
          parts.push(...encodeForm(item as Record<string, unknown>, `${key}[${i}]`));
        } else {
          parts.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(String(item))}`);
        }
      });
    } else if (typeof value === "object") {
      parts.push(...encodeForm(value as Record<string, unknown>, key));
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts;
}

export async function stripeRequest<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const key = stripeSecretKey();
  if (!key) throw new Error("Pagamenti online non configurati.");

  const res = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: encodeForm(body).join("&"),
  });
  const json = (await res.json()) as { error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message ?? "Errore Stripe");
  return json as T;
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Verifica la firma `Stripe-Signature` (schema v1) sul payload grezzo.
 * Nessun evento viene processato se la firma non è valida.
 */
export async function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string | null,
  toleranceSeconds = 300,
): Promise<boolean> {
  const secret = stripeWebhookSecret();
  if (!secret || !signatureHeader) return false;

  const parts = signatureHeader.split(",").map((p) => p.trim().split("="));
  const timestamp = parts.find((p) => p[0] === "t")?.[1];
  const signatures = parts.filter((p) => p[0] === "v1").map((p) => p[1] ?? "");
  if (!timestamp || signatures.length === 0) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSeconds) return false;

  const expected = await hmacSha256Hex(secret, `${timestamp}.${rawBody}`);
  return signatures.some((s) => timingSafeEqualHex(s, expected));
}
