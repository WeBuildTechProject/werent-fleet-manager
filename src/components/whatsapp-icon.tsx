import { cn } from "@/lib/utils";

/** Glifo WhatsApp (lucide non include i marchi): stesso peso visivo delle icone lucide. */
export function WhatsappIcon({
  className,
  outline = false,
}: {
  className?: string;
  /** Variante a tratto, coerente con le icone lucide della barra contatti. */
  outline?: boolean;
}) {
  if (outline) {
    // Sagoma del logo WhatsApp (fumetto con coda in basso a sinistra) resa a
    // tratto, per allinearsi alle icone lucide adiacenti.
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className={cn("size-4", className)}
      >
        <path d="M12.04 3.2a8.7 8.7 0 0 0-7.4 13.28L3.4 20.6l4.24-1.19a8.7 8.7 0 1 0 4.4-16.21Z" />
        <path d="M9.2 8.1c-.36 0-.6.16-.78.4-.24.32-.55.85-.55 1.75 0 .9.6 1.86.86 2.2.86 1.13 2.05 2.28 3.6 2.96.53.23.99.37 1.4.44.5.09.99.06 1.36-.07.4-.14.85-.5.98-.95.1-.34.11-.68.06-.82-.05-.13-.2-.21-.42-.32l-1.5-.72c-.2-.09-.35-.1-.48.1l-.66.83c-.13.15-.26.17-.47.07a6.2 6.2 0 0 1-1.75-1.1 6.3 6.3 0 0 1-1.2-1.5c-.12-.22-.02-.34.1-.45l.7-.79c.11-.14.14-.25.07-.4l-.65-1.55c-.14-.32-.28-.3-.4-.31Z" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className={cn("size-4", className)}
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm0 18.02h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.19-.31a8.19 8.19 0 0 1-1.26-4.35c0-4.54 3.7-8.23 8.23-8.23 2.2 0 4.26.86 5.81 2.42a8.16 8.16 0 0 1 2.41 5.82c0 4.54-3.7 8.2-8.23 8.2Zm4.52-6.15c-.25-.12-1.47-.72-1.69-.81-.23-.08-.4-.12-.56.13-.17.25-.65.81-.8.98-.15.16-.29.19-.54.06-.25-.12-1.06-.39-2.02-1.24-.75-.66-1.25-1.48-1.4-1.73-.15-.25-.02-.39.11-.51.11-.11.25-.29.37-.44.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.16 0-.42.06-.64.31-.22.25-.84.82-.84 2 0 1.19.86 2.33.98 2.49.12.16 1.69 2.58 4.1 3.62.57.25 1.02.39 1.37.5.58.19 1.1.16 1.52.1.46-.07 1.47-.6 1.68-1.19.21-.58.21-1.08.15-1.19-.06-.1-.23-.16-.48-.29Z" />
    </svg>
  );
}
