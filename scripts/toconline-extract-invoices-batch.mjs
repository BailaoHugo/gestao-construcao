#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import {
  extractInvoiceFromFilePath,
  isTesseractAvailable,
} from "./lib/toconline-extract-core.mjs";

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

async function firstExistingPath(paths) {
  for (const p of paths) {
    try {
      const st = await fs.stat(p);
      if (st.isFile()) return p;
    } catch {
      // ignore
    }
  }
  return null;
}

async function upsertExtraction(client, payload) {
  await client.query(
    `
      insert into invoice_extractions (
        source_key,
        extract_version,
        status,
        extractor,
        confidence_score,
        raw_text,
        header_json,
        lines_json,
        validation_json,
        error,
        updated_at
      )
      values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb,$10, now())
      on conflict (source_key, extract_version)
      do update set
        status = excluded.status,
        extractor = excluded.extractor,
        confidence_score = excluded.confidence_score,
        raw_text = excluded.raw_text,
        header_json = excluded.header_json,
        lines_json = excluded.lines_json,
        validation_json = excluded.validation_json,
        error = excluded.error,
        updated_at = now()
    `,
    [
      payload.source_key,
      payload.extract_version,
      payload.status,
      payload.extractor,
      payload.confidence_score,
      payload.raw_text,
      JSON.stringify(payload.header_json || {}),
      JSON.stringify(payload.lines_json || []),
      JSON.stringify(payload.validation_json || {}),
      payload.error || null,
    ],
  );
}

function stagingRowToContext(row) {
  return {
    document_no: row.document_no,
    purchase_invoice_no: row.purchase_invoice_no,
    gross_total: row.gross_total,
    net_total: row.net_total,
    tax_payable: row.tax_payable,
    supplier: row.supplier,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const limit = Math.max(1, Math.min(Number(args.limit || "20"), 200));
  const onlySemObra = String(args.onlySemObra || "0") === "1";
  const sourceKey = (args.sourceKey || "").trim();
  const extractVersion = (args.extractVersion || "v1").trim();
  const enableOcr = String(args.enableOcr || "1") !== "0";
  const ocrLang = (args.ocrLang || "por+eng").trim();

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL nao definido");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  try {
    const canOcr = enableOcr ? await isTesseractAvailable() : false;
    const where = ["s.source_status = 'copied'"];
    const values = [];
    const push = (v) => {
      values.push(v);
      return `$${values.length}`;
    };

    if (onlySemObra) where.push("s.obra = 'SEM_OBRA'");
    if (sourceKey) where.push(`s.source_key = ${push(sourceKey)}`);
    where.push(
      `not exists (
        select 1
        from invoice_extractions e
        where e.source_key = s.source_key
          and e.extract_version = ${push(extractVersion)}
      )`,
    );

    const sql = `
      select
        s.source_key,
        s.obra_folder,
        s.source_file_name,
        s.source_file_rel_path,
        s.supplier,
        s.document_no,
        s.purchase_invoice_no,
        s.gross_total::text,
        s.net_total::text,
        s.tax_payable::text
      from toconline_costs_staging s
      where ${where.join(" and ")}
      order by coalesce(s.invoice_date, date '1900-01-01') desc, s.ingested_at desc
      limit ${push(limit)}
    `;

    const res = await client.query(sql, values);
    const rows = res.rows;
    let ok = 0;
    let needsOcr = 0;
    let failed = 0;

    for (const row of rows) {
      const cwd = process.cwd();
      const organizedPath = path.resolve(
        cwd,
        "tmp/toconline-ad-test/organized-by-obra",
        row.obra_folder || "SEM_OBRA",
        row.source_file_name,
      );
      const extractedPath = row.source_file_rel_path
        ? path.resolve(cwd, "tmp/toconline-ad-test/extracted", row.source_file_rel_path)
        : "";
      const filePath = await firstExistingPath(
        [organizedPath, extractedPath].filter(Boolean),
      );

      if (!filePath) {
        await upsertExtraction(client, {
          source_key: row.source_key,
          extract_version: extractVersion,
          status: "failed",
          extractor: "pdf_text_v1",
          confidence_score: 0,
          raw_text: null,
          header_json: {},
          lines_json: [],
          validation_json: {},
          error: "file_not_found",
        });
        failed += 1;
        continue;
      }

      const ctx = stagingRowToContext(row);
      const result = await extractInvoiceFromFilePath({
        filePath,
        fileName: row.source_file_name,
        row: ctx,
        ocrLang,
        enableOcr,
      });

      if (result.status === "ok") {
        await upsertExtraction(client, {
          source_key: row.source_key,
          extract_version: extractVersion,
          status: "ok",
          extractor: result.extractor,
          confidence_score: result.confidence_score,
          raw_text: result.raw_text,
          header_json: result.header_json,
          lines_json: result.lines_json,
          validation_json: result.validation_json,
          error: null,
        });
        ok += 1;
        continue;
      }

      if (result.status === "needs_ocr") {
        await upsertExtraction(client, {
          source_key: row.source_key,
          extract_version: extractVersion,
          status: "needs_ocr",
          extractor: result.extractor,
          confidence_score: result.confidence_score,
          raw_text: result.raw_text,
          header_json: result.header_json,
          lines_json: result.lines_json,
          validation_json: result.validation_json,
          error: result.error,
        });
        needsOcr += 1;
        continue;
      }

      await upsertExtraction(client, {
        source_key: row.source_key,
        extract_version: extractVersion,
        status: "failed",
        extractor: result.extractor,
        confidence_score: result.confidence_score,
        raw_text: result.raw_text,
        header_json: result.header_json,
        lines_json: result.lines_json,
        validation_json: result.validation_json,
        error: result.error,
      });
      failed += 1;
    }

    console.log(`[ok] candidatos processados: ${rows.length}`);
    console.log(`[ok] extraidos pdf_text: ${ok}`);
    console.log(`[warn] needs_ocr: ${needsOcr}`);
    console.log(`[warn] failed: ${failed}`);
    console.log(`[info] ocr disponivel: ${canOcr ? "sim" : "nao"}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.error("[toconline-extract-invoices-batch] erro:", message || "(sem mensagem)");
  if (stack) console.error(stack);
  process.exit(1);
});
