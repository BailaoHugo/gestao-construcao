/**
 * Lógica partilhada de extração de facturas (PDF texto / imagem + OCR).
 * Usado por `toconline-extract-invoices-batch.mjs` e pela API `extract-upload`.
 */
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function guessFileType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".pdf") return "pdf";
  if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)) return "image";
  return "other";
}

/** @param {Record<string, unknown>} row */
export function tryExtractHeader(text, row) {
  const t = String(text || "");
  const dateMatch =
    t.match(/\b(\d{4}-\d{2}-\d{2})\b/) ||
    t.match(/\b(\d{2}[/-]\d{2}[/-]\d{4})\b/);
  const docMatch =
    t.match(/\b(FC|FT|NCF|FR|NC)\s*\d{4}\/\d+\b/i) ||
    t.match(/\b(?:FATURA|FACTURA)\s+([A-Z0-9\/.-]+)\b/i);
  const nifMatch = t.match(/\bNIF[:\s]*([0-9]{9})\b/i);

  return {
    sourceDocumentNo: row.document_no || row.purchase_invoice_no || null,
    detectedDocumentNo: docMatch ? docMatch[0] : null,
    detectedDate: dateMatch ? dateMatch[1] : null,
    detectedNif: nifMatch ? nifMatch[1] : null,
    supplier: row.supplier || null,
    grossTotal: row.gross_total ?? null,
    netTotal: row.net_total ?? null,
    taxPayable: row.tax_payable ?? null,
  };
}

export function parseMoneyToken(value) {
  let s = String(value || "").trim().replace(/\s/g, "");
  if (!s) return null;
  if (/^\d{1,3}(\.\d{3})*,\d{2}$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d+,\d{2}$/.test(s)) {
    s = s.replace(",", ".");
  } else if (/^\d+\.\d{2}$/.test(s)) {
    // ok
  } else {
    s = s.replace(/[^\d,.-]/g, "");
    if (!s) return null;
    s = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const LINE_PATTERNS = [
  {
    name: "qty_unit_total_iva",
    re: /^(.{3,}?)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)\s+(\d{1,2})\s*%?\s*$/,
  },
  {
    name: "qty_unit_total",
    re: /^(.{3,}?)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)\s*$/,
  },
];

function tryParseLineItem(line) {
  const trimmed = line.trim();
  if (trimmed.length < 8) return null;
  if (/^(artigo|descri|quant|qtd|pre[cç]o|unit|total|iva|base)\b/i.test(trimmed)) {
    return null;
  }

  for (const { name, re } of LINE_PATTERNS) {
    const m = trimmed.match(re);
    if (!m) continue;
    if (name === "qty_unit_total_iva") {
      const descricao = m[1].trim();
      const quantidade = parseMoneyToken(m[2]);
      const precoUnit = parseMoneyToken(m[3]);
      const totalLinha = parseMoneyToken(m[4]);
      const ivaPercent = Number(m[5]);
      if (
        !descricao ||
        quantidade === null ||
        precoUnit === null ||
        totalLinha === null ||
        !Number.isFinite(ivaPercent)
      ) {
        continue;
      }
      const diffIva = Math.abs(quantidade * precoUnit - totalLinha);
      const tolIva = Math.max(0.05, Math.abs(totalLinha) * 0.02);
      return {
        descricao,
        quantidade,
        precoUnitario: precoUnit,
        totalLinha,
        ivaPercent,
        coerente: diffIva <= tolIva,
        source: `heuristic_${name}`,
      };
    }
    const descricao = m[1].trim();
    const a = parseMoneyToken(m[2]);
    const b = parseMoneyToken(m[3]);
    const c = parseMoneyToken(m[4]);
    if (!descricao || a === null || b === null || c === null) continue;

    let quantidade = a;
    let precoUnit = b;
    let totalLinha = c;
    const product = Math.abs(quantidade * precoUnit - totalLinha);
    const altProduct = Math.abs(quantidade * c - b);
    if (product > 0.05 && altProduct < product) {
      quantidade = b;
      precoUnit = a;
      totalLinha = c;
    }
    const diff = Math.abs(quantidade * precoUnit - totalLinha);
    const tol = Math.max(0.05, Math.abs(totalLinha) * 0.02);
    if (diff > tol && quantidade > 0 && precoUnit > 0) {
      continue;
    }

    return {
      descricao,
      quantidade,
      precoUnitario: precoUnit,
      totalLinha,
      ivaPercent: null,
      coerente: diff <= tol,
      source: `heuristic_${name}`,
    };
  }
  return null;
}

