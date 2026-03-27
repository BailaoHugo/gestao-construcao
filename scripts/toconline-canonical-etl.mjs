#!/usr/bin/env node
/**
 * Popula `obras`, `suppliers`, `invoice_documents`, `invoice_lines` a partir de
 * `toconline_costs_staging` + `invoice_extractions` (extract_version v1 por defeito).
 *
 * Uso: DATABASE_URL=... node scripts/toconline-canonical-etl.mjs [--limit=500] [--sourceKey=...]
 */
import { Pool } from "pg";

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

function normNif(s) {
  const t = String(s || "").replace(/\D/g, "");
  return t.length === 9 ? t : null;
}

async function ensureObra(client, codeRaw) {
  const code = String(codeRaw || "SEM_OBRA").trim() || "SEM_OBRA";
  const name = code;
  const r = await client.query(
    `
      insert into obras (code, name)
      values ($1, $2)
      on conflict (code) do update set
        name = excluded.name,
        updated_at = now()
      returning id
    `,
    [code, name],
  );
  return r.rows[0].id;
}

async function ensureSupplier(client, nameRaw, nifHint) {
  const name = String(nameRaw || "Desconhecido").trim() || "Desconhecido";
  const nif = normNif(nifHint);
  if (nif) {
    const ex = await client.query(`select id from suppliers where nif = $1`, [nif]);
    if (ex.rows.length) return ex.rows[0].id;
    const ins = await client.query(
      `insert into suppliers (nif, name) values ($1, $2) returning id`,
      [nif, name],
    );
    return ins.rows[0].id;
  }
  const ex2 = await client.query(
    `
      select id from suppliers
      where nif is null and lower(trim(name)) = lower(trim($1))
      limit 1
    `,
    [name],
  );
  if (ex2.rows.length) return ex2.rows[0].id;
  const ins2 = await client.query(
    `insert into suppliers (nif, name) values (null, $1) returning id`,
    [name],
  );
  return ins2.rows[0].id;
}

function stagingLineItemsToRows(lineItems) {
  if (!Array.isArray(lineItems)) return [];
  const out = [];
  let no = 1;
  for (const it of lineItems) {
    if (!it || typeof it !== "object") continue;
    const desc =
      it.descricao ||
      it.description ||
      it.Descricao ||
      it.artigo ||
      String(it.text || "").trim();
    if (!desc) continue;
    const qty = it.quantidade ?? it.qty ?? it.quantity ?? null;
    const unit = it.precoUnitario ?? it.unit_price ?? it.preco_unitario ?? null;
    const total = it.totalLinha ?? it.total ?? it.line_total ?? null;
    out.push({
      line_no: no++,
      article_code: it.codigo ?? it.article_code ?? it.code ?? null,
      description: String(desc).slice(0, 4000),
      unit: it.unidade ?? it.unit ?? null,
      quantity: qty != null ? Number(qty) : null,
      unit_price: unit != null ? Number(unit) : null,
      line_total: total != null ? Number(total) : null,
      vat_rate_percent:
        it.ivaPercent != null
          ? Number(it.ivaPercent)
          : it.vat_rate_percent != null
            ? Number(it.vat_rate_percent)
            : null,
      line_extras: it,
    });
  }
  return out;
}

