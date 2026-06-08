// Client-only file parser for txt / docx / pdf.

export async function parseFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt") || file.type.startsWith("text/")) {
    return await file.text();
  }
  if (name.endsWith(".docx")) {
    // @ts-expect-error - mammoth browser entry has no types
    const mammoth = await import("mammoth/mammoth.browser.js");
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value as string;
  }
  if (name.endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist");
    const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      let lastY: number | null = null;
      const parts: string[] = [];
      for (const it of content.items as Array<{ str?: string; transform?: number[]; hasEOL?: boolean }>) {
        if (typeof it.str !== "string") continue;
        const y = it.transform?.[5] ?? null;
        if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) {
          parts.push("\n");
        }
        parts.push(it.str);
        if (it.hasEOL) parts.push("\n");
        lastY = y;
      }
      text += parts.join(" ").replace(/[ \t]+/g, " ") + "\n\n";
    }
    text = text.replace(/\u0000/g, "").trim();
    if (text.length < 20) {
      throw new Error("Could not extract readable text from this PDF. It may be scanned/image-based — try a text-based PDF or .docx.");
    }
    return text;
  }
  throw new Error("Unsupported file type. Use .txt, .docx, or .pdf");
}