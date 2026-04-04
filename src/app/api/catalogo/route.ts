import { NextResponse, type NextRequest } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search   = searchParams.get("search")?.trim() ?? "";
  const capitulo = searchParams.get("capitulo");
  const tipo     = searchParams.get("tipo");
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit    = Math.min(100, parseInt(searchParams.get("limit") ?? "50"));
  const offset   = (page - 1) * limit;

  const conditions: string[] = [];
  const params: (string | number)[] = [];
  let pi = 1;

  if (search) {
    conditions.push(`(descricao ILIKE $${pi} OR codigo ILIKE $${pi + 1})`);
    params.push(`%${search}%`, `%${search}%`);
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

  const [rows, count, chapters] = await Promise.all([
    pool.query(
      `SELECT id, capitulo_num, capitulo_nome, subcapitulo, codigo, descricao,
              unidade, preco_custo, k_padrao, tipo_catalogo,
              categoria_cype, subcategoria_cype, seccao_cype
       FROM catalogo_ennova ${where}
       ORDER BY capitulo_num, codigo
       LIMIT $${pi} OFFSET $${pi + 1}`,
      [...params, limit, offset]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total FROM catalogo_ennova ${where}`,
      params
    ),
    // Chapters list always unfiltered (just by tipo if set)
    pool.query(
      `SELECT DISTINCT capitulo_num, capitulo_nome
       FROM catalogo_ennova
       ${tipo ? `WHERE tipo_catalogo = $1` : ""}
       ORDER BY capitulo_num`,
      tipo ? [tipo] : []
    ),
  ]);

  return NextResponse.json({
    rows:     rows.rows,
    total:    count.rows[0].total,
    chapters: chapters.rows,
    page,
    limit,
  });
}
