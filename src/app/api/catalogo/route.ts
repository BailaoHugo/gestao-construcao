import { NextResponse, type NextRequest } from "next/server";
import { pool } from "@/lib/db";

type ArtigoRow = {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string | null;
  grande_capitulo: string | null;
  capitulo: string | null;
  ativo: boolean;
};

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const q = searchParams.get("q")?.trim();
  const grandeCapitulo = searchParams.get("grandeCapitulo")?.trim() || null;
  const capitulo = searchParams.get("capitulo")?.trim() || null;
  const ativoParam = searchParams.get("ativo"); // "true" | "false" | null (todos)

  let sql = `
    select
      id,
      codigo,
      descricao,
      unidade,
      grande_capitulo,
      capitulo,
      ativo
    from artigos
    where 1=1
  `;
  const params: unknown[] = [];
  let paramIndex = 1;

  if (q && q.length > 0) {
    sql += ` and (codigo ilike $${paramIndex} or descricao ilike $${paramIndex})`;
    params.push(`%${q}%`);
    paramIndex++;
  }
  if (grandeCapitulo) {
    sql += ` and grande_capitulo = $${paramIndex}`;
    params.push(grandeCapitulo);
    paramIndex++;
  }
  if (capitulo) {
    sql += ` and capitulo = $${paramIndex}`;
    params.push(capitulo);
    paramIndex++;
  }
  if (ativoParam === "true") {
    sql += ` and ativo = true`;
  } else if (ativoParam === "false") {
    sql += ` and ativo = false`;
  }

  sql += ` order by grande_capitulo nulls last, capitulo nulls last, codigo`;

  try {
    const [artigosResult, grandeResult, capituloResult] = await Promise.all([
      pool.query<ArtigoRow>(sql, params),
      pool.query<{ grande_capitulo: string | null }>(
        `select distinct grande_capitulo from artigos where grande_capitulo is not null and grande_capitulo <> '' order by grande_capitulo`,
        [],
      ),
      pool.query<{ capitulo: string | null }>(
        `select distinct capitulo from artigos where capitulo is not null and capitulo <> '' order by capitulo`,
        [],
      ),
    ]);

    const artigos = artigosResult.rows.map((row) => ({
      id: row.id,
      codigo: row.codigo,
      descricao: row.descricao,
      unidade: row.unidade,
      grande_capitulo: row.grande_capitulo,
      capitulo: row.capitulo,
      ativo: row.ativo,
    }));

    const grandeCapitulos = grandeResult.rows
      .map((r) => r.grande_capitulo)
      .filter((v): v is string => v != null && v !== "");
    const capitulos = capituloResult.rows
      .map((r) => r.capitulo)
      .filter((v): v is string => v != null && v !== "");

    return NextResponse.json({
      artigos,
      opcoes: { grandeCapitulos, capitulos },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/catalogo] GET failed:", message);
    return NextResponse.json(
      { error: "Falha ao carregar catálogo" },
      { status: 500 },
    );
  }
}
