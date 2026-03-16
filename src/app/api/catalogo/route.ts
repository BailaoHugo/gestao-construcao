import { NextResponse, type NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { toNumberOrNull } from "@/lib/number";

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
      pu_custo,
      pu_venda,
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
      pu_custo: toNumberOrNull(row.pu_custo),
      pu_venda: toNumberOrNull(row.pu_venda),
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
type CreateArtigoBody = {
  codigo?: string;
  descricao?: string;
  unidade?: string | null;
  grande_capitulo?: string | null;
  capitulo?: string | null;
  pu_custo?: number | string | null;
  pu_venda?: number | string | null;
  ativo?: boolean;
  origem?: string | null;
};

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeMoney(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/\s/g, "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CreateArtigoBody;

    const codigo = normalizeString(body.codigo);
    const descricao = normalizeString(body.descricao);
    const unidade = normalizeString(body.unidade);
    const grande_capitulo = normalizeString(body.grande_capitulo);
    const capitulo = normalizeString(body.capitulo);
    const pu_custo = normalizeMoney(body.pu_custo);
    const pu_venda = normalizeMoney(body.pu_venda);
    const ativo = body.ativo ?? true;
    const origem = normalizeString(body.origem) || "manual";

    if (!codigo) {
      return NextResponse.json(
        { error: "Campo 'codigo' é obrigatório" },
        { status: 400 },
      );
    }

    if (!descricao) {
      return NextResponse.json(
        { error: "Campo 'descricao' é obrigatório" },
        { status: 400 },
      );
    }

    if (!capitulo) {
      return NextResponse.json(
        { error: "Campo 'capitulo' é obrigatório" },
        { status: 400 },
      );
    }

    const existing = await pool.query<{ id: string }>(
      `select id from artigos where codigo = $1 limit 1`,
      [codigo],
    );

    if ((existing.rowCount ?? 0) > 0) {
      return NextResponse.json(
        { error: "Já existe um artigo com este código" },
        { status: 409 },
      );
    }

    const result = await pool.query(
      `
        insert into artigos (
          codigo,
          descricao,
          unidade,
          grande_capitulo,
          capitulo,
          pu_custo,
          pu_venda,
          ativo,
          origem
        )
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        returning
          id,
          codigo,
          descricao,
          unidade,
          grande_capitulo,
          capitulo,
          pu_custo,
          pu_venda,
          ativo,
          origem,
          created_at,
          updated_at
      `,
      [
        codigo,
        descricao,
        unidade || null,
        grande_capitulo || null,
        capitulo,
        pu_custo,
        pu_venda,
        ativo,
        origem,
      ],
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/catalogo] POST failed:", message);

    return NextResponse.json(
      { error: "Falha ao criar artigo" },
      { status: 500 },
    );
  }
}
