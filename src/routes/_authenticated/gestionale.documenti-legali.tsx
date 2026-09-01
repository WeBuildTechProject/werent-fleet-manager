import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Save } from "lucide-react";
import { toast } from "sonner";

import { AdminShell } from "@/components/gestionale/admin-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { type LegalDocument } from "@/lib/legal.tsx";
import { hasCapability } from "@/lib/roles";
import { myRolesQuery } from "@/lib/gestionale";

export const Route = createFileRoute("/_authenticated/gestionale/documenti-legali")({
  head: () => ({ meta: [{ title: "Documenti legali | Gestionale We Rent" }] }),
  component: LegalDocumentsAdminPage,
});

function LegalDocumentsAdminPage() {
  const queryClient = useQueryClient();
  const { data: roles } = useQuery(myRolesQuery);
  const query = useQuery({
    queryKey: ["legal-documents", "admin"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("legal_documents") as any).select("*").order("slug").order("version", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as LegalDocument[];
    },
  });
  const [selected, setSelected] = useState<LegalDocument | null>(null);
  const [draft, setDraft] = useState({ title: "", content_md: "", published: true });
  const canWrite = hasCapability(roles, "manage_legal");

  const save = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Seleziona un documento");
      const nextVersion = Math.max(...(query.data ?? []).filter((row) => row.slug === selected.slug).map((row) => row.version), 0) + 1;
      const { error } = await (supabase.from("legal_documents") as any).insert({ slug: selected.slug, version: nextVersion, title: draft.title.trim(), content_md: draft.content_md, published: draft.published, effective_date: new Date().toISOString().slice(0, 10) });
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => { toast.success("Nuova versione pubblicata"); setSelected(null); await queryClient.invalidateQueries({ queryKey: ["legal-documents"] }); },
    onError: (error: Error) => toast.error("Salvataggio non riuscito", { description: error.message }),
  });

  function edit(row: LegalDocument) {
    setSelected(row);
    setDraft({ title: row.title, content_md: row.content_md, published: row.published });
  }

  return <AdminShell section="documenti_legali" title="Documenti legali" subtitle="Versioni pubblicate dei testi mostrati al cliente e accettati in prenotazione">
    {!canWrite ? <p className="mb-5 rounded-lg border border-border bg-secondary/40 p-3 text-sm text-muted-foreground">Accesso in sola lettura. Solo Super Admin e Admin possono pubblicare nuove versioni.</p> : null}
    <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Archivio</h2><span className="text-xs text-muted-foreground">{query.data?.length ?? 0} versioni</span></div>
        <div className="space-y-2">{query.data?.map((row) => <button type="button" key={row.id} onClick={() => edit(row)} className="w-full rounded-lg border border-border p-3 text-left transition-colors hover:bg-secondary/60"><div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">{row.title}</span><span className="text-xs text-muted-foreground">v{row.version}</span></div><p className="mt-1 text-xs text-muted-foreground">{row.published ? "Pubblicata" : "Bozza"} · {row.effective_date}</p></button>)}</div>
      </Card>
      <Card className="p-5">
        {selected ? <>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">Nuova versione da v{selected.version}</p><h2 className="mt-1 text-xl font-display">{selected.title}</h2></div><Button variant="outline" className="rounded-full" onClick={() => setSelected(null)}><Plus className="size-4 rotate-45" /> Chiudi</Button></div>
          <div className="mt-6 space-y-4"><div className="space-y-2"><Label htmlFor="legal-title">Titolo</Label><Input id="legal-title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} disabled={!canWrite} /></div><div className="space-y-2"><Label htmlFor="legal-content">Contenuto Markdown</Label><Textarea id="legal-content" rows={24} value={draft.content_md} onChange={(event) => setDraft({ ...draft, content_md: event.target.value })} disabled={!canWrite} className="font-mono text-sm" /></div><label className="flex items-center gap-2 text-sm"><Checkbox checked={draft.published} onCheckedChange={(value) => setDraft({ ...draft, published: value === true })} disabled={!canWrite} /> Pubblica questa versione</label><Button className="rounded-full" disabled={!canWrite || save.isPending} onClick={() => save.mutate()}><Save className="size-4" /> Salva nuova versione</Button></div>
        </> : <div className="grid min-h-96 place-items-center text-center"><div><p className="text-lg font-semibold">Seleziona un documento</p><p className="mt-2 text-sm text-muted-foreground">Scegli una versione nell’archivio per modificarla creando una nuova versione.</p></div></div>}
      </Card>
    </div>
  </AdminShell>;
}
