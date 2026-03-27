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

type GroupBy = "supplier" | "day" | "article";

export async function GET(req: NextRequest) {
  const dbHost = getDbHostname();
  if (!dbHost) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    await lookup(dbHost);
  } catch (dnsErr) {
    const msg = dnsErr instanceof Error ? dnsErr.message : String(dnsErr);
    console.error("[api/obras/despesas/aggregates] DNS lookup failed:", msg);
    return NextResponse.json({ error: "Database unreachable (DNS)" }, { status: 503 });
  }

  const sp = req.nextUrl.searchParams;
  const groupBy = (sp.get("groupBy")?.trim() || "supplier") as GroupBy;
  const obra = sp.get("obra")?.trim() || "";
  const supplier = sp.get("supplier")?.trim() || "";
  const dateFrom = sp.get("dateFrom")?.trim() || "";
  const dateTo = sp.get("dateTo")?.trim() || "";
  const includeSemObra = (sp.get("includeSemObra") || "1") !== "0";
  const limitRaw = Number(sp.get("limit") || "200");
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 500)) : 200;

  const where: string[] = [];
  const values: Array<string | number> = [];
  const push = (v: string | number) => {
    values.push(v);
    return `$${values.length}`;
  };

  if (!includeSemObra) where.push(`o.code <> 'SEM_OBRA'`);
  if (obra) {
    const p = push(`%${obra}%`);
    where.push(`o.code ilike ${p}`);
  }
  if (supplier) {
    const p = push(`%${supplier}%`);
    where.push(`coalesce(s.name, '') ilike ${p}`);
  }
  if (dateFrom) {
    const p = push(dateFrom);
    where.push(`d.invoice_date >= ${p}::date`);
  }
  if (dateTo) {
    const p = push(dateTo);
    where.push(`d.invoice_date <= ${p}::date`);
  }

  const whereSql = where.length ? `where ${where.join(" and ")}` : "";

  try {
    if (groupBy === "supplier") {
      const sql = `
        select
          s.id::text as key,
          s.name as label,
          s.nif as nif,
          coalesce(sum(il.line_total), 0)::text as line_total_sum,
          count(distinct d.id)::int as invoice_count
        from invoice_documents d
        inner join suppliers s on s.id = d.supplier_id
        left join obras o on o.id = d.obra_id
        left join invoice_lines il on il.invoice_document_id = d.id
        ${whereSql}
        group by s.id, s.name, s.nif
        order by sum(il.line_total) desc nulls last
        limit ${push(limit)}
      `;
      const res = await pool.query(sql, values);
      return NextResponse.json({
        groupBy: "supplier",
        filters: { obra, supplier, dateFrom, dateTo, includeSemObra, limit },
        rows: res.rows,
      });
    }

    if (groupBy === "day") {
      const sql = `
        select
          coalesce(d.invoice_date::text, 'sem_data') as key,
          coalesce(d.invoice_date::text, 'sem_data') as label,
          coalesce(sum(il.line_total), 0)::text as line_total_sum,
          count(distinct d.id)::int as invoice_count
        from invoice_documents d
        left join obras o on o.id = d.obra_id
        left join suppliers s on s.id = d.supplier_id
        left join invoice_lines il on il.invoice_document_id = d.id
        ${whereSql}
        group by d.invoice_date
        order by d.invoice_date desc nulls last
        limit ${push(limit)}
      `;
      const res = await pool.query(sql, values);
      return NextResponse.json({
        groupBy: "day",
        filters: { obra, supplier, dateFrom, dateTo, includeSemObra, limit },
        rows: res.rows,
      });
    }

    if (groupBy === "article") {
      const sql = `
        select
          coalesce(nullif(trim(il.article_code), ''), left(il.description, 120)) as key,
          coalesce(nullif(trim(il.article_code), ''), left(il.description, 120)) as label,
          coalesce(sum(il.line_total), 0)::text as line_total_sum,
          coalesce(sum(il.quantity), 0)::text as quantity_sum,
          count(*)::int as line_count
        from invoice_lines il
        inner join invoice_documents d on d.id = il.invoice_document_id
        left join obras o on o.id = d.obra_id
        left join suppliers s on s.id = d.supplier_id
        ${whereSql}
        group by coalesce(nullif(trim(il.article_code), ''), left(il.description, 120))
        order by sum(il.line_total) desc nulls last
        limit ${push(limit)}
      `;
      const res = await pool.query(sql, values);
      return NextResponse.json({
        groupBy: "article",
        filters: { obra, supplier, dateFrom, dateTo, includeSemObra, limit },
        rows: res.rows,
      });
    }

    return NextResponse.json({ error: "groupBy inválido (supplier|day|article)" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/obras/despesas/aggregates] query failed:", message);
    return NextResponse.json({ error: "Failed to load aggregates" }, { status: 500 });
  }
}
