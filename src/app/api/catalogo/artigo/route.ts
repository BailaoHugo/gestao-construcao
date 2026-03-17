import { NextResponse, type NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { toNumberOrNull } from "@/lib/number";
import { labelCapitulo } from "@/lib/catalogo/descricoesCapitulos";

type ArtigoRow = {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string | null;
  grande_capitulo: string | null;
  capitulo: string | null;
  pu_custo: unknown;
  pu_venda: unknown;
  ativo: boolean;
  origem: string;
};

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const codigoParam = searchParams.get("codigo")?.trim();

    if (!codigoParam) {
      return NextResponse.json(
        { error: "Parâmetro 'codigo' é obrigatório" },
        { status: 400 },
      );
    }

    const sql = `
      select
        id,
        codigo,
        descricao,
        unidade,
        grande_capitulo,
        capitulo,
        pu_custo,
        pu_venda,
        ativo,
        origem
      from artigos
      where codigo = $1
      limit 1
    `;

    const result = await pool.query<ArtigoRow>(sql, [codigoParam]);

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Artigo não encontrado" },
        { status: 404 },
      );
    }

    const row = result.rows[0];

    const payload = {
      id: row.id,
      codigo: row.codigo,
      descricao: row.descricao,
      unidade: row.unidade,
      grande_capitulo: row.grande_capitulo,
      capitulo: row.capitulo,
      capitulo_descricao:
        row.capitulo && row.capitulo.trim() !== ""
          ? labelCapitulo(row.capitulo)
          : null,
      pu_custo: toNumberOrNull(row.pu_custo),
      pu_venda: toNumberOrNull(row.pu_venda),
      capitulo_formatado:
        row.capitulo && row.capitulo.trim() !== ""
          ? labelCapitulo(row.capitulo)
          : null,
      preco_custo_unitario: toNumberOrNull(row.pu_custo),
      preco_venda_unitario: toNumberOrNull(row.pu_venda),
      ativo: row.ativo,
      origem: row.origem,
    };

    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/catalogo/artigo] GET failed:", message);
    return NextResponse.json(
      { error: "Falha ao obter artigo" },
      { status: 500 },
    );
  }
}

