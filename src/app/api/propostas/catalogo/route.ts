import { NextResponse, type NextRequest } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const tipo         = sp.get("tipo")?.trim() ?? "";
  const chaptersOnly = sp.get("chaptersOnly") === "1";
  const capituloNum  = sp.get("capitulo_num");
  const q            = sp.get("q")?.trim() ?? "";
  const rawLimit     = sp.get("limit");
  const limit        = Math.max(1, Math.min(Number(rawLimit) || 200, 2000));

  const tipoCondition = tipo ? `AND tipo_catalogo = $1` : "";
  const tipoParam     = tipo ? [tipo] : [];

  try {
    // Modo 1: lista de capítulos + tipos disponíveis
    if (chaptersOnly) {
      const [chapRes, tiposRes] = await Promise.all([
        pool.query(
          `SELECT capitulo_num, capitulo_nome, COUNT(*)::int AS total
           FROM catalogo_ennova
           WHERE 1=1 ${tipoCondition}
           GROUP BY capitulo_num, capitulo_nome
           ORDER BY capitulo_num`,
          tipoParam
        ),
        // Só na chamada sem tipo é que devolvemos os tipos disponíveis
        tipo ? null : pool.query(
          `SELECT DISTINCT tipo_catalogo, COUNT(*)::int AS total
           FROM catalogo_ennova
           WHERE tipo_catalogo IS NOT NULL AND tipo_catalogo != ''
           GROUP BY tipo_catalogo
           ORDER BY tipo_catalogo`
        ),
      ]);
      return NextResponse.json({
        chapters:        chapRes.rows,
        tiposDisponiveis: tiposRes ? tiposRes.rows : undefined,
      });
    }

    // Modo 2: artigos de um capítulo específico
    if (capituloNum) {
      const pi = tipo ? 2 : 1;
      const res = await pool.query(
        `SELECT id, codigo, descricao, unidade,
                capitulo_nome AS grande_capitulo,
                capitulo_nome AS capitulo,
                preco_custo   AS pu_custo,
                ROUND((preco_custo * k_padrao)::numeric, 2) AS pu_venda,
                tipo_catalogo AS origem
         FROM catalogo_ennova
         WHERE capitulo_num = $${pi} ${tipoCondition}
         ORDER BY codigo`,
        tipo ? [tipo, parseInt(capituloNum)] : [parseInt(capituloNum)]
      );
      return NextResponse.json(res.rows.map(mapRow));
    }

    // Modo 3: pesquisa
    if (q) {
      const norm = q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const pi   = tipo ? 3 : 1;
      const res = await pool.query(
        `SELECT id, codigo, descricao, unidade,
                capitulo_nome AS grande_capitulo,
                capitulo_nome AS capitulo,
                preco_custo   AS pu_custo,
                ROUND((preco_custo * k_padrao)::numeric, 2) AS pu_venda,
                tipo_catalogo AS origem
         FROM catalogo_ennova
         WHERE (
           unaccent(lower(codigo))       LIKE $${pi}
           OR unaccent(lower(descricao)) LIKE $${pi + 1}
         ) ${tipoCondition}
         ORDER BY
           CASE WHEN unaccent(lower(codigo)) LIKE $${pi} THEN 0 ELSE 1 END,
           capitulo_num, codigo
         LIMIT $${pi + 2}`,
        tipo
          ? [tipo, `${norm}%`, `%${norm}%`, limit]
          : [`${norm}%`, `%${norm}%`, limit]
      );
      return NextResponse.json(res.rows.map(mapRow));
    }

    // Fallback: capítulos sem filtro
    const res = await pool.query(
      `SELECT capitulo_num, capitulo_nome, COUNT(*)::int AS total
       FROM catalogo_ennova
       WHERE 1=1 ${tipoCondition}
       GROUP BY capitulo_num, capitulo_nome
       ORDER BY capitulo_num`,
      tipoParam
    );
    return NextResponse.json({ chapters: res.rows });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[api/propostas/catalogo]", msg);
    return NextResponse.json({ error: "Failed to load catalog" }, { status: 500 });
  }
}

function mapRow(row: Record<string, unknown>) {
  return {
    id:                   row.id,
    codigo:               row.codigo,
    descricao:            row.descricao,
    unidade:              row.unidade,
    grande_capitulo:      row.grande_capitulo,
    capitulo:             row.capitulo,
    preco_custo_unitario: row.pu_custo  != null ? Number(row.pu_custo)  : null,
    preco_venda_unitario: row.pu_venda  != null ? Number(row.pu_venda)  : null,
    origem:               row.origem,
  };
}
