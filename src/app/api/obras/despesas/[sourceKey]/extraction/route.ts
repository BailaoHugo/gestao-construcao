import { NextResponse, type NextRequest } from "next/server";
import { pool } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sourceKey: string }> },
) {
  const { sourceKey } = await params;
  if (!sourceKey) {
    return NextResponse.json({ error: "sourceKey em falta" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const result = await client.query<{
      source_key: string;
      extract_version: string;
      status: string;
      extractor: string;
      confidence_score: string | null;
      raw_text: string | null;
      header_json: unknown;
      lines_json: unknown;
      validation_json: unknown;
      error: string | null;
      updated_at: string;
    }>(
      `
        select
          source_key,
          extract_version,
          status,
          extractor,
          confidence_score::text,
          raw_text,
          header_json,
          lines_json,
          validation_json,
          error,
          updated_at::text
        from invoice_extractions
        where source_key = $1
        order by updated_at desc
        limit 1
      `,
      [sourceKey],
    );

    if (!result.rowCount) {
      return NextResponse.json({ error: "Extracao nao encontrada" }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/obras/despesas/extraction] failed:", message);
    return NextResponse.json({ error: "Falha ao carregar extracao" }, { status: 500 });
  } finally {
    client.release();
  }
}
