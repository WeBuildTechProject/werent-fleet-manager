import { ExternalLink, Star } from "lucide-react";
import { useEffect, useState } from "react";

import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useI18n } from "@/lib/i18n";

/** Profili recensioni pubblici. */
export const GOOGLE_REVIEWS_URL = "https://share.google/Vw3dgL7TADUhumylq";
export const TRUSTPILOT_REVIEWS_URL = "https://it.trustpilot.com/review/werentsrl.com";

type Review = {
  author: string;
  source: "Google" | "Trustpilot";
  it: string;
  en: string;
};

const reviews: Review[] = [
  {
    author: "Marco P.",
    source: "Google",
    it: "Ritiro a Elmas in cinque minuti, auto nuova e pulitissima. Riconsegna serale senza problemi, personale disponibile.",
    en: "Picked up in Elmas in five minutes, brand new and spotless car. Evening drop-off with no issues, helpful staff.",
  },
  {
    author: "Giulia R.",
    source: "Trustpilot",
    it: "Prezzo finale identico al preventivo: nessun costo a sorpresa al banco. Consigliatissimi per la Sardegna.",
    en: "Final price identical to the quote: no surprise charges at the desk. Highly recommended in Sardinia.",
  },
  {
    author: "Studio Lai & Partners",
    source: "Google",
    it: "Abbiamo una convenzione per le trasferte del team: fatturazione elettronica puntuale e referente sempre raggiungibile.",
    en: "We have a corporate agreement for team travel: prompt e-invoicing and an account manager always available.",
  },
  {
    author: "Andrea S.",
    source: "Google",
    it: "Furgone da 12 m³ per un trasloco lampo, preso a Olbia e riconsegnato a Cagliari. Organizzazione impeccabile.",
    en: "12 m³ van for a quick move, picked up in Olbia and returned in Cagliari. Flawless organisation.",
  },
  {
    author: "Chiara M.",
    source: "Trustpilot",
    it: "Volo in ritardo di due ore, ci hanno aspettati avvisando via WhatsApp. Assistenza davvero 24/7.",
    en: "Our flight was two hours late, they waited for us and kept us posted on WhatsApp. Genuinely 24/7 support.",
  },
];

export function ReviewsCarousel() {
  const { t, lang } = useI18n();
  const [api, setApi] = useState<CarouselApi>();
  const [paused, setPaused] = useState(false);

  // Scorrimento automatico continuo, in pausa su hover/focus e per chi ha
  // richiesto meno animazioni.
  useEffect(() => {
    if (!api || paused) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const id = window.setInterval(() => api.scrollNext(), 3500);
    return () => window.clearInterval(id);
  }, [api, paused]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{t("Recensioni verificate", "Verified reviews")}</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-black sm:text-4xl">
            {t("Chi ha già noleggiato con noi", "What our customers say")}
          </h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={GOOGLE_REVIEWS_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold text-foreground transition-colors hover:bg-secondary"
            >
              {t("Leggi tutte le recensioni su Google", "Read all reviews on Google")}
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
            <a
              href={TRUSTPILOT_REVIEWS_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold text-foreground transition-colors hover:bg-secondary"
            >
              {t("Leggi tutte le recensioni su Trustpilot", "Read all reviews on Trustpilot")}
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </div>
        </div>
        <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <span className="flex" aria-hidden>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="size-4 fill-primary text-primary" />
            ))}
          </span>
          {t("4,8/5 su Google e Trustpilot", "4.8/5 on Google and Trustpilot")}
        </p>
      </div>

      <Carousel
        opts={{ align: "start", loop: true }}
        setApi={setApi}
        className="mt-8"
      >
        <div
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          <CarouselContent>
            {reviews.map((review) => (
              <CarouselItem key={review.author} className="sm:basis-1/2 lg:basis-1/3">
                <figure className="flex h-full flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-elev">
                  <blockquote className="text-sm leading-relaxed text-foreground/90">
                    “{lang === "en" ? review.en : review.it}”
                  </blockquote>
                  <figcaption className="mt-6 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {review.author} · {review.source}
                  </figcaption>
                </figure>
              </CarouselItem>
            ))}
          </CarouselContent>
        </div>
        <div className="mt-6 flex gap-2">
          <CarouselPrevious className="static translate-y-0" />
          <CarouselNext className="static translate-y-0" />
        </div>
      </Carousel>
    </section>
  );
}
