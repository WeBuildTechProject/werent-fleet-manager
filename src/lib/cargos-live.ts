import { createCipheriv } from "node:crypto";

import {
  CARGOS_RECORD_LENGTH,
  CIFRATURA_VERIFICATA,
  TRACCIATO_VERIFICATO,
  type CargosClient,
  type CargosOutcome,
} from "@/lib/cargos";

/**
 * Adapter REALE verso il portale CaRGOS della Polizia di Stato.
 *
 * NON è attivo per default: viene istanziato solo se `CARGOS_MODE=live` e se
 * tutte le credenziali sono presenti fra le variabili d'ambiente. In più, fino
 * a quando il tracciato non è stato verificato riga per riga sul manuale
 * ufficiale, l'invio definitivo è bloccato: serve l'assenso esplicito
 * `CARGOS_TRACCIATO_VERIFICATO=true`. Lo stesso vale per la cifratura del token
 * (`CARGOS_CIFRATURA_VERIFICATA=true`): sono due blocchi indipendenti e
 * cumulativi.
 */

const DEFAULT_BASE_URL = "https://cargos.poliziadistato.it/CARGOS_API/";

export type CargosLiveConfig = {
  baseUrl: string;
  username: string;
  password: string;
  apiKey: string;
  organization: string;
  tracciatoVerificato: boolean;
  cifraturaVerificata: boolean;
};

export function readCargosLiveConfig(): CargosLiveConfig | null {
  const username = process.env["CARGOS_USERNAME"];
  const password = process.env["CARGOS_PASSWORD"];
  const apiKey = process.env["CARGOS_APIKEY"];
  const organization = process.env["CARGOS_ORGANIZATION"];
  if (!username || !password || !apiKey || !organization) return null;
  return {
    baseUrl: process.env["CARGOS_BASE_URL"] || DEFAULT_BASE_URL,
    username,
    password,
    apiKey,
    organization,
    tracciatoVerificato:
      TRACCIATO_VERIFICATO || process.env["CARGOS_TRACCIATO_VERIFICATO"] === "true",
    cifraturaVerificata:
      CIFRATURA_VERIFICATA || process.env["CARGOS_CIFRATURA_VERIFICATA"] === "true",
  };
}

/**
 * Cifratura del token con l'ApiKey, come richiesto dal manuale: AES quando
 * l'ApiKey è lunga almeno 48 caratteri, 3DES quando è lunga almeno 24.
 * Usa esclusivamente le primitive di `node:crypto` (nessuna cifratura scritta a
 * mano). Modalità ECB e output base64 sono l'ipotesi più plausibile e vanno
 * confermate sul manuale prima dei test reali: da qui il blocco
 * `CARGOS_CIFRATURA_VERIFICATA`.
 */
export function encryptCargosToken(token: string, apiKey: string): string {
  const keyBytes = Buffer.from(apiKey, "utf8");
  if (keyBytes.length >= 48) {
    const cipher = createCipheriv("aes-256-ecb", keyBytes.subarray(0, 32), null);
    return Buffer.concat([cipher.update(token, "utf8"), cipher.final()]).toString("base64");
  }
  if (keyBytes.length >= 24) {
    const cipher = createCipheriv("des-ede3", keyBytes.subarray(0, 24), null);
    return Buffer.concat([cipher.update(token, "utf8"), cipher.final()]).toString("base64");
  }
  throw new Error(
    `ApiKey CaRGOS troppo corta (${keyBytes.length} caratteri): servono almeno 24 caratteri per 3DES o 48 per AES.`,
  );
}

