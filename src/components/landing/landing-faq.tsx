import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { JsonLd } from "@/components/json-ld";
import { buildFaqJsonLd } from "@/lib/seo";
import { useI18n } from "@/lib/i18n";

export type LandingFaqEntry = { q: string; a: string; qEn: string; aEn: string };

export function LandingFaq({ faqs, idPrefix }: { faqs: LandingFaqEntry[]; idPrefix: string }) {
  const { t } = useI18n();
  return (
    <div>
      <div className="rounded-2xl border border-border bg-card px-6 shadow-card sm:px-8">
        <Accordion type="single" collapsible>
          {faqs.map((faq, i) => (
            <AccordionItem key={faq.q} value={`${idPrefix}-${i}`}>
              <AccordionTrigger className="text-base">{t(faq.q, faq.qEn)}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{t(faq.a, faq.aEn)}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
      <JsonLd data={buildFaqJsonLd(faqs.map((f) => ({ q: f.q, a: f.a })))} />
    </div>
  );
}
