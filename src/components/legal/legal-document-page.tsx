import { useQuery } from "@tanstack/react-query";

import { Card } from "@/components/ui/card";
import { legalDocumentsQuery, renderLegalMarkdown } from "@/lib/legal.tsx";

export function LegalDocumentPage({ slug, eyebrow, title, description, notice }: { slug: string; eyebrow: string; title: string; description: string; notice?: string }) {
  const query = useQuery(legalDocumentsQuery);
  const document = query.data?.find((item) => item.slug === slug);

  return (
    <main className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:py-20">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-3 max-w-3xl text-4xl font-display tracking-tight sm:text-5xl">{title}</h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">{description}</p>
      {notice ? <p className="mt-5 max-w-2xl rounded-md border border-border bg-secondary/40 p-3 text-sm text-muted-foreground">{notice}</p> : null}
      <div className="mt-10 border-t border-border pt-8">
        {query.isPending ? <p className="text-sm text-muted-foreground">Caricamento documento…</p> : null}
        {query.error ? <p className="text-sm text-destructive">Il documento non è momentaneamente disponibile.</p> : null}
        {document ? (
          <Card className="prose prose-neutral max-w-none p-6 shadow-card sm:p-10">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5 text-xs text-muted-foreground">
              <span>Versione {document.version}</span>
              <span>In vigore dal {new Intl.DateTimeFormat("it-IT").format(new Date(document.effective_date))}</span>
            </div>
            {renderLegalMarkdown(document.content_md)}
          </Card>
        ) : !query.isPending && !query.error ? <p className="text-sm text-muted-foreground">Documento non disponibile.</p> : null}
      </div>
    </main>
  );
}