function joinUrl(base: string, path: string) {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function messagesFrom(payload: unknown): string[] {
  if (payload == null) return [];
  if (typeof payload === "string") return payload.trim() ? [payload.trim()] : [];
  if (Array.isArray(payload)) return payload.flatMap(messagesFrom);
  if (typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    const candidates = [obj["Messaggio"], obj["messaggio"], obj["Errori"], obj["errori"], obj["Message"]];
    return candidates.flatMap(messagesFrom);
  }
  return [];
}

export function createCargosLiveClient(config: CargosLiveConfig): CargosClient {
  let cachedToken: { value: string; expiresAt: number } | null = null;

  async function getToken() {
    if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.value;
    const basic = btoa(`${config.username}:${config.password}`);
    const response = await fetch(joinUrl(config.baseUrl, "api/Token"), {
      method: "GET",
      headers: {
        Authorization: `Basic ${basic}`,
        ApiKey: config.apiKey,
        Organization: config.organization,
        Accept: "application/json",
      },
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`CaRGOS api/Token ha risposto ${response.status}: ${text.slice(0, 300)}`);
    }
    let token: string | null = null;
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      token =
        (parsed["token"] as string) ??
        (parsed["Token"] as string) ??
        (parsed["access_token"] as string) ??
        null;
    } catch {
      token = text.replace(/"/g, "").trim() || null;
    }
    if (!token) throw new Error("CaRGOS api/Token: risposta senza token.");
    // Il Bearer da usare è il token CIFRATO con l'ApiKey, non il token grezzo.
    const encrypted = encryptCargosToken(token, config.apiKey);
    // Durata non documentata in modo affidabile: cache prudenziale di 10 minuti.
    cachedToken = { value: encrypted, expiresAt: Date.now() + 10 * 60_000 };
    return encrypted;
  }

  async function post(path: string, records: string[]): Promise<CargosOutcome> {
    const wrong = records.filter((r) => r.length !== CARGOS_RECORD_LENGTH);
    if (wrong.length > 0) {
      return {
        ok: false,
        messages: [`${wrong.length} record con lunghezza diversa da ${CARGOS_RECORD_LENGTH} caratteri.`],
      };
    }
    const token = await getToken();
    const response = await fetch(joinUrl(config.baseUrl, path), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        ApiKey: config.apiKey,
        Organization: config.organization,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ Records: records }),
    });
    const text = await response.text();
    let parsed: unknown = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      /* risposta non JSON: conserviamo il testo grezzo per l'audit */
    }
    const messages = messagesFrom(parsed);
    if (!response.ok) {
      return {
        ok: false,
        messages: messages.length > 0 ? messages : [`HTTP ${response.status}: ${text.slice(0, 300)}`],
        raw: parsed,
      };
    }
    const obj = (typeof parsed === "object" && parsed !== null ? parsed : {}) as Record<string, unknown>;
    const transactionId =
      (obj["transactionid"] as string) ??
      (obj["TransactionId"] as string) ??
      (obj["Transactionid"] as string) ??
      null;
    // Nessun esito silenziato: senza codice transazione l'invio è un errore.
    const ok = messages.length === 0 && (path.includes("Check") || Boolean(transactionId));
    return { ok, transactionId, messages, raw: parsed };
  }

  return {
    mode: "live",
    getToken,
    async checkRecords(records) {
      return post("api/Check", records);
    },
    async sendRecords(records) {
      if (!config.tracciatoVerificato) {
        throw new Error(
          "Invio reale bloccato: il tracciato record non è ancora stato verificato sul manuale ufficiale CaRGOS (imposta CARGOS_TRACCIATO_VERIFICATO=true solo dopo il controllo riga per riga).",
        );
      }
      // Blocco indipendente e cumulativo rispetto a quello sul tracciato.
      if (!config.cifraturaVerificata) {
        throw new Error(
          "Invio reale bloccato: il formato di cifratura del token (algoritmo, modalità, encoding) non è ancora stato verificato sul manuale ufficiale CaRGOS (imposta CARGOS_CIFRATURA_VERIFICATA=true solo dopo il controllo).",
        );
      }
      return post("api/Send", records);
    },
    async getTabella(tabellaId) {
      const token = await getToken();
      const response = await fetch(
        `${joinUrl(config.baseUrl, "api/Tabella")}?id=${encodeURIComponent(String(tabellaId))}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            ApiKey: config.apiKey,
            Organization: config.organization,
            Accept: "application/json",
          },
        },
      );
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`CaRGOS api/Tabella ${tabellaId} ha risposto ${response.status}: ${text.slice(0, 300)}`);
      }
      // Il portale restituisce righe testuali "codice<separatore>descrizione".
      return text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const match = /^(\S+)[\t;|]?\s*(.*)$/.exec(line);
          return {
            codice: match?.[1] ?? line,
            descrizione: (match?.[2] ?? "").trim(),
            raw: line,
          };
        });
    },
  };
}
