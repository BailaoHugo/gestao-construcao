import { lookup } from "node:dns/promises";
import { NextResponse, type NextRequest } from "next/server";
import { pool } from "@/lib/db";

function getDbHostname(): string | null {
  const u = process.env.DATABASE_URL;
  if (!u || typeof u !== "string") return null;
  try {
    const url = new URL(u.replace(/^postgresql:\/\//i, "https://"));
    return url.hostname || null;
  } catch {
    return null;
  }
}

type DespesaRow = {
  source_key: string;
  source_status: string;
  match_status: string;
  match_key_used: string | null;
  obra: string;
  supplier: string | null;
  document_type: string | null;
  document_no: string | null;
  purchase_invoice_no: string | null;
  transaction_info: string | null;
  invoice_date: string | null;
  gross_total: string | null;
  net_total: string | null;
  tax_payable: string | null;
  line_descriptions: string | null;
  source_file_name: string;
  source_file_rel_path: string | null;
  ingested_at: string;
  canonical_document_id: string | null;
  canonical_line_count: number | null;
};

export async function GET(req: NextRequest) {
  const dbHost = getDbHostname();
  if (!dbHost) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    await lookup(dbHost);
  } catch (dnsErr) {
    const msg = dnsErr instanceof Error ? dnsErr.message : String(dnsErr);
    console.error("[api/obras/despesas] DNS lookup failed:", msg);
    return NextResponse.json({ error: "Database unreachable (DNS)" }, { status: 503 });
  }

  const sp = req.nextUrl.searchParams;
  const obra = sp.get("obra")?.trim() || "";
  const supplier = sp.get("supplier")?.trim() || "";
  const dateFrom = sp.get("dateFrom")?.trim() || "";
  const dateTo = sp.get("dateTo")?.trim() || "";
  const includeSemObra = (sp.get("includeSemObra") || "1") !== "0";
  const limitRaw = Number(sp.get("limit") || "200");
  const offsetRaw = Number(sp.get("offset") || "0");
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 1000)) : 200;
  const offset = Number.isFinite(offsetRaw) ? Math.max(0, offsetRaw) : 0;

  const where: string[] = [];
  const values: Array<string | number> = [];
  const push = (v: string | number) => {
    values.push(v);
    return `$${values.length}`;
  };

  if (!includeSemObra) where.push("s.obra <> 'SEM_OBRA'");
  if (obra) {
    const p = push(`%${obra}%`);
    where.push(`s.obra ilike ${p}`);
  }
  if (supplier) {
    const p = push(`%${supplier}%`);
    where.push(`coalesce(s.supplier, '') ilike ${p}`);
  }
  if (dateFrom) {
    const p = push(dateFrom);
    where.push(`s.invoice_date >= ${p}::date`);
  }
  if (dateTo) {
    const p = push(dateTo);
    where.push(`s.invoice_date <= ${p}::date`);
  }

  const whereSql = where.length ? `where ${where.join(" and ")}` : "";

  try {
    const listSql = `
      select
        s.source_key,
        s.source_status,
        s.match_status,
        s.match_key_used,
        s.obra,
        s.supplier,
        s.document_type,
        s.document_no,
        s.purchase_invoice_no,
        s.transaction_info,
        s.invoice_date::text,
        s.gross_total::text,
        s.net_total::text,
        s.tax_payable::text,
        s.line_descriptions,
        s.source_file_name,
        s.source_file_rel_path,
        s.ingested_at::text,
        d.id::text as canonical_document_id,
        (
          select count(*)::int
          from invoice_lines il
          where il.invoice_document_id = d.id
        ) as canonical_line_count
      from toconline_costs_staging s
      left join invoice_documents d on d.source_key = s.source_key
      ${whereSql}
      order by coalesce(s.invoice_date, date '1900-01-01') desc, s.ingested_at desc
      limit ${push(limit)}
      offset ${push(offset)}
    `;

    const countSql = `
      select count(*)::int as total_rows
      from toconline_costs_staging s
      ${whereSql}
    `;

    const summarySql = `
      select
        count(*)::int as rows_count,
        coalesce(sum(s.gross_total), 0)::text as gross_total_sum,
        coalesce(sum(s.net_total), 0)::text as net_total_sum,
        coalesce(sum(s.tax_payable), 0)::text as tax_total_sum
      from toconline_costs_staging s
      ${whereSql}
    `;

    const listValues = values.slice();
    const countValues = values.slice(0, values.length - 2);
    const summaryValues = values.slice(0, values.length - 2);

    // Executa em sequencia para evitar query concorrente no mesmo client do pg.
    const itemsRes = await pool.query<DespesaRow>(listSql, listValues);
    const countRes = await pool.query<{ total_rows: number }>(countSql, countValues);
    const summaryRes = await pool.query<{
      rows_count: number;
      gross_total_sum: string;
      net_total_sum: string;
      tax_total_sum: string;
    }>(summarySql, summaryValues);

    return NextResponse.json({
      filters: { obra, supplier, dateFrom, dateTo, includeSemObra, limit, offset },
      totalRows: countRes.rows[0]?.total_rows ?? 0,
      summary: summaryRes.rows[0] ?? {
        rows_count: 0,
        gross_total_sum: "0",
        net_total_sum: "0",
        tax_total_sum: "0",
      },
      items: itemsRes.rows,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/obras/despesas] query failed:", message);
    return NextResponse.json({ error: "Failed to load despesas" }, { status: 500 });
  }
}
