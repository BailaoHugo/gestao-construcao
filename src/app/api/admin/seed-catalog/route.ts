import { NextResponse, type NextRequest } from "next/server";
import { pool } from "@/lib/db";

type SeedRow = {
  capitulo_num: number;
  capitulo_nome: string;
  subcapitulo?: string | null;
  codigo: string;
  descricao: string;
  unidade: string;
  preco_custo: number;
  k_padrao: number;
  tipo_catalogo: string;
  categoria_cype?: string | null;
  subcategoria_cype?: string | null;
  seccao_cype?: string | null;
};

/** GET /api/admin/seed-catalog — returns current row count */
export async function GET() {
  try {
    const result = await pool.query(
      "SELECT COUNT(*)::int AS total FROM catalogo_ennova",
    );
    return NextResponse.json({ total: result.rows[0].total });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[seed-catalog] GET failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE /api/admin/seed-catalog — truncate (reset before re-seed) */
export async function DELETE() {
  try {
    const result = await pool.query("DELETE FROM catalogo_ennova");
    return NextResponse.json({ deleted: result.rowCount });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[seed-catalog] DELETE failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/admin/seed-catalog
 * Body: { rows: SeedRow[] }
 * Inserts a batch of rows into catalogo_ennova.
 * Call repeatedly with batches of ~200 rows.
 */
export async function POST(req: NextRequest) {
  try {
    const { rows } = (await req.json()) as { rows: SeedRow[] };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "rows[] required" }, { status: 400 });
    }

    const valueClauses: string[] = [];
    const params: unknown[] = [];
    let pi = 1;

    for (const row of rows) {
      valueClauses.push(
        `($${pi},$${pi + 1},$${pi + 2},$${pi + 3},$${pi + 4},$${pi + 5},$${pi + 6},$${pi + 7},$${pi + 8},$${pi + 9},$${pi + 10},$${pi + 11})`,
      );
      params.push(
        row.capitulo_num,
        row.capitulo_nome,
        row.subcapitulo ?? null,
        row.codigo,
        row.descricao,
        row.unidade,
        row.preco_custo,
        row.k_padrao,
        row.tipo_catalogo,
        row.categoria_cype ?? null,
        row.subcategoria_cype ?? null,
        row.seccao_cype ?? null,
      );
      pi += 12;
    }

    const sql = `
      INSERT INTO catalogo_ennova
        (capitulo_num, capitulo_nome, subcapitulo, codigo, descricao, unidade,
         preco_custo, k_padrao, tipo_catalogo, categoria_cype, subcategoria_cype, seccao_cype)
      VALUES ${valueClauses.join(",")}
      ON CONFLICT DO NOTHING
    `;

    const result = await pool.query(sql, params);
    return NextResponse.json({ inserted: result.rowCount, total: rows.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[seed-catalog] POST failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
