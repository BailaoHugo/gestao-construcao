import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// PUT /api/clientes/[id]
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await req.json();
  const { nome, email, telefone, nif, morada, notas } = body;

  if (!nome?.trim()) {
    return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  }

  const { rows } = await pool.query(
    `UPDATE clientes
     SET nome=$1, email=$2, telefone=$3, nif=$4, morada=$5, notas=$6
     WHERE id=$7 RETURNING *`,
    [nome.trim(), email ?? null, telefone ?? null, nif ?? null, morada ?? null, notas ?? null, id]
  );

  if (!rows.length) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json(rows[0]);
}

// DELETE /api/clientes/[id]
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await pool.query("DELETE FROM clientes WHERE id=$1", [params.id]);
  return NextResponse.json({ ok: true });
}
