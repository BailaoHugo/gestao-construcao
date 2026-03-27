#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const [k, v] = arg.split("=", 2);
    const key = k.replace(/^--/, "");
    if (v !== undefined) {
      out[key] = v;
      continue;
    }
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = "1";
    }
  }
  return out;
}

function normalizeDocumentNo(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

function normalizeDocumentNoLoose(value) {
  return normalizeDocumentNo(value).replace(/\s*\/\s*/g, "/").replace(/\s*-\s*/g, "-");
}

function safeFolderName(value) {
  const raw = (value || "").trim() || "SEM_OBRA";
  const cleaned = raw.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ").trim();
  return cleaned.slice(0, 80) || "SEM_OBRA";
}

function parseHyperlink(value) {
  const text = String(value || "");
  const m = text.match(/HYPERLINK\("([^"]+)"\)/i);
  return m ? m[1] : "";
}

function parseCsv(content) {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (lines.length === 0) return [];
  const rows = [];
  const headers = splitCsvLine(lines[0]);
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cols = splitCsvLine(line);
    const row = {};
    for (let j = 0; j < headers.length; j += 1) {
      row[headers[j]] = cols[j] ?? "";
    }
    rows.push(row);
  }
  return rows;
}

function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const nxt = i + 1 < line.length ? line[i + 1] : "";
    if (ch === '"' && inQuotes && nxt === '"') {
      cur += '"';
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function toCsv(rows, headers) {
  const escape = (v) => {
    const s = String(v ?? "");
    if (!/[",\n]/.test(s)) return s;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [headers.map(escape).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h] ?? "")).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function parseDateFromTransactionInfo(value) {
  const text = String(value || "").trim();
  const m = text.match(/^(\d{4}-\d{2}-\d{2})\b/);
  return m ? m[1] : null;
}

function toNumeric(value) {
  const s = String(value ?? "").trim();
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function buildSourceKey(row) {
  const raw = [
    row.api_document_id || "",
    row.purchase_invoice_no || "",
    row.invoice_no || "",
    row.file_rel_path || "",
    row.file_name || "",
  ].join("|");
  return crypto.createHash("sha1").update(raw).digest("hex");
}

async function upsertIntoStaging(rows) {
  if (!rows.length) return { insertedOrUpdated: 0 };
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL nao definido (necessario para --dbUpsert=1)");
  }
  const { Pool } = await import("pg");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let insertedOrUpdated = 0;
    for (const row of rows) {
      const sourceKey = buildSourceKey(row);
      const matchStatus = row.obra === "SEM_OBRA" ? "SEM_OBRA" : "matched";
      const invoiceDate = parseDateFromTransactionInfo(row.transaction_info);
      const metadata = {
        purchaseInvoiceType: row.purchase_invoice_type || null,
        invoiceType: row.invoice_type || null,
        fileRelPath: row.file_rel_path || null,
      };
      await client.query(
        `
          insert into toconline_costs_staging (
            source_key,
            source_doc_id,
            source_file_name,
            source_file_rel_path,
            source_status,
            match_status,
            match_key_used,
            obra,
            obra_folder,
            supplier,
            document_type,
            document_no,
            purchase_invoice_type,
            purchase_invoice_no,
            transaction_info,
            invoice_date,
            gross_total,
            net_total,
            tax_payable,
            line_descriptions,
            metadata,
            updated_at
          )
          values (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21::jsonb, now()
          )
          on conflict (source_key)
          do update set
            source_doc_id = excluded.source_doc_id,
            source_file_name = excluded.source_file_name,
            source_file_rel_path = excluded.source_file_rel_path,
            source_status = excluded.source_status,
            match_status = excluded.match_status,
            match_key_used = excluded.match_key_used,
            obra = excluded.obra,
            obra_folder = excluded.obra_folder,
            supplier = excluded.supplier,
            document_type = excluded.document_type,
            document_no = excluded.document_no,
            purchase_invoice_type = excluded.purchase_invoice_type,
            purchase_invoice_no = excluded.purchase_invoice_no,
            transaction_info = excluded.transaction_info,
            invoice_date = excluded.invoice_date,
            gross_total = excluded.gross_total,
            net_total = excluded.net_total,
            tax_payable = excluded.tax_payable,
            line_descriptions = excluded.line_descriptions,
            metadata = excluded.metadata,
            updated_at = now()
        `,
        [
          sourceKey,
          row.api_document_id ? Number(row.api_document_id) : null,
          row.file_name || "",
          row.file_rel_path || null,
          row.status || "missing",
          matchStatus,
          row.match_key_used || null,
          row.obra || "SEM_OBRA",
          row.obra_folder || "SEM_OBRA",
          row.supplier || null,
          row.invoice_type || row.purchase_invoice_type || null,
          row.api_document_no || row.purchase_invoice_no || row.invoice_no || null,
          row.purchase_invoice_type || null,
          row.purchase_invoice_no || null,
          row.transaction_info || null,
          invoiceDate,
          toNumeric(row.gross_total),
          toNumeric(row.net_total),
          toNumeric(row.tax_payable),
          row.line_descriptions || null,
          JSON.stringify(metadata),
        ],
      );
      insertedOrUpdated += 1;
    }
    await client.query("COMMIT");
    return { insertedOrUpdated };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

function normalizeTextLoose(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function buildTxnRefIndex(apiRows) {
  const byKey = new Map();
  for (const row of apiRows) {
    const date = String(row.date || "").trim();
    const supplier = normalizeTextLoose(row.supplier || "");
    const gross = String(row.gross_total || "").trim();
    if (!date) continue;
    const key = `${date}|${supplier}|${gross}`;
    if (!byKey.has(key)) byKey.set(key, row);
  }
  return byKey;
}

function parseTransactionInfo(value) {
  // Ex.: "2026-01-13 BNC 01/7"
  const text = String(value || "").trim();
  const m = text.match(/^(\d{4}-\d{2}-\d{2})\s+(.+)$/);
  if (!m) return { date: "", reference: "" };
  return { date: m[1], reference: m[2].trim() };
}

function resolveApiMatch(row, apiByDocNo, apiByDocNoLoose, apiByTxnRef) {
  const candidates = [
    { name: "purchase_invoice_no", value: row.PURCHASE_INVOICE_NO || "" },
    { name: "invoice_no", value: row.INVOICE_NO || "" },
  ];

  for (const c of candidates) {
    const strict = normalizeDocumentNo(c.value);
    if (strict) {
      const hit = apiByDocNo.get(strict);
      if (hit) return { api: hit, keyUsed: `${c.name}:strict` };
    }
    const loose = normalizeDocumentNoLoose(c.value);
    if (loose) {
      const hit = apiByDocNoLoose.get(loose);
      if (hit) return { api: hit, keyUsed: `${c.name}:loose` };
    }
  }

  const tx = parseTransactionInfo(row.TRANSACTION_INFO || "");
  if (tx.date) {
    // For zip-only rows, supplier/gross are often absent; try broad fallback by date only.
    // If multiple hits exist on same date this remains ambiguous, so we only use unique dates.
    let dateOnlyHits = 0;
    let lastDateHit = null;
    for (const [, api] of apiByTxnRef) {
      if (String(api.date || "") === tx.date) {
        dateOnlyHits += 1;
        lastDateHit = api;
        if (dateOnlyHits > 1) break;
      }
    }
    if (dateOnlyHits === 1 && lastDateHit) {
      return { api: lastDateHit, keyUsed: "transaction_info:date_unique" };
    }
  }

  return { api: null, keyUsed: "" };
}

async function main() {
  const args = parseArgs(process.argv);
  const extractedDir = path.resolve(args.extractedDir || "tmp/toconline-ad-test/extracted");
  const zipCsv = path.resolve(
    args.zipCsv || path.join(extractedDir, "archive_export_301647_2026_1.TkiFvb.csv"),
  );
  const apiIndex = path.resolve(
    args.apiIndex || "tmp/toconline-ad-test/index_from_api.csv",
  );
  const outDir = path.resolve(
    args.outDir || "tmp/toconline-ad-test/organized-by-obra",
  );
  const dbUpsert =
    String(args.dbUpsert || process.env.TOCONLINE_DB_UPSERT || "0").toLowerCase() === "1" ||
    String(args.dbUpsert || process.env.TOCONLINE_DB_UPSERT || "0").toLowerCase() === "true";

  if (!fs.existsSync(zipCsv)) {
    throw new Error(`zipCsv não encontrado: ${zipCsv}`);
  }
  if (!fs.existsSync(apiIndex)) {
    throw new Error(`apiIndex não encontrado: ${apiIndex}`);
  }
  if (!fs.existsSync(extractedDir)) {
    throw new Error(`extractedDir não encontrado: ${extractedDir}`);
  }

  const apiRows = parseCsv(readText(apiIndex));
  const zipRows = parseCsv(readText(zipCsv));

  const apiByDocNo = new Map();
  const apiByDocNoLoose = new Map();
  const apiByTxnRef = buildTxnRefIndex(apiRows);
  for (const row of apiRows) {
    const k = normalizeDocumentNo(row.document_no);
    const kl = normalizeDocumentNoLoose(row.document_no);
    if (k) apiByDocNo.set(k, row);
    if (kl) apiByDocNoLoose.set(kl, row);
  }

  fs.mkdirSync(outDir, { recursive: true });

  let copied = 0;
  let missingFiles = 0;
  let unmatchedDocs = 0;
  const finalRows = [];

  for (const row of zipRows) {
    const { api, keyUsed } = resolveApiMatch(row, apiByDocNo, apiByDocNoLoose, apiByTxnRef);
    if (!api) unmatchedDocs += 1;
    const obra = (api?.obra_detectada || "").trim();
    const obraFolder = safeFolderName(obra);
    const rel = parseHyperlink(row.LINK);
    const src = path.join(extractedDir, rel);
    const fileName = path.basename(rel || "");
    const targetFolder = path.join(outDir, obraFolder);
    const dst = path.join(targetFolder, fileName);

    let status = "missing";
    if (rel && fs.existsSync(src) && fileName) {
      fs.mkdirSync(targetFolder, { recursive: true });
      fs.copyFileSync(src, dst);
      copied += 1;
      status = "copied";
    } else {
      missingFiles += 1;
    }

    finalRows.push({
      status,
      obra: obra || "SEM_OBRA",
      obra_folder: obraFolder,
      file_rel_path: rel,
      file_name: fileName,
      purchase_invoice_no: row.PURCHASE_INVOICE_NO || "",
      invoice_no: row.INVOICE_NO || "",
      purchase_invoice_type: row.PURCHASE_INVOICE_TYPE || "",
      invoice_type: row.INVOICE_TYPE || "",
      match_key_used: keyUsed,
      transaction_info: row.TRANSACTION_INFO || "",
      supplier: api?.supplier || "",
      api_document_no: api?.document_no || "",
      api_document_id: api?.document_id || "",
      gross_total: api?.gross_total || "",
      net_total: api?.net_total || "",
      tax_payable: api?.tax_payable || "",
      line_descriptions: api?.line_descriptions || "",
    });
  }

  const finalCsvPath = path.join(outDir, "index_final.csv");
  const headers = [
    "status",
    "obra",
    "obra_folder",
    "file_rel_path",
    "file_name",
    "purchase_invoice_no",
    "invoice_no",
    "purchase_invoice_type",
    "invoice_type",
    "match_key_used",
    "transaction_info",
    "supplier",
    "api_document_no",
    "api_document_id",
    "gross_total",
    "net_total",
    "tax_payable",
    "line_descriptions",
  ];
  fs.writeFileSync(finalCsvPath, toCsv(finalRows, headers), "utf8");

  let upserted = 0;
  if (dbUpsert) {
    const result = await upsertIntoStaging(finalRows);
    upserted = result.insertedOrUpdated;
  }

  console.log(`[ok] outDir: ${outDir}`);
  console.log(`[ok] index_final: ${finalCsvPath}`);
  console.log(`[ok] linhas ZIP: ${zipRows.length}`);
  console.log(`[ok] copiados: ${copied}`);
  console.log(`[warn] ficheiros em falta: ${missingFiles}`);
  console.log(`[warn] docs sem match no API index: ${unmatchedDocs}`);
  if (dbUpsert) {
    console.log(`[ok] upsert staging rows: ${upserted}`);
  } else {
    console.log("[info] db upsert desligado (use --dbUpsert=1)");
  }
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.error("[toconline-organize-by-obra] erro:", message || "(sem mensagem)");
  if (stack) console.error(stack);
  process.exit(1);
});
