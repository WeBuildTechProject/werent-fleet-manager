import { type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";

/** Slug dei documenti legali gestiti nel database. */
export const legalSlugs = {
  terms: "termini-e-condizioni",
  contract: "condizioni-generali",
} as const;

export const VEXATIOUS_CLAUSE_CODES = [
  "A.10", "B.1", "B.2", "B.3", "B.4", "B.5", "C.3", "C.7", "C.9", "C.10",
  "D.4", "D.5", "E.3", "E.6", "E.8", "E.9", "F", "G.1", "G.3", "I", "J.1",
  "J.2", "J.4", "J.5", "J.7", "J.9", "J.10", "J.11", "J.12", "J.13", "J.14",
  "J.15", "K.4", "K.5", "K.6", "K.7", "K.8", "L.1", "L.2", "L.3", "L.4", "L.5",
  "M.1", "M.2", "O.2",
] as const;

export function legalClauseAnchor(value: string) {
  return value.trim().toLowerCase().replace(".", "");
}

export type LegalDocument = {
  id: string;
  slug: string;
  version: number;
  title: string;
  content_md: string;
  published: boolean;
  effective_date: string;
  created_at: string;
  updated_at: string;
};

export const legalDocumentsQuery = {
  queryKey: ["legal-documents", "published"] as const,
  queryFn: async () => {
    const { data, error } = await (supabase.from("legal_documents") as any)
      .select("*")
      .eq("published", true)
      .order("slug")
      .order("version", { ascending: false });
    if (error) throw new Error(error.message);
    const latest = new Map<string, LegalDocument>();
    for (const row of (data ?? []) as LegalDocument[]) {
      if (!latest.has(row.slug)) latest.set(row.slug, row);
    }
    return [...latest.values()];
  },
};

export function renderLegalMarkdown(content: string): ReactNode[] {
  return content.split(/\r?\n/).map((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={`${index}-space`} className="h-3" />;
    if (trimmed.startsWith("### ")) {
      const heading = trimmed.slice(4);
      const clause = heading.match(/^([A-P]\.\d+)(?:\s|$)/)?.[1];
      return <h3 key={index} id={clause ? legalClauseAnchor(clause) : undefined} className="mt-6 scroll-mt-24 text-base font-bold">{heading}</h3>;
    }
    if (trimmed.startsWith("## ")) {
      const heading = trimmed.slice(3);
      const section = heading.match(/^([A-P])\.(?:\s|$)/)?.[1];
      return <h2 key={index} id={section?.toLowerCase()} className="mt-8 scroll-mt-24 font-display text-xl font-bold">{heading}</h2>;
    }
    if (trimmed.startsWith("# ")) return <h1 key={index} className="font-display text-3xl font-bold">{trimmed.slice(2)}</h1>;
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) return <li key={index} className="ml-5 list-disc leading-7">{trimmed.slice(2)}</li>;
    const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
    return <p key={index} className="leading-7 text-foreground/85">{parts.map((part, partIndex) => part.startsWith("**") && part.endsWith("**") ? <strong key={partIndex}>{part.slice(2, -2)}</strong> : part)}</p>;
  });
}
