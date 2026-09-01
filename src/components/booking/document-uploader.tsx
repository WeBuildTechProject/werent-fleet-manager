import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, FileText, Loader2, RefreshCw, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { createDocumentUploadTicket } from "@/lib/documents.functions";
import {
  ACCEPTED_DOCUMENT_ATTR,
  ACCEPTED_DOCUMENT_MIME,
  DOCUMENT_BUCKET,
  DOCUMENT_LABELS,
  DOCUMENT_TYPES,
  MAX_DOCUMENT_BYTES,
  formatBytes,
  type DocumentType,
} from "@/lib/documents";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type UploadedDocument = {
  path: string;
  fileName: string;
  size: number;
  contentType: string;
  /** Anteprima locale (object URL) per le immagini. */
  previewUrl: string | null;
};

type Props = {
  sessionId: string | null;
  onSessionId: (id: string) => void;
  value: Partial<Record<DocumentType, UploadedDocument>>;
  onChange: (tipo: DocumentType, doc: UploadedDocument) => void;
};

/**
 * Upload obbligatorio dei documenti cliente.
 * Il file viaggia direttamente verso lo storage privato tramite signed upload
 * URL rilasciata dal server: nessun payload gigante nelle server function e
 * nessuna esposizione pubblica del bucket.
 */
export function DocumentUploader({ sessionId, onSessionId, value, onChange }: Props) {
  const { t, lang } = useI18n();
  const ticket = useServerFn(createDocumentUploadTicket);
  const [busy, setBusy] = useState<DocumentType | null>(null);
  const inputs = useRef<Partial<Record<DocumentType, HTMLInputElement | null>>>({});

  async function handleFile(tipo: DocumentType, file: File | undefined) {
    if (!file) return;
    if (!(ACCEPTED_DOCUMENT_MIME as readonly string[]).includes(file.type)) {
      toast.error(t("Formato non supportato", "Unsupported format"), {
        description: t("Carica un file JPG, PNG o PDF.", "Upload a JPG, PNG or PDF file."),
      });
      return;
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      toast.error(t("File troppo grande", "File too large"), {
        description: t("Dimensione massima 10 MB.", "Maximum size 10 MB."),
      });
      return;
    }

    setBusy(tipo);
    try {
      const res = await ticket({
        data: {
          sessionId,
          tipo,
          contentType: file.type as (typeof ACCEPTED_DOCUMENT_MIME)[number],
          sizeBytes: file.size,
        },
      });
      const { error } = await supabase.storage
        .from(DOCUMENT_BUCKET)
        .uploadToSignedUrl(res.path, res.token, file, { contentType: file.type });
      if (error) throw new Error(error.message);

      onSessionId(res.sessionId);
      onChange(tipo, {
        path: res.path,
        fileName: file.name,
        size: file.size,
        contentType: file.type,
        previewUrl: file.type === "application/pdf" ? null : URL.createObjectURL(file),
      });
    } catch (e) {
      toast.error(t("Caricamento non riuscito", "Upload failed"), {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {t(
          "Tutti i documenti sono obbligatori. Formati JPG, PNG o PDF, massimo 10 MB per file. I file sono conservati in uno spazio cifrato e visibili solo al nostro staff.",
          "All documents are mandatory. JPG, PNG or PDF, max 10 MB each. Files are stored in a private space visible only to our staff.",
        )}
      </p>

      {DOCUMENT_TYPES.map((tipo) => {
        const doc = value[tipo];
        const meta = DOCUMENT_LABELS[tipo];
        return (
          <div
            key={tipo}
            className={cn(
              "flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center",
              doc ? "border-primary/40 bg-primary/5" : "border-border",
            )}
          >
            <div className="flex-1 space-y-1">
              <p className="flex items-center gap-2 text-sm font-medium">
                {doc ? <Check className="size-4 text-primary" /> : null}
                {lang === "en" ? meta.en : meta.it} <span className="text-destructive">*</span>
              </p>
              <p className="text-xs text-muted-foreground">{lang === "en" ? meta.hint_en : meta.hint_it}</p>
              {doc ? (
                <p className="truncate text-xs text-muted-foreground">
                  {doc.fileName} · {formatBytes(doc.size)}
                </p>
              ) : null}
            </div>

            {doc?.previewUrl ? (
              <img
                src={doc.previewUrl}
                alt={t("Anteprima documento caricato", "Uploaded document preview")}
                className="h-16 w-24 rounded-md border border-border object-cover"
              />
            ) : doc ? (
              <span className="flex h-16 w-24 items-center justify-center rounded-md border border-border">
                <FileText className="size-6 text-muted-foreground" />
              </span>
            ) : null}

            <input
              ref={(el) => {
                inputs.current[tipo] = el;
              }}
              type="file"
              accept={ACCEPTED_DOCUMENT_ATTR}
              className="hidden"
              onChange={(e) => {
                void handleFile(tipo, e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant={doc ? "outline" : "default"}
              className="rounded-full"
              disabled={busy === tipo}
              onClick={() => inputs.current[tipo]?.click()}
            >
              {busy === tipo ? (
                <Loader2 className="size-4 animate-spin" />
              ) : doc ? (
                <RefreshCw className="size-4" />
              ) : (
                <Upload className="size-4" />
              )}
              {doc ? t("Sostituisci", "Replace") : t("Carica", "Upload")}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
