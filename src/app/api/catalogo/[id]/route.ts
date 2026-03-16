import { NextResponse, type NextRequest } from "next/server";
import { pool } from "@/lib/db";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

type ArtigoRow = {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string | null;
  grande_capitulo: string | null;
  capitulo: string | null;
  pu_custo: number | null;
  pu_venda: number | null;
  ativo: boolean;
  updated_at: string;
};

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeMoneyNullable(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/\s/g, "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: "Parâmetro 'id' é obrigatório" },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Payload inválido" },
      { status: 400 },
    );
  }

  const payload = body as {
    ativo?: unknown;
    descricao?: unknown;
    unidade?: unknown;
    grande_capitulo?: unknown;
    capitulo?: unknown;
    pu_custo?: unknown;
    pu_venda?: unknown;
  };

  const updates: string[] = [];
  const paramsValues: unknown[] = [];
  let idx = 1;

  if ("ativo" in payload) {
    if (typeof payload.ativo !== "boolean") {
      return NextResponse.json(
        { error: "Campo 'ativo' deve ser boolean" },
        { status: 400 },
      );
    }
    updates.push(`ativo = $${idx}`);
    paramsValues.push(payload.ativo);
    idx += 1;
  }

  if ("descricao" in payload) {
    const descricao = normalizeString(payload.descricao);
    if (!descricao) {
      return NextResponse.json(
        { error: "Campo 'descricao' não pode ser vazio" },
        { status: 400 },
      );
    }
    updates.push(`descricao = $${idx}`);
    paramsValues.push(descricao);
    idx += 1;
  }

  if ("unidade" in payload) {
    const unidade = normalizeString(payload.unidade);
    updates.push(`unidade = $${idx}`);
    paramsValues.push(unidade || null);
    idx += 1;
  }

  if ("grande_capitulo" in payload) {
    const grandeCapitulo = normalizeString(payload.grande_capitulo);
    updates.push(`grande_capitulo = $${idx}`);
    paramsValues.push(grandeCapitulo || null);
    idx += 1;
  }

  if ("capitulo" in payload) {
    const capitulo = normalizeString(payload.capitulo);
    if (!capitulo) {
      return NextResponse.json(
        { error: "Campo 'capitulo' não pode ser vazio" },
        { status: 400 },
      );
    }
    updates.push(`capitulo = $${idx}`);
    paramsValues.push(capitulo);
    idx += 1;
  }

  if ("pu_custo" in payload) {
    const puCusto = normalizeMoneyNullable(payload.pu_custo);
    updates.push(`pu_custo = $${idx}`);
    paramsValues.push(puCusto);
    idx += 1;
  }

  if ("pu_venda" in payload) {
    const puVenda = normalizeMoneyNullable(payload.pu_venda);
    updates.push(`pu_venda = $${idx}`);
    paramsValues.push(puVenda);
    idx += 1;
  }

  if (updates.length === 0) {
    return NextResponse.json(
      { error: "Nenhum campo válido para atualizar" },
      { status: 400 },
    );
  }

  try {
    const sql = `
      update artigos
      set ${updates.join(", ")},
          updated_at = now()
      where id = $${idx}
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
        updated_at
    `;

    const result = await pool.query<ArtigoRow>(sql, [...paramsValues, id]);

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Artigo não encontrado" },
        { status: 404 },
      );
    }

    const row = result.rows[0];

    return NextResponse.json(row);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error("[api/catalogo/[id]] PATCH failed:", message);
    return NextResponse.json(
      { error: "Falha ao atualizar estado do artigo" },
      { status: 500 },
    );
  }
}