function extractionLinesToRows(linesJson) {
  if (!Array.isArray(linesJson)) return [];
  const out = [];
  let no = 1;
  for (const it of linesJson) {
    if (!it || typeof it !== "object") continue;
    const desc = it.descricao || it.description;
    if (!desc) continue;
    out.push({
      line_no: no++,
      article_code: it.codigo ?? it.article_code ?? null,
      description: String(desc).slice(0, 4000),
      unit: it.unidade ?? it.unit ?? null,
      quantity: it.quantidade != null ? Number(it.quantidade) : null,
      unit_price: it.precoUnitario != null ? Number(it.precoUnitario) : null,
      line_total: it.totalLinha != null ? Number(it.totalLinha) : null,
      vat_rate_percent: it.ivaPercent != null ? Number(it.ivaPercent) : null,
      line_extras: {
        coerente: it.coerente,
        source: it.source,
      },
    });
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const limit = Math.max(1, Math.min(Number(args.limit || "20000"), 100000));
  const sourceKey = (args.sourceKey || "").trim();

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL nao definido");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  try {
    const values = [];
    const push = (v) => {
      values.push(v);
      return `$${values.length}`;
    };
    const where = [];
    if (sourceKey) where.push(`s.source_key = ${push(sourceKey)}`);

    const sql = `
      select
        s.source_key,
        s.match_status,
        s.match_key_used,
        s.obra,
        s.supplier,
        s.document_type,
        s.document_no,
        s.purchase_invoice_no,
        s.transaction_info,
        s.invoice_date,
        s.gross_total,
        s.net_total,
        s.tax_payable,
        s.source_file_name,
        s.source_file_rel_path,
        s.line_items,
        case
          when e2.header_json is not null and e2.header_json <> '{}'::jsonb then e2.header_json
          when e1b.header_json is not null and e1b.header_json <> '{}'::jsonb then e1b.header_json
          else coalesce(e1.header_json, '{}'::jsonb)
        end as header_json,
        case
          when coalesce(jsonb_array_length(e2.lines_json), 0) > 0 then e2.lines_json
          when coalesce(jsonb_array_length(e1b.lines_json), 0) > 0 then e1b.lines_json
          else coalesce(e1.lines_json, '[]'::jsonb)
        end as lines_json,
        case
          when coalesce(jsonb_array_length(e2.lines_json), 0) > 0 then e2.extract_version
          when coalesce(jsonb_array_length(e1b.lines_json), 0) > 0 then e1b.extract_version
          else e1.extract_version
        end as extract_version
      from toconline_costs_staging s
      left join invoice_extractions e1
        on e1.source_key = s.source_key and e1.extract_version = 'v1'
      left join invoice_extractions e1b
        on e1b.source_key = s.source_key and e1b.extract_version = 'v1b'
      left join invoice_extractions e2
        on e2.source_key = s.source_key and e2.extract_version = 'v2'
      ${where.length ? `where ${where.join(" and ")}` : ""}
      order by coalesce(s.invoice_date, date '1900-01-01') desc, s.ingested_at desc
      limit ${push(limit)}
    `;

    const res = await client.query(sql, values);
    let docs = 0;
    let lines = 0;

    for (const row of res.rows) {
      await client.query("BEGIN");
      try {
        const obraId = await ensureObra(client, row.obra);
        const header = row.header_json && typeof row.header_json === "object" ? row.header_json : {};
        const nifHint = header.detectedNif || null;
        const supplierId = await ensureSupplier(client, row.supplier, nifHint);

        const docRes = await client.query(
          `
            insert into invoice_documents (
              source_key,
              supplier_id,
              obra_id,
              match_status,
              match_key_used,
              invoice_date,
              document_type,
              document_no,
              purchase_invoice_no,
              transaction_info,
              gross_total,
              net_total,
              tax_payable,
              source_file_name,
              source_file_rel_path,
              extract_version,
              header_extras
            )
            values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb)
            on conflict (source_key) do update set
              supplier_id = excluded.supplier_id,
              obra_id = excluded.obra_id,
              match_status = excluded.match_status,
              match_key_used = excluded.match_key_used,
              invoice_date = excluded.invoice_date,
              document_type = excluded.document_type,
              document_no = excluded.document_no,
              purchase_invoice_no = excluded.purchase_invoice_no,
              transaction_info = excluded.transaction_info,
              gross_total = excluded.gross_total,
              net_total = excluded.net_total,
              tax_payable = excluded.tax_payable,
              source_file_name = excluded.source_file_name,
              source_file_rel_path = excluded.source_file_rel_path,
              extract_version = excluded.extract_version,
              header_extras = excluded.header_extras,
              updated_at = now()
            returning id
          `,
          [
            row.source_key,
            supplierId,
            obraId,
            row.match_status,
            row.match_key_used,
            row.invoice_date,
            row.document_type,
            row.document_no,
            row.purchase_invoice_no,
            row.transaction_info,
            row.gross_total,
            row.net_total,
            row.tax_payable,
            row.source_file_name,
            row.source_file_rel_path,
            row.extract_version || "v1",
            JSON.stringify(header),
          ],
        );
        const docId = docRes.rows[0].id;

        let lineRows = extractionLinesToRows(row.lines_json);
        if (lineRows.length === 0 && row.line_items) {
          let parsed = row.line_items;
          if (typeof parsed === "string") {
            try {
              parsed = JSON.parse(parsed);
            } catch {
              parsed = null;
            }
          }
          lineRows = stagingLineItemsToRows(parsed);
        }

        await client.query(`delete from invoice_lines where invoice_document_id = $1`, [docId]);

        for (const ln of lineRows) {
          await client.query(
            `
              insert into invoice_lines (
                invoice_document_id,
                line_no,
                article_code,
                description,
                unit,
                quantity,
                unit_price,
                line_total,
                discount_amount,
                vat_rate_percent,
                vat_amount,
                line_extras
              )
              values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)
            `,
            [
              docId,
              ln.line_no,
              ln.article_code,
              ln.description,
              ln.unit,
              ln.quantity,
              ln.unit_price,
              ln.line_total,
              null,
              ln.vat_rate_percent,
              null,
              JSON.stringify(ln.line_extras || {}),
            ],
          );
          lines += 1;
        }

        docs += 1;
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      }
    }

    console.log(
      `[toconline-canonical-etl] ok: documentos=${docs} linhas=${lines} (merge v2 > v1b > v1)`,
    );
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[toconline-canonical-etl] erro:", err?.message || err);
  process.exit(1);
});
