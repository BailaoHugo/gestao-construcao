import { NextResponse, type NextRequest } from "next/server";
import { pool } from "@/lib/db";

export interface CustomArticleRow {
  id: string;
  code: string;
  description: string;
  unit: string;
  grande_capitulo_code: string;
  capitulo_code: string;
  pu_custo: number | null;
  pu_venda_fixo: number | null;
  created_at: string;
}

/** GET: list all custom articles for catalog merge */
export async function GET() {
  try {
    const result = await pool.query<CustomArticleRow>(
      `select id, code, description, unit, grande_capitulo_code, capitulo_code, pu_custo, pu_venda_fixo, created_at
       from custom_articles
       order by grande_capitulo_code, capitulo_code, code`,
    );
    return NextResponse.json(result.rows);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/artigos] GET failed:", message);
    return NextResponse.json(
      { error: "Failed to load custom articles" },
      { status: 500 },
    );
  }
}

/** POST: create a custom article; returns the created row (including generated code) */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const unit = typeof body.unit === "string" ? body.unit.trim() : "";
    const grandeCapituloCode = typeof body.grandeCapituloCode === "string" ? body.grandeCapituloCode.trim() : "";
    const capituloCode = typeof body.capituloCode === "string" ? body.capituloCode.trim() : "";
    const puCusto = typeof body.puCusto === "number" && !Number.isNaN(body.puCusto) ? body.puCusto : null;
    const puVendaFixo = typeof body.puVendaFixo === "number" && !Number.isNaN(body.puVendaFixo) ? body.puVendaFixo : null;

    if (!description || !unit || !grandeCapituloCode || !capituloCode) {
      return NextResponse.json(
        { error: "description, unit, grandeCapituloCode and capituloCode are required" },
        { status: 400 },
      );
    }

    const client = await pool.connect();
    try {
      const countResult = await client.query<{ n: string }>(
        `select count(*)::text as n from custom_articles where capitulo_code = $1`,
        [capituloCode],
      );
      const n = parseInt(countResult.rows[0]?.n ?? "0", 10) + 1;
      const code = `${capituloCode}.C${String(n).padStart(3, "0")}`;

      const insertResult = await client.query<CustomArticleRow>(
        `insert into custom_articles (code, description, unit, grande_capitulo_code, capitulo_code, pu_custo, pu_venda_fixo)
         values ($1, $2, $3, $4, $5, $6, $7)
         returning id, code, description, unit, grande_capitulo_code, capitulo_code, pu_custo, pu_venda_fixo, created_at`,
        [code, description, unit, grandeCapituloCode, capituloCode, puCusto, puVendaFixo],
      );
      const row = insertResult.rows[0];
      if (!row) {
        return NextResponse.json({ error: "Insert failed" }, { status: 500 });
      }
      return NextResponse.json(row);
    } finally {
      client.release();
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/artigos] POST failed:", message);
    return NextResponse.json(
      { error: "Failed to create custom article" },
      { status: 500 },
    );
  }
}
