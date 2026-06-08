import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAnalysis, updateFlags, type Flag } from "@/lib/voicecheck.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Check, X, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

export const Route = createFileRoute("/_authenticated/analysis/$id")({
  head: () => ({ meta: [{ title: "Review flags — VoiceCheck" }] }),
  component: AnalysisPage,
});

function AnalysisPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const fetchAnalysis = useServerFn(getAnalysis);
  const saveFlags = useServerFn(updateFlags);

  const { data, isLoading } = useQuery({
    queryKey: ["analysis", id],
    queryFn: () => fetchAnalysis({ data: { id } }),
  });

  const [flags, setFlags] = useState<Flag[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (data && !initialized.current) {
      const f = (data.flags as unknown as Flag[]) ?? [];
      setFlags(f);
      const firstPending = f.find((x) => x.status === "pending");
      setActiveId(firstPending?.id ?? f[0]?.id ?? null);
      initialized.current = true;
    }
  }, [data]);

  const totals = useMemo(() => {
    const pending = flags.filter((f) => f.status === "pending").length;
    const accepted = flags.filter((f) => f.status === "accepted").length;
    const dismissed = flags.filter((f) => f.status === "dismissed").length;
    return { pending, accepted, dismissed, total: flags.length };
  }, [flags]);

  async function persist(next: Flag[]) {
    try {
      await saveFlags({ data: { id, flags: next } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
  }

  function setStatus(flagId: string, status: Flag["status"]) {
    setFlags((prev) => {
      const next = prev.map((f) => (f.id === flagId ? { ...f, status } : f));
      persist(next);
      const idx = next.findIndex((f) => f.id === flagId);
      const after = next.slice(idx + 1).find((f) => f.status === "pending");
      const before = next.slice(0, idx).find((f) => f.status === "pending");
      setActiveId((after ?? before)?.id ?? flagId);
      return next;
    });
  }

  function setRawQuote(flagId: string, rawQuote: string) {
    setFlags((prev) => prev.map((f) => (f.id === flagId ? { ...f, rawQuote } : f)));
  }

  function setRewrite(flagId: string, rewrite: string) {
    setFlags((prev) => prev.map((f) => (f.id === flagId ? { ...f, rewrite } : f)));
  }

  function persistCurrent() {
    setFlags((prev) => {
      persist(prev);
      return prev;
    });
  }

  function exportPdf() {
    if (!data) return;
    const accepted = flags.filter((f) => f.status === "accepted");
    if (!accepted.length) {
      toast.error("No accepted flags to export yet.");
      return;
    }
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const margin = 56;
    const width = doc.internal.pageSize.getWidth() - margin * 2;
    let y = margin;
    const newPageIfNeeded = (needed: number) => {
      if (y + needed > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = margin; }
    };
    doc.setFont("times", "bold"); doc.setFontSize(20);
    doc.text("VoiceCheck Revision Report", margin, y); y += 28;
    doc.setFont("times", "normal"); doc.setFontSize(11);
    doc.setTextColor(110);
    doc.text(`File: ${data.filename}`, margin, y); y += 14;
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y); y += 14;
    doc.text(`${accepted.length} passage${accepted.length === 1 ? "" : "s"} marked for revision`, margin, y); y += 26;
    doc.setTextColor(20);
    accepted.forEach((f, i) => {
      newPageIfNeeded(80);
      doc.setFont("times", "bold"); doc.setFontSize(12);
      doc.text(`${i + 1}. ${f.pattern}`, margin, y); y += 16;
      const hasRewrite = typeof f.rewrite === "string" && f.rewrite.trim().length > 0;
      doc.setFont("times", "italic"); doc.setFontSize(11); doc.setTextColor(140);
      doc.text(hasRewrite ? "Original passage:" : "Original:", margin, y); y += 14;
      doc.setFont("times", "normal"); doc.setTextColor(80);
      const passageLines = doc.splitTextToSize(`"${f.passage}"`, width);
      newPageIfNeeded(passageLines.length * 14 + 30);
      doc.text(passageLines, margin, y); y += passageLines.length * 14 + 8;
      const hasRawQuote = typeof f.rawQuote === "string" && f.rawQuote.trim().length > 0;
      if (hasRawQuote) {
        doc.setFont("times", "italic"); doc.setTextColor(140);
        doc.text("Participant actually said:", margin, y); y += 14;
        doc.setFont("times", "normal"); doc.setTextColor(20);
        const rawLines = doc.splitTextToSize(`"${f.rawQuote!.trim()}"`, width);
        newPageIfNeeded(rawLines.length * 14 + 20);
        doc.text(rawLines, margin, y); y += rawLines.length * 14 + 8;
      }
      if (hasRewrite) {
        doc.setFont("times", "italic"); doc.setTextColor(140);
        doc.text("Revised passage:", margin, y); y += 14;
        doc.setFont("times", "normal"); doc.setTextColor(20);
        const rewriteLines = doc.splitTextToSize(f.rewrite!.trim(), width);
        newPageIfNeeded(rewriteLines.length * 14 + 20);
        doc.text(rewriteLines, margin, y); y += rewriteLines.length * 14 + 8;
      }
      doc.setFont("times", "normal"); doc.setTextColor(20);
      const explLines = doc.splitTextToSize(f.explanation, width);
      newPageIfNeeded(explLines.length * 14 + 20);
      doc.text(explLines, margin, y); y += explLines.length * 14 + 22;
    });
    doc.save(`${data.filename.replace(/\.[^.]+$/, "")}_voicecheck_report.pdf`);
    toast.success("Report downloaded");
  }

  if (isLoading || !data) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading analysis…</div>;
  }

  const activeFlag = flags.find((f) => f.id === activeId) ?? null;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!activeFlag || activeFlag.status !== "pending") return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT" || target.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "a") { e.preventDefault(); setStatus(activeFlag.id, "accepted"); }
      else if (k === "d") { e.preventDefault(); setStatus(activeFlag.id, "dismissed"); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeFlag]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-4 md:px-8 py-3 border-b border-border flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/app" })}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-medium truncate">
              <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{data.filename}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {totals.accepted} accepted · {totals.dismissed} dismissed · {totals.pending} remaining
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Progress value={totals.total ? ((totals.accepted + totals.dismissed) / totals.total) * 100 : 0} className="md:w-48 h-2" />
          <Button onClick={exportPdf} size="sm" disabled={!totals.accepted}>
            <Download className="w-4 h-4 mr-2" /> Export report
          </Button>
        </div>
      </header>

      <div className="flex-1 grid lg:grid-cols-[1fr_400px] gap-0">
        <article className="p-6 md:p-10 overflow-y-auto bg-card lg:max-h-[calc(100vh-64px)]">
          <HighlightedText text={data.original_text} flags={flags} activeId={activeId} onSelect={setActiveId} />
        </article>

        <aside className="border-t lg:border-t-0 lg:border-l border-border p-6 md:p-8 bg-background lg:max-h-[calc(100vh-64px)] overflow-y-auto">
          {flags.length === 0 ? (
            <p className="text-sm text-muted-foreground">No flagged passages found. This draft preserves participant voice well.</p>
          ) : !activeFlag ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto rounded-full bg-accepted/10 flex items-center justify-center mb-4">
                <Check className="w-6 h-6 text-accepted" />
              </div>
              <p className="font-display text-xl mb-2">All flags reviewed</p>
              <p className="text-sm text-muted-foreground mb-6">Export your revision report when you're ready.</p>
              <Button onClick={exportPdf} disabled={!totals.accepted}><Download className="w-4 h-4 mr-2" />Export report</Button>
            </div>
          ) : (
            <FlagCard
              flag={activeFlag}
              index={flags.indexOf(activeFlag) + 1}
              total={flags.length}
              onAccept={() => setStatus(activeFlag.id, "accepted")}
              onDismiss={() => setStatus(activeFlag.id, "dismissed")}
              onRawQuoteChange={(v) => setRawQuote(activeFlag.id, v)}
              onRawQuoteBlur={() => persistCurrent()}
              onRewriteChange={(v) => setRewrite(activeFlag.id, v)}
              onRewriteBlur={() => persistCurrent()}
            />
          )}

          {flags.length > 0 && (
            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">All flags</p>
              <ul className="space-y-1">
                {flags.map((f, i) => (
                  <li key={f.id}>
                    <button
                      onClick={() => setActiveId(f.id)}
                      className={`w-full text-left text-xs px-2 py-1.5 rounded flex items-center gap-2 ${f.id === activeId ? "bg-flag-bg" : "hover:bg-muted"}`}
                    >
                      <span className="w-5 text-muted-foreground tabular-nums">{i + 1}</span>
                      <span className="flex-1 truncate">{f.passage}</span>
                      <StatusDot status={f.status} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function FlagCard({ flag, index, total, onAccept, onDismiss, onRawQuoteChange, onRawQuoteBlur, onRewriteChange, onRewriteBlur }: {
  flag: Flag; index: number; total: number;
  onAccept: () => void; onDismiss: () => void;
  onRawQuoteChange: (value: string) => void;
  onRawQuoteBlur: () => void;
  onRewriteChange: (value: string) => void;
  onRewriteBlur: () => void;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
        Flag {index} of {total}
      </p>
      <div className="mb-2">
        <SeverityBadge severity={getSeverity(flag.pattern)} />
      </div>
      <h2 className="font-display text-2xl leading-snug mb-4">{flag.pattern}</h2>

      <div className="grid md:grid-cols-2 gap-4 mb-5 items-stretch">
        <div className="flex flex-col rounded-md border border-border bg-card p-4">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Evaluator's draft
          </p>
          <blockquote className="bg-flag-bg rounded px-2 py-1 italic text-foreground leading-relaxed text-sm flex-1">
            "{flag.passage}"
          </blockquote>
        </div>
        <div className="flex flex-col rounded-md border border-border bg-card p-4">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Participant actually said
          </p>
          <Textarea
            value={flag.rawQuote ?? ""}
            onChange={(e) => onRawQuoteChange(e.target.value)}
            onBlur={onRawQuoteBlur}
            placeholder="Paste or type the original participant quote here…"
            className="flex-1 min-h-[96px] resize-none text-sm leading-relaxed italic"
          />
        </div>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed mb-6">{flag.explanation}</p>

      {flag.status === "accepted" && (
        <div className="mb-6">
          <label className="block text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Rewrite this passage
          </label>
          <Textarea
            value={flag.rewrite ?? ""}
            onChange={(e) => onRewriteChange(e.target.value)}
            onBlur={onRewriteBlur}
            placeholder="Write the revised version that will appear in your exported report…"
            className="w-full min-h-[120px] text-sm leading-relaxed"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Your revision will replace the original passage in the exported report.
          </p>
        </div>
      )}

      {flag.status === "pending" ? (
        <>
          <div className="flex gap-2">
            <Button onClick={onAccept} className="flex-1"><Check className="w-4 h-4 mr-2" />Accept flag</Button>
            <Button onClick={onDismiss} variant="outline" className="flex-1"><X className="w-4 h-4 mr-2" />Dismiss</Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground text-center">A to accept · D to dismiss</p>
        </>
      ) : (
        <div className="flex items-center justify-between p-3 rounded-md bg-muted text-sm">
          <span>
            Marked as <strong className={flag.status === "accepted" ? "text-accepted" : "text-foreground"}>{flag.status}</strong>
          </span>
          <Button size="sm" variant="ghost" onClick={flag.status === "accepted" ? onDismiss : onAccept}>
            Change
          </Button>
        </div>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: Flag["status"] }) {
  const color = status === "accepted" ? "bg-accepted" : status === "dismissed" ? "bg-dismissed" : "bg-flag";
  return <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${color}`} />;
}

type Severity = "High" | "Medium" | "Low";

function getSeverity(pattern: string): Severity {
  const p = pattern.toLowerCase();
  // Check Medium first because "clinical" patterns also contain the word "emotional"
  if (p.includes("clinical") || p.includes("generalization")) return "Medium";
  if (p.includes("emotion") || p.includes("fear") || p.includes("cultural")) return "High";
  return "Low";
}

function SeverityBadge({ severity }: { severity: Severity }) {
  const styles =
    severity === "High"
      ? "bg-red-500/15 text-red-600 ring-1 ring-red-500/30 dark:text-red-400"
      : severity === "Medium"
        ? "bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/30 dark:text-amber-400"
        : "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/30 dark:text-emerald-400";
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${styles}`}>
      {severity}
    </span>
  );
}

function HighlightedText({ text, flags, activeId, onSelect }: {
  text: string; flags: Flag[]; activeId: string | null; onSelect: (id: string) => void;
}) {
  // Sort flags with valid indexes, then weave the text together
  const located = flags
    .filter((f) => typeof f.startIndex === "number" && typeof f.endIndex === "number")
    .sort((a, b) => (a.startIndex! - b.startIndex!));

  const segments: Array<{ type: "text" | "flag"; content: string; flag?: Flag }> = [];
  let cursor = 0;
  for (const f of located) {
    if (f.startIndex! < cursor) continue; // overlap, skip
    if (f.startIndex! > cursor) segments.push({ type: "text", content: text.slice(cursor, f.startIndex!) });
    segments.push({ type: "flag", content: text.slice(f.startIndex!, f.endIndex!), flag: f });
    cursor = f.endIndex!;
  }
  if (cursor < text.length) segments.push({ type: "text", content: text.slice(cursor) });

  return (
    <div className="font-serif text-[17px] leading-[1.75] whitespace-pre-wrap text-foreground max-w-3xl">
      {segments.map((seg, i) =>
        seg.type === "text" ? (
          <span key={i}>{seg.content}</span>
        ) : (
          <FlagSpan key={i} flag={seg.flag!} active={seg.flag!.id === activeId} onClick={() => onSelect(seg.flag!.id)} />
        ),
      )}
    </div>
  );
}

function FlagSpan({ flag, active, onClick }: { flag: Flag; active: boolean; onClick: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [active]);
  const base = "rounded px-0.5 transition-all cursor-pointer";
  const style =
    flag.status === "accepted"
      ? "bg-accepted/15 underline decoration-accepted/60 decoration-2 underline-offset-4"
      : flag.status === "dismissed"
        ? "bg-transparent text-muted-foreground line-through decoration-1"
        : `bg-flag-bg ${active ? "ring-2 ring-flag shadow-sm" : "hover:bg-flag/30"}`;
  return (
    <button ref={ref} onClick={onClick} className={`${base} ${style}`}>
      {flag.passage}
    </button>
  );
}