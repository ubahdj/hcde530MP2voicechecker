import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { analyzeText, listAnalyses, deleteAnalysis } from "@/lib/voicecheck.functions";
import { parseFile } from "@/lib/file-parser";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Upload, FileText, Trash2, LogOut } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({ meta: [{ title: "Dashboard — VoiceCheck" }] }),
  component: AppPage,
});

function AppPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const list = useServerFn(listAnalyses);
  const analyze = useServerFn(analyzeText);
  const del = useServerFn(deleteAnalysis);

  const { data: analyses, isLoading } = useQuery({ queryKey: ["analyses"], queryFn: () => list() });

  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File is larger than 10 MB. Please trim it down.");
      return;
    }
    setBusy(true);
    const t = toast.loading(`Reading ${file.name}…`);
    try {
      const text = await parseFile(file);
      if (text.trim().length < 20) throw new Error("File appears empty or unreadable.");
      toast.loading("Scanning for paraphrased passages…", { id: t });
      const res = await analyze({ data: { text, filename: file.name } });
      toast.success(`Found ${res.flags.length} flag${res.flags.length === 1 ? "" : "s"}`, { id: t });
      qc.invalidateQueries({ queryKey: ["analyses"] });
      navigate({ to: "/analysis/$id", params: { id: res.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed", { id: t });
    } finally {
      setBusy(false);
    }
  }

  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["analyses"] });
      toast.success("Analysis deleted");
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 md:px-10 py-4 border-b border-border flex items-center justify-between">
        <Link to="/app" className="font-display text-xl">VoiceCheck</Link>
        <Button variant="ghost" size="sm" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}>
          <LogOut className="w-4 h-4 mr-2" />Sign out
        </Button>
      </header>

      <main className="flex-1 px-6 md:px-10 py-10 md:py-16 max-w-4xl w-full mx-auto">
        <h1 className="font-display text-4xl mb-2">Upload a draft</h1>
        <p className="text-muted-foreground mb-8">.txt, .docx, or .pdf — up to 10 MB.</p>

        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
          className={`block border-2 border-dashed rounded-lg p-10 md:p-16 text-center cursor-pointer transition-colors ${dragOver ? "border-flag bg-flag-bg/50" : "border-border hover:border-flag/60 hover:bg-card"}`}
        >
          <input type="file" accept=".txt,.docx,.pdf" className="sr-only" disabled={busy}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          {busy ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-flag" />
              <p className="text-sm">Analyzing — this can take 20–60 seconds for long drafts.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-flag-bg flex items-center justify-center">
                <Upload className="w-6 h-6 text-foreground" />
              </div>
              <p className="font-medium">Drop a file here or click to browse</p>
              <p className="text-xs text-muted-foreground">We don't share your text with anyone.</p>
            </div>
          )}
        </label>

        <section className="mt-14">
          <h2 className="font-display text-2xl mb-5">Recent analyses</h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !analyses?.length ? (
            <p className="text-sm text-muted-foreground">No analyses yet. Upload a draft to get started.</p>
          ) : (
            <ul className="divide-y divide-border border border-border rounded-lg bg-card">
              {analyses.map((a: { id: string; filename: string; flags: unknown; created_at: string }) => {
                const flags = (a.flags as Array<{ status: string }> | null) ?? [];
                const remaining = flags.filter((f) => f.status === "pending").length;
                return (
                  <li key={a.id} className="flex items-center gap-4 p-4">
                    <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <Link to="/analysis/$id" params={{ id: a.id }} className="font-medium hover:underline truncate block">
                        {a.filename}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })} · {flags.length} flag{flags.length === 1 ? "" : "s"}
                        {remaining > 0 && ` · ${remaining} to review`}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(a.id)} aria-label="Delete">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}