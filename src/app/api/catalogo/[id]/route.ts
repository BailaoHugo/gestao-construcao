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
  ativo: boolean;
  updated_at: string;
};

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

  const ativo = (body as { ativo?: unknown })?.ativo;

  if (typeof ativo !== "boolean") {
    return NextResponse.json(
      { error: "Campo 'ativo' deve ser boolean" },
      { status: 400 },
    );
  }

  try {
    const result = await pool.query<ArtigoRow>(
      `
        update artigos
        set ativo = $1,
            updated_at = now()
        where id = $2
        returning id, codigo, descricao, ativo, updated_at
      `,
      [ativo, id],
    );

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

