import { NextResponse, type NextRequest } from "next/server";
import { pool } from "@/lib/db";

/**
 * GET /api/propostas/catalogo
 * Lê da tabela catalogo_ennova (catálogo real com 8000+ artigos).
 * Devolve os campos no formato esperado pelo CatalogoLateralPanel / LinhasEditor.
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const q = searchParams.get("q")?.trim() ?? "";
  const rawLimit = searchParams.get("limit");
  const parsedLimit = rawLimit ? Number(rawLimit) : 50;
  const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(parsedLimit, 2000)) : 50;
  const capitulo = searchParams.get("capitulo");
  const tipo = searchParams.get("tipo");

  try {
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let pi = 1;

    if (q) {
      conditions.push(
        `(unaccent(lower(codigo)) LIKE $${pi} OR unaccent(lower(descricao)) LIKE $${pi + 1})`
      );
      const normalized = q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      params.push(`${normalized}%`, `%${normalized}%`);
      pi += 2;
    }

    if (capitulo) {
      conditions.push(`capitulo_num = $${pi++}`);
      params.push(parseInt(capitulo));
    }

    if (tipo) {
      conditions.push(`tipo_catalogo = $${pi++}`);
      params.push(tipo);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const orderBy = q
      ? `ORDER BY
          CASE
            WHEN unaccent(lower(codigo)) LIKE $${pi} THEN 0
            WHEN unaccent(lower(descricao)) LIKE $${pi} THEN 1
            ELSE 2
          END,
          capitulo_num, codigo`
      : `ORDER BY capitulo_num, codigo`;

    if (q) {
      const normalized = q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      params.push(`${normalized}%`);
      pi++;
    }

    params.push(limit);

    const result = await pool.query(
      `SELECT
         id,
         codigo,
         descricao,
         unidade,
         capitulo_nome   AS grande_capitulo,
         capitulo_nome   AS capitulo,
         preco_custo     AS pu_custo,
         ROUND((preco_custo * k_padrao)::numeric, 2) AS pu_venda,
         tipo_catalogo   AS origem
       FROM catalogo_ennova
       ${where}
       ${orderBy}
       LIMIT $${pi}`,
      params
    );

    const data = result.rows.map((row) => ({
      id:                   row.id,
      codigo:               row.codigo,
      descricao:            row.descricao,
      unidade:              row.unidade,
      grande_capitulo:      row.grande_capitulo,
      capitulo:             row.capitulo,
      preco_custo_unitario: row.pu_custo  == null ? null : Number(row.pu_custo),
      preco_venda_unitario: row.pu_venda  == null ? null : Number(row.pu_venda),
      origem:               row.origem,
    }));

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/propostas/catalogo] GET failed:", message);
    return NextResponse.json(
      { error: "Failed to load catalog" },
      { status: 500 }
    );
  }
}
