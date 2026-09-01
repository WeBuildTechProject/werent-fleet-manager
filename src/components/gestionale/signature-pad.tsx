import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * Firma cliente su canvas: salvata come data URL sulla prenotazione.
 * Funziona con mouse e touch (tablet al banco).
 */
export function SignaturePad({
  onChange,
  label = "Firma del cliente",
}: {
  onChange: (dataUrl: string | null) => void;
  label?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = "#101413";
  }, []);

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <canvas
        ref={canvasRef}
        width={640}
        height={200}
        aria-label={label}
        className="h-40 w-full touch-none rounded-lg border border-border bg-background"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const ctx = canvasRef.current!.getContext("2d")!;
          const p = point(e);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          drawing.current = true;
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = canvasRef.current!.getContext("2d")!;
          const p = point(e);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
          setHasInk(true);
        }}
        onPointerUp={() => {
          if (!drawing.current) return;
          drawing.current = false;
          onChange(canvasRef.current?.toDataURL("image/png") ?? null);
        }}
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{hasInk ? "Firma acquisita" : "Firma nell'area sopra"}</span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
            setHasInk(false);
            onChange(null);
          }}
        >
          Cancella
        </Button>
      </div>
    </div>
  );
}
