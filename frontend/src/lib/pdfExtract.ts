// Client-side PDF -> text extraction for uploaded academic-history PDFs,
// ported from ClassGraph's src/utils/pdfExtract.js
// (https://github.com/nehalc200/classgraph). pdf.js hands back positioned
// text runs, not lines; we regroup them by Y-coordinate so a transcript's
// table rows come back as rows (columns joined left-to-right), which is what
// transcriptParse.ts's line-oriented heuristics expect.
import * as pdfjsLib from "pdfjs-dist";
import type { TextItem } from "pdfjs-dist/types/src/display/api";
// Vite resolves `?url` to the emitted worker asset URL; pdf.js runs its parser
// off the main thread from there.
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Group text runs by rounded Y to reconstruct table rows.
    const rowMap = new Map<number, { x: number; str: string }[]>();
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const t = item as TextItem;
      if (!t.str.trim()) continue;
      const y = Math.round(t.transform[5]);
      (rowMap.get(y) ?? rowMap.set(y, []).get(y)!).push({ x: t.transform[4], str: t.str });
    }

    // Rows top-to-bottom (Y descending), columns left-to-right (X ascending).
    const rows = [...rowMap.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, items]) => items.sort((a, b) => a.x - b.x).map(i => i.str).join("  "));

    text += rows.join("\n") + "\n";
  }

  return text;
}
