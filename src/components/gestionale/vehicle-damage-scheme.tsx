import { Button } from "@/components/ui/button";
import { damageViews, type DamageView } from "@/lib/gestionale";

export const severityColor: Record<string, string> = {
  lieve: "oklch(0.82 0.13 95)",
  medio: "oklch(0.72 0.16 55)",
  grave: "oklch(0.58 0.19 25)",
};

export type SchemeMarker = {
  id: string;
  view: string;
  pos_x: number;
  pos_y: number;
  severity: string;
  /** I danni chiusi restano visibili ma sbiaditi. */
  muted?: boolean;
};

export const viewLabel = (id: string) => damageViews.find((v) => v.id === id)?.label ?? id;

/**
 * Schema veicolo interattivo, condiviso tra scheda veicolo, consegna e rientro.
 * Se la categoria ha un'immagine schema (vehicle_categories.damage_schema_image_url)
 * viene usata come sfondo, altrimenti si disegna la sagoma vettoriale.
 */
export function VehicleDamageScheme({
  view,
  onViewChange,
  markers,
  draft,
  onPick,
  schemaImageUrl,
}: {
  view: DamageView;
  onViewChange: (view: DamageView) => void;
  markers: SchemeMarker[];
  draft?: { x: number; y: number } | null;
  onPick: (point: { x: number; y: number }) => void;
  schemaImageUrl?: string | null;
}) {
  const viewMarkers = markers.filter((m) => m.view === view);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {damageViews.map((v) => (
          <Button
            key={v.id}
            type="button"
            size="sm"
            variant={view === v.id ? "default" : "outline"}
            className="rounded-full"
            onClick={() => onViewChange(v.id)}
          >
            {v.label}
          </Button>
        ))}
      </div>

      <svg
        viewBox="0 0 100 60"
        role="img"
        aria-label={`Schema veicolo — ${viewLabel(view)}`}
        className="w-full cursor-crosshair rounded-lg border border-border bg-secondary/40"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          onPick({
            x: Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10,
            y: Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10,
          });
        }}
      >
        {schemaImageUrl ? (
          <image href={schemaImageUrl} x="0" y="0" width="100" height="60" preserveAspectRatio="xMidYMid meet" />
        ) : view === "fronte" || view === "retro" ? (
          <g fill="none" stroke="var(--foreground)" strokeWidth="0.8">
            <rect x="20" y="14" width="60" height="34" rx="6" />
            <rect x="28" y="19" width="44" height="13" rx="3" />
            <circle cx="30" cy="48" r="4" />
            <circle cx="70" cy="48" r="4" />
            <rect x="24" y="38" width="12" height="4" rx="2" />
            <rect x="64" y="38" width="12" height="4" rx="2" />
          </g>
        ) : (
          <g fill="none" stroke="var(--foreground)" strokeWidth="0.8">
            <path d="M8 42 L14 26 L34 18 L66 18 L86 27 L92 42 Z" />
            <path d="M30 19 L36 30 L64 30 L68 19" />
            <circle cx="28" cy="44" r="6" />
            <circle cx="74" cy="44" r="6" />
          </g>
        )}

        {viewMarkers.map((m) => (
          <circle
            key={m.id}
            cx={Number(m.pos_x)}
            cy={(Number(m.pos_y) / 100) * 60}
            r="2"
            fill={severityColor[m.severity] ?? "var(--primary)"}
            opacity={m.muted ? 0.35 : 1}
          />
        ))}
        {draft ? (
          <circle
            cx={draft.x}
            cy={(draft.y / 100) * 60}
            r="2.4"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="0.8"
          />
        ) : null}
      </svg>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {Object.entries(severityColor).map(([k, color]) => (
          <span key={k} className="inline-flex items-center gap-2">
            <span className="size-3 rounded-full" style={{ background: color }} aria-hidden />
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}
