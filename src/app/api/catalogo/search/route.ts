import { NextResponse, type NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { labelCapitulo } from "@/lib/catalogo/descricoesCapitulos";

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
  ativo: boolean;
};

// Normaliza texto para pesquisa sem acentos (apenas em memória / SQL, sem alterar schema).
function normalizeSearchText(input: string): string {
  const lower = input.toLowerCase();
  // Mapa mínimo para PT: vogais acentuadas e cedilha.
  return lower
    .replace(/[áàâãä]/g, "a")
    .replace(/[éèêë]/g, "e")
    .replace(/[íìîï]/g, "i")
    .replace(/[óòôõö]/g, "o")
    .replace(/[úùûü]/g, "u")
    .replace(/ç/g, "c");
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const q = normalizeSearchText(raw);

  if (!q) {
    return NextResponse.json([]);
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
      origem,
      ativo
    from artigos
    where ativo = true
      and (
        translate(lower(codigo), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')
          like $1
        or translate(lower(descricao), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')
          like $1
      )
    order by codigo asc
    limit 10
  `;

  const params = [`%${q}%`];

  try {
    const result = await pool.query<ArtigoRow>(sql, params);

    const data = result.rows.map((row) => ({
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
      preco_custo_unitario:
        row.pu_custo === null || row.pu_custo === undefined
          ? null
          : Number(row.pu_custo),
      preco_venda_unitario:
        row.pu_venda === null || row.pu_venda === undefined
          ? null
          : Number(row.pu_venda),
      origem: row.origem,
      ativo: row.ativo,
    }));

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/catalogo/search] GET failed:", message);
    return NextResponse.json(
      { error: "Falha ao pesquisar catálogo" },
      { status: 500 },
    );
  }
}
