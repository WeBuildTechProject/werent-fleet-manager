import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

/**
 * Header di sicurezza + CSP, applicati solo agli host di produzione (apex,
 * www e il sottodominio *.workers.dev di collaudo) per non rompere ambienti
 * di sviluppo/preview con hostname diversi.
 *
 * NOTA: niente CSP a nonce/'strict-dynamic' qui — la versione installata di
 * @tanstack/react-start (1.168.32) non stampa alcun nonce sui tag <script>
 * generati, quindi uno script-src basato su nonce bloccherebbe l'intero
 * bundle. Si usa invece un allowlist esplicito, più permissivo su script-src
 * ma comunque efficace su frame-src/object-src/base-uri — da rivedere se in
 * futuro si aggiorna il framework con supporto nonce nativo.
 */
const PRODUCTION_HOSTS = new Set(["www.werentsrl.com", "werentsrl.com"]);

// Origine Supabase del progetto We Rent.
const SUPABASE_ORIGIN = "https://yjirojfrrxukhioxgxhq.supabase.co";
const SUPABASE_WS_ORIGIN = "wss://yjirojfrrxukhioxgxhq.supabase.co";

function contentSecurityPolicy(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src 'self' ${SUPABASE_ORIGIN} ${SUPABASE_WS_ORIGIN}`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    // RentHub (motore di prenotazione, iframe) e Google Maps (embed sede) —
    // gli unici due iframe di terze parti usati dal sito pubblico.
    "frame-src 'self' https://werentsardegna.renthubsoftware.com https://www.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

/** Applica gli header di sicurezza a ogni risposta sugli host di produzione. */
function withSecurityHeaders(response: Response, request: Request): Response {
  const headers = new Headers(response.headers);
  const host = new URL(request.url).hostname;
  const isProduction = PRODUCTION_HOSTS.has(host) || host.endsWith(".workers.dev");

  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set(
    "permissions-policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  );
  headers.set("cross-origin-opener-policy", "same-origin");
  headers.set("cross-origin-resource-policy", "same-origin");
  headers.set("x-dns-prefetch-control", "off");
  headers.set("x-permitted-cross-domain-policies", "none");

  if (isProduction) {
    headers.set("strict-transport-security", "max-age=63072000; includeSubDomains; preload");
    headers.set("x-frame-options", "SAMEORIGIN");
    headers.set("content-security-policy", contentSecurityPolicy());
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/** Redirect permanente dall'apice al www canonico. */
function apexRedirect(request: Request): Response | null {
  const url = new URL(request.url);
  if (url.hostname !== "werentsrl.com") return null;
  url.hostname = "www.werentsrl.com";
  url.protocol = "https:";
  return Response.redirect(url.toString(), 301);
}

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const redirect = apexRedirect(request);
      if (redirect) return redirect;

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return withSecurityHeaders(await normalizeCatastrophicSsrResponse(response), request);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
