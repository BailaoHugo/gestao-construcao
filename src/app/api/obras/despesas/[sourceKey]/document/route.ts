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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sourceKey: string }> },
) {
  const { sourceKey: raw } = await params;
  const sourceKey = decodeURIComponent(raw || "");
  if (!sourceKey) {
    return NextResponse.json({ error: "sourceKey em falta" }, { status: 400 });
  }

  const dbHost = getDbHostname();
  if (!dbHost) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
  try {
    await lookup(dbHost);
  } catch (dnsErr) {
    const msg = dnsErr instanceof Error ? dnsErr.message : String(dnsErr);
    console.error("[api/obras/despesas/document] DNS lookup failed:", msg);
    return NextResponse.json({ error: "Database unreachable (DNS)" }, { status: 503 });
  }

  try {
    const docRes = await pool.query<{
      id: string;
      source_key: string;
      supplier_id: string | null;
      obra_id: string | null;
      match_status: string | null;
      match_key_used: string | null;
      invoice_date: string | null;
      document_type: string | null;
      document_no: string | null;
      purchase_invoice_no: string | null;
      transaction_info: string | null;
      gross_total: string | null;
      net_total: string | null;
      tax_payable: string | null;
      source_file_name: string | null;
      source_file_rel_path: string | null;
      extract_version: string;
      header_extras: unknown;
      obra_code: string | null;
      obra_name: string | null;
      supplier_name: string | null;
      supplier_nif: string | null;
    }>(
      `
        select
          d.id::text,
          d.source_key,
          d.supplier_id::text,
          d.obra_id::text,
          d.match_status,
          d.match_key_used,
          d.invoice_date::text,
          d.document_type,
          d.document_no,
          d.purchase_invoice_no,
          d.transaction_info,
          d.gross_total::text,
          d.net_total::text,
          d.tax_payable::text,
          d.source_file_name,
          d.source_file_rel_path,
          d.extract_version,
          d.header_extras,
          o.code as obra_code,
          o.name as obra_name,
          s.name as supplier_name,
          s.nif as supplier_nif
        from invoice_documents d
        left join obras o on o.id = d.obra_id
        left join suppliers s on s.id = d.supplier_id
        where d.source_key = $1
      `,
      [sourceKey],
    );

    if (docRes.rows.length === 0) {
      return NextResponse.json({ error: "Documento canónico não encontrado" }, { status: 404 });
    }

    const document = docRes.rows[0];

    const linesRes = await pool.query<{
      id: string;
      line_no: number;
      article_code: string | null;
      description: string | null;
      unit: string | null;
      quantity: string | null;
      unit_price: string | null;
      line_total: string | null;
      discount_amount: string | null;
      vat_rate_percent: string | null;
      vat_amount: string | null;
      line_extras: unknown;
    }>(
      `
        select
          id::text,
          line_no,
          article_code,
          description,
          unit,
          quantity::text,
          unit_price::text,
          line_total::text,
          discount_amount::text,
          vat_rate_percent::text,
          vat_amount::text,
          line_extras
        from invoice_lines
        where invoice_document_id = $1::bigint
        order by line_no asc
      `,
      [document.id],
    );

    return NextResponse.json({
      document,
      lines: linesRes.rows,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/obras/despesas/document] query failed:", message);
    return NextResponse.json({ error: "Failed to load document" }, { status: 500 });
  }
}
