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
  const raw = searchParams.get("q")?.trim() ?? "";
  const q = raw;

  const rawLimit = searchParams.get("limit");
  const parsedLimit = rawLimit ? Number(rawLimit) : 20;
  const limit = Number.isFinite(parsedLimit)
    ? Math.max(1, Math.min(parsedLimit, 2000))
    : 20;

  try {
    // Se não houver termo de pesquisa, devolver rápido a lista base ordenada por capítulo/código.
    if (!q) {
      const result = await pool.query<ArtigoRow>(
        `
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
        order by grande_capitulo, capitulo, codigo
        limit ${limit}
        `,
      );

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
    }

    const result = await pool.query<ArtigoRow>(
      `
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
        and (
          unaccent(lower(codigo)) like $1
          or unaccent(lower(descricao)) like $2
          or unaccent(lower(grande_capitulo)) like $2
          or unaccent(lower(capitulo)) like $2
        )
      order by
        case
          when unaccent(lower(codigo)) like $1 then 0
          when unaccent(lower(descricao)) like $1 then 1
          when unaccent(lower(descricao)) like $2 then 2
          else 3
        end,
        grande_capitulo,
        capitulo,
        codigo
      limit ${limit}
      `,
      [
        `${q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}%`,
        `%${q
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")}%`,
      ],
    );

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

