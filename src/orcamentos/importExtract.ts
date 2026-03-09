import type { TextBlock } from "./importTypes";

/** Converte linha de texto em células (separador: 2+ espaços ou tab) */
function lineToCells(line: string): string[] {
  const trimmed = line.trim();
  const parts = trimmed.split(/\s{2,}|\t/).filter(Boolean);
  if (parts.length >= 2) return parts;
  if (trimmed) return [trimmed];
  return [];
}

/** Extrai grelha e blocos da página 1 do PDF */
export async function extractPdfToGridAndBlocks(
  arrayBuffer: ArrayBuffer,
): Promise<{ grid: string[][]; textBlocksPage1: TextBlock[] }> {
  const pdfjs = await import("pdfjs-dist");
  if (typeof window !== "undefined") {
    (pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc =
      "/pdf.worker.min.mjs";
  }
  const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const allRows: string[][] = [];
  let textBlocksPage1: TextBlock[] = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const items = content.items as { str: string; transform: number[] }[];
    if (items.length === 0) continue;

    type Item = { str: string; y: number; x: number };
    const withPos: Item[] = items.map((it) => ({
      str: it.str,
      y: it.transform[5] ?? 0,
      x: it.transform[4] ?? 0,
    }));
    withPos.sort((a, b) => {
      const dy = b.y - a.y;
      if (Math.abs(dy) > 2) return dy;
      return a.x - b.x;
    });

    const lineThreshold = 3;
    let currentY = withPos[0]?.y ?? 0;
    let currentLine: string[] = [];
    const pageLines: string[] = [];

    for (const it of withPos) {
      if (Math.abs(it.y - currentY) > lineThreshold) {
        if (currentLine.length) {
          const lineStr = currentLine.join(" ").trim();
          if (lineStr) pageLines.push(lineStr);
          currentLine = [];
        }
        currentY = it.y;
      }
      currentLine.push(it.str);
    }
    if (currentLine.length) {
      const lineStr = currentLine.join(" ").trim();
      if (lineStr) pageLines.push(lineStr);
    }

    if (pageNum === 1) {
      textBlocksPage1 = pageLines.map((text, index) => ({ text, index }));
    }

    for (const line of pageLines) {
      const cells = lineToCells(line);
      if (cells.length) allRows.push(cells);
    }
  }

  const maxCols = Math.max(0, ...allRows.map((r) => r.length));
  const grid: string[][] = allRows.map((row) => {
    const out = [...row];
    while (out.length < maxCols) out.push("");
    return out;
  });

  return { grid, textBlocksPage1 };
}

/** CSV para grelha (primeira linha = primeira linha da grelha) */
export function csvToGrid(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const sep = lines[0].includes(";") ? ";" : ",";
  return lines.map((line) =>
    line.split(sep).map((v) => v.trim().replace(/^"|"$/g, "")),
  );
}

/** Texto colado (tab ou ; ,) para grelha */
export function pasteToGrid(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const first = lines[0];
  const sep = first.includes("\t") ? "\t" : first.includes(";") ? ";" : ",";
  return lines.map((line) =>
    line.split(sep).map((v) => v.trim().replace(/^"|"$/g, "")),
  );
}

/** Extrai texto simples do PDF (todas as páginas, uma linha por linha de texto) — para preencher à mão ou sugerir. */
export async function extractPdfAsText(arrayBuffer: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  if (typeof window !== "undefined") {
    (pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc =
      "/pdf.worker.min.mjs";
  }
  const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const lines: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const items = content.items as { str: string; transform: number[] }[];
    type Item = { str: string; y: number; x: number };
    const withPos: Item[] = items.map((it) => ({
      str: it.str,
      y: it.transform[5] ?? 0,
      x: it.transform[4] ?? 0,
    }));
    withPos.sort((a, b) => {
      const dy = b.y - a.y;
      if (Math.abs(dy) > 2) return dy;
      return a.x - b.x;
    });
    const lineThreshold = 3;
    let currentY = withPos[0]?.y ?? 0;
    let currentLine: string[] = [];
    for (const it of withPos) {
      if (Math.abs(it.y - currentY) > lineThreshold) {
        if (currentLine.length) lines.push(currentLine.join(" ").trim());
        currentLine = [];
        currentY = it.y;
      }
      currentLine.push(it.str);
    }
    if (currentLine.length) lines.push(currentLine.join(" ").trim());
  }
  return lines.filter((l) => l.length > 0).join("\n");
}

/** Excel: primeira sheet para grelha (headers = primeira linha, depois dados) */
export async function excelToGrid(file: File): Promise<string[][]> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const first = wb.SheetNames[0];
  const sheet = wb.Sheets[first];
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as string[][];
  return rows.map((row) => row.map((c) => (c == null ? "" : String(c).trim())));
}
