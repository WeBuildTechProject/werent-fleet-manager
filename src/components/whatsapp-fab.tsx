import { useEffect, useState } from "react";

import { WhatsappIcon } from "@/components/whatsapp-icon";
import { company } from "@/lib/company";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// Messaggio già completo così com'è: il cliente deve poterlo inviare senza
// doverci scrivere altro sopra (non un frammento tipo "vorrei informazioni",
// che lo obbligherebbe ad aggiungere lui i dettagli prima di premere invia).
const message =
  "Ciao! Vorrei ricevere maggiori informazioni su disponibilità e tariffe per un noleggio auto con We Rent. Potete aiutarmi? Grazie!";

export const whatsappHref = `https://wa.me/393892865597?text=${encodeURIComponent(message)}`;

/** Pulsante flottante WhatsApp presente su tutte le pagine pubbliche. */
export function WhatsappFab() {
  const { t } = useI18n();
  const [hidden, setHidden] = useState(false);

  // Dissolvenza quando il footer entra nel viewport, ricomparsa quando esce.
  useEffect(() => {
    const footer = document.getElementById("site-footer");
    if (!footer || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setHidden(Boolean(entry?.isIntersecting)),
      { threshold: 0 },
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  return (
    <a
      href={whatsappHref}
      target="_blank"
      rel="noreferrer"
      aria-hidden={hidden}
      tabIndex={hidden ? -1 : 0}
      aria-label={t("Scrivici su WhatsApp", "Message us on WhatsApp")}
      title={company.phone}
      className={cn(
        "fixed bottom-5 right-4 z-40 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-3 text-sm font-bold text-foreground shadow-elev transition-all duration-300 hover:-translate-y-0.5 hover:bg-secondary sm:bottom-6 sm:right-6",
        hidden && "pointer-events-none opacity-0",
      )}
    >
      <span className="flex size-7 items-center justify-center rounded-full bg-[#25D366] text-white">
        <WhatsappIcon className="size-4" />
      </span>
      <span className="hidden sm:inline">WhatsApp</span>
    </a>
  );
}