export function extractLineItemsHeuristic(text) {
  const raw = String(text || "");
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const out = [];
  const seen = new Set();
  for (const line of lines) {
    const item = tryParseLineItem(line);
    if (!item) continue;
    const key = `${item.descricao}|${item.quantidade}|${item.totalLinha}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function sumLineTotals(lineItems) {
  return lineItems.reduce((acc, it) => acc + (Number(it.totalLinha) || 0), 0);
}

/** @param {Record<string, unknown>} row */
export function validateTotalsAgainstSource(lineItems, row) {
  const sumLines = sumLineTotals(lineItems);
  const gross = parseMoneyToken(row.gross_total);
  const net = parseMoneyToken(row.net_total);
  const tax = parseMoneyToken(row.tax_payable);

  const out = {
    sumLineTotals: Math.round(sumLines * 100) / 100,
    grossFromApi: gross,
    netFromApi: net,
    taxFromApi: tax,
    grossMatch: null,
    netMatch: null,
    toleranceEur: 0.05,
  };

  if (gross !== null && lineItems.length > 0) {
    out.grossMatch = Math.abs(sumLines - gross) <= out.toleranceEur;
  }
  if (net !== null && lineItems.length > 0) {
    out.netMatch = Math.abs(sumLines - net) <= out.toleranceEur;
  }
  return out;
}

export function computeConfidenceBase(rawTextLen, lineCount, validation) {
  let score = rawTextLen > 400 ? 75 : rawTextLen > 150 ? 60 : 45;
  if (lineCount > 0) score += Math.min(15, lineCount * 2);
  if (validation.grossMatch === true) score += 10;
  if (validation.netMatch === true) score += 8;
  if (validation.grossMatch === false && lineCount > 0) score -= 12;
  return Math.max(15, Math.min(95, Math.round(score)));
}

function getPdfJsAssetBaseUrls() {
  const require = createRequire(import.meta.url);
  const pkgDir = path.dirname(require.resolve("pdfjs-dist/package.json"));
  const toUrl = (sub) => pathToFileURL(path.join(pkgDir, sub) + path.sep).href;
  return {
    cMapUrl: toUrl("cmaps"),
    standardFontDataUrl: toUrl("standard_fonts"),
    wasmUrl: toUrl("wasm"),
  };
}

/**
 * @param {Uint8Array} data
 */
export async function extractPdfTextFromBuffer(data) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const assets = getPdfJsAssetBaseUrls();
  const loadingTask = pdfjs.getDocument({
    data,
    isEvalSupported: false,
    verbosity: 0,
    cMapUrl: assets.cMapUrl,
    standardFontDataUrl: assets.standardFontDataUrl,
    wasmUrl: assets.wasmUrl,
  });
  const doc = await loadingTask.promise;
  const parts = [];
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const text = await page.getTextContent();
    for (const it of text.items) {
      const s = "str" in it ? it.str : "";
      if (!s) continue;
      parts.push(s);
      if (it.hasEOL) parts.push("\n");
      else parts.push(" ");
    }
    parts.push("\n");
  }
  return parts.join("").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
}

export async function extractPdfText(filePath) {
  const data = new Uint8Array(await fs.readFile(filePath));
  return extractPdfTextFromBuffer(data);
}

export async function runTesseractOcr(filePath, lang = "por+eng") {
  const { stdout } = await execFileAsync("tesseract", [filePath, "stdout", "-l", lang], {
    maxBuffer: 20 * 1024 * 1024,
  });
  return stdout || "";
}

export async function isTesseractAvailable() {
  try {
    await execFileAsync("tesseract", ["--version"], { maxBuffer: 1024 * 1024 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Extrai texto e estrutura a partir de um ficheiro no disco.
 * @param {{ filePath: string, fileName: string, row?: Record<string, unknown>, ocrLang?: string, enableOcr?: boolean }} opts
 */
export async function extractInvoiceFromFilePath(opts) {
  const {
    filePath,
    fileName,
    row = {},
    ocrLang = "por+eng",
    enableOcr = true,
  } = opts;
  const fileType = guessFileType(fileName);
  const canOcr = enableOcr ? await isTesseractAvailable() : false;

  if (fileType === "image") {
    if (!canOcr) {
      return {
        status: "needs_ocr",
        extractor: "ocr_tesseract_v1",
        confidence_score: 10,
        raw_text: null,
        header_json: {
          sourceDocumentNo: row.document_no || row.purchase_invoice_no || null,
          note: "tesseract indisponivel; OCR pendente",
        },
        lines_json: [],
        validation_json: { fileType: "image", ocrEnabled: enableOcr, canOcr },
        error: null,
      };
    }
    try {
      const rawText = await runTesseractOcr(filePath, ocrLang);
      const header = tryExtractHeader(rawText, row);
      const lineItems = extractLineItemsHeuristic(rawText);
      const totalsVal = validateTotalsAgainstSource(lineItems, row);
      const confidence = computeConfidenceBase(rawText.length, lineItems.length, totalsVal);
      return {
        status: "ok",
        extractor: "ocr_tesseract_v1",
        confidence_score: confidence,
        raw_text: rawText,
        header_json: header,
        lines_json: lineItems,
        validation_json: {
          fileType: "image",
          ocrLang,
          rawTextLength: rawText.length,
          lineItemsDetected: lineItems.length,
          totalsValidation: totalsVal,
        },
        error: null,
      };
    } catch (err) {
      return {
        status: "failed",
        extractor: "ocr_tesseract_v1",
        confidence_score: 0,
        raw_text: null,
        header_json: {},
        lines_json: [],
        validation_json: { fileType: "image", ocrLang },
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (fileType !== "pdf") {
    return {
      status: "needs_ocr",
      extractor: "pdf_text_v1",
      confidence_score: 10,
      raw_text: null,
      header_json: {
        sourceDocumentNo: row.document_no || row.purchase_invoice_no || null,
        note: "ficheiro nao-PDF; OCR pendente",
      },
      lines_json: [],
      validation_json: { fileType },
      error: null,
    };
  }

  try {
    const rawText = await extractPdfText(filePath);
    const header = tryExtractHeader(rawText, row);
    const lineItems = extractLineItemsHeuristic(rawText);
    const totalsVal = validateTotalsAgainstSource(lineItems, row);
    const confidence = computeConfidenceBase(rawText.length, lineItems.length, totalsVal);
    return {
      status: "ok",
      extractor: "pdf_text_v1",
      confidence_score: confidence,
      raw_text: rawText,
      header_json: header,
      lines_json: lineItems,
      validation_json: {
        fileType: "pdf",
        rawTextLength: rawText.length,
        lineItemsDetected: lineItems.length,
        totalsValidation: totalsVal,
      },
      error: null,
    };
  } catch (err) {
    return {
      status: "failed",
      extractor: "pdf_text_v1",
      confidence_score: 0,
      raw_text: null,
      header_json: {},
      lines_json: [],
      validation_json: { fileType: "pdf" },
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * @param {{ buffer: Buffer, fileName: string, row?: Record<string, unknown>, ocrLang?: string }} opts
 */
export async function extractInvoiceFromBuffer(opts) {
  const { buffer, fileName, row = {}, ocrLang = "por+eng" } = opts;
  const ext = path.extname(fileName).toLowerCase() || ".bin";
  const fileType = guessFileType(fileName);

  if (fileType === "pdf") {
    try {
      const rawText = await extractPdfTextFromBuffer(new Uint8Array(buffer));
      const header = tryExtractHeader(rawText, row);
      const lineItems = extractLineItemsHeuristic(rawText);
      const totalsVal = validateTotalsAgainstSource(lineItems, row);
      const confidence = computeConfidenceBase(rawText.length, lineItems.length, totalsVal);
      return {
        status: "ok",
        extractor: "pdf_text_v1",
        confidence_score: confidence,
        raw_text: rawText,
        header_json: header,
        lines_json: lineItems,
        validation_json: {
          fileType: "pdf",
          rawTextLength: rawText.length,
          lineItemsDetected: lineItems.length,
          totalsValidation: totalsVal,
        },
        error: null,
      };
    } catch (err) {
      return {
        status: "failed",
        extractor: "pdf_text_v1",
        confidence_score: 0,
        raw_text: null,
        header_json: {},
        lines_json: [],
        validation_json: { fileType: "pdf" },
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  const tmpPath = path.join(os.tmpdir(), `extract-upload-${randomUUID()}${ext}`);
  await fs.writeFile(tmpPath, buffer);
  try {
    return await extractInvoiceFromFilePath({
      filePath: tmpPath,
      fileName,
      row,
      ocrLang,
      enableOcr: true,
    });
  } finally {
    await fs.unlink(tmpPath).catch(() => {});
  }
}
