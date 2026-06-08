import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const FlagSchema = z.object({
  passage: z.string(),
  pattern: z.string(),
  explanation: z.string(),
});

export type Flag = z.infer<typeof FlagSchema> & {
  id: string;
  status: "pending" | "accepted" | "dismissed";
  startIndex?: number;
  endIndex?: number;
  rawQuote?: string;
  rewrite?: string;
};

const PATTERNS = [
  "First-person language shifted to third-person",
  "Hesitation or qualification removed",
  "Informal or emotional language replaced with clinical terms",
  "Concrete details replaced with generalizations",
  "Emotion or fear removed and replaced with neutral framing",
  "Culturally specific phrasing standardized into clinical equivalents",
];

function buildSystemPrompt() {
  return `You are an expert qualitative research auditor. You review evaluation reports for places where participant voices have been paraphrased into academic or clinical language, losing the participant's original meaning, emotion, or specificity.

You scan the supplied text and identify passages (in the supplied text — NOT invented) that match any of these patterns:
${PATTERNS.map((p, i) => `${i + 1}. ${p}`).join("\n")}

Rules:
- Only flag passages that are clearly paraphrased, generalized, or clinicalized in a way that would lose participant voice. Be conservative — don't flag normal expository writing.
- Each "passage" MUST be an exact substring of the input text (copy it verbatim, including punctuation). This is critical for highlighting.
- The "passage" MUST be the SHORTEST span that captures the issue — a single sentence, clause, or phrase. NEVER include surrounding context, adjacent sentences, or whole paragraphs. If a paragraph contains multiple issues, return them as SEPARATE flags. Aim for under 30 words per passage; never exceed 200 characters.
- "pattern" must be one of the six patterns listed above, copied verbatim.
- "explanation" is ONE plain-language sentence (max 30 words) explaining why this passage was flagged and what nuance may have been lost.
- Return between 0 and 25 flags. Quality over quantity.
- Return JSON only matching the provided schema. No prose.`;
}

export const analyzeText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      text: z.string().min(20).max(120_000),
      filename: z.string().min(1).max(300),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY is not configured");

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const { generateText } = await import("ai");
    const gateway = createLovableAiGatewayProvider(key);

    const cleanedText = data.text.replace(/\u0000/g, "").trim();

    const { text: rawResponse } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system: buildSystemPrompt(),
      prompt: `Analyze the following evaluation text and return ONLY a JSON object of the form {"flags":[{"passage":"...","pattern":"...","explanation":"..."}]}. No prose, no code fences.\n\n---BEGIN TEXT---\n${cleanedText}\n---END TEXT---`,
    });

    // Defensive JSON parsing — tolerate code fences, stray prose, and schema drift.
    const parsed = parseFlagsResponse(rawResponse);

    // Locate each passage in the original text and assign ids
    const flags: Flag[] = parsed.map((f, i) => {
      // Safety net: if the model returned an overly long passage (multi-sentence
      // or whole paragraph), trim it to the first sentence so highlighting stays
      // tight on the specific flagged phrase rather than surrounding context.
      let passage = f.passage;
      if (passage.length > 240) {
        const match = passage.match(/^[^.!?\n]*[.!?]/);
        if (match && match[0].length >= 20) passage = match[0].trim();
        else passage = passage.slice(0, 200).trim();
      }
      const startIndex = cleanedText.indexOf(passage);
      return {
        ...f,
        passage,
        id: `f${i}_${Date.now()}`,
        status: "pending" as const,
        startIndex: startIndex >= 0 ? startIndex : undefined,
        endIndex: startIndex >= 0 ? startIndex + passage.length : undefined,
      };
    });

    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("analyses")
      .insert({
        user_id: userId,
        filename: data.filename,
        original_text: cleanedText,
        flags: flags as never,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { id: row.id as string, flags };
  });

function parseFlagsResponse(raw: string): Array<{ passage: string; pattern: string; explanation: string }> {
  if (!raw || !raw.trim()) return [];
  let text = raw.trim();

  // Strip markdown code fences
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

  // Try to isolate the first JSON object/array
  const tryParse = (s: string) => {
    try { return JSON.parse(s); } catch { return null; }
  };

  let obj: unknown = tryParse(text);
  if (obj == null) {
    const firstBrace = text.indexOf("{");
    const firstBracket = text.indexOf("[");
    const start =
      firstBrace === -1 ? firstBracket :
      firstBracket === -1 ? firstBrace :
      Math.min(firstBrace, firstBracket);
    const lastBrace = text.lastIndexOf("}");
    const lastBracket = text.lastIndexOf("]");
    const end = Math.max(lastBrace, lastBracket);
    if (start !== -1 && end > start) {
      obj = tryParse(text.slice(start, end + 1));
    }
  }

  if (obj == null) return [];

  // Normalize: accept {flags:[...]}, [...], or single object
  let arr: unknown[] = [];
  if (Array.isArray(obj)) arr = obj;
  else if (typeof obj === "object" && obj !== null) {
    const o = obj as Record<string, unknown>;
    if (Array.isArray(o.flags)) arr = o.flags;
    else if (Array.isArray(o.results)) arr = o.results;
    else if (Array.isArray(o.items)) arr = o.items;
    else if (typeof o.passage === "string") arr = [o];
  }

  const out: Array<{ passage: string; pattern: string; explanation: string }> = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const it = item as Record<string, unknown>;
    const passage = typeof it.passage === "string" ? it.passage
      : typeof it.quote === "string" ? it.quote
      : typeof it.text === "string" ? it.text
      : null;
    const pattern = typeof it.pattern === "string" ? it.pattern
      : typeof it.category === "string" ? it.category
      : typeof it.type === "string" ? it.type
      : "Paraphrased participant voice";
    const explanation = typeof it.explanation === "string" ? it.explanation
      : typeof it.reason === "string" ? it.reason
      : typeof it.rationale === "string" ? it.rationale
      : "";
    if (passage && passage.trim().length > 0) {
      out.push({ passage, pattern, explanation });
    }
  }
  return out;
}

export const getAnalysis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("analyses")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listAnalyses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("analyses")
      .select("id, filename, flags, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data;
  });

export const updateFlags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      id: z.string().uuid(),
      flags: z.array(z.any()),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("analyses")
      .update({ flags: data.flags, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("analyses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });