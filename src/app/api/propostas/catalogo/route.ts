import { NextResponse, type NextRequest } from "next/server";
import { pool } from "@/lib/db";

type ArtigoRow = {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string | null;
  grande_capitulo: string | null;
  capitulo: string | null;
  pu_custo: string | number | null;
  pu_venda: string | number | null;
  origem: string;
};

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const q = searchParams.get("q")?.trim();

  let sql = `
    select
      id,
      codigo,
      descricao,
      unidade,
      grande_capitulo,
      capitulo,
      pu_custo,
      pu_venda,
      origem
    from artigos
    where ativo = true
  `;

  const params: any[] = [];

  if (q && q.length > 0) {
    sql += `
      and (
        codigo ilike $1
        or descricao ilike $1
      )
    `;
    params.push(`%${q}%`);
  }

  sql += `
    order by grande_capitulo, capitulo, codigo
  `;

  try {
    const result = await pool.query<ArtigoRow>(sql, params);

    const data = result.rows.map((row) => ({
      id: row.id,
      codigo: row.codigo,
      descricao: row.descricao,
      unidade: row.unidade,
      grande_capitulo: row.grande_capitulo,
      capitulo: row.capitulo,
      preco_custo_unitario:
        row.pu_custo === null || row.pu_custo === undefined
          ? null
          : Number(row.pu_custo),
      preco_venda_unitario:
        row.pu_venda === null || row.pu_venda === undefined
          ? null
          : Number(row.pu_venda),
      origem: row.origem,
    }));

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/propostas/catalogo] GET failed:", message);
    return NextResponse.json(
      { error: "Failed to load artigos catalog" },
      { status: 500 },
    );
  }
}

