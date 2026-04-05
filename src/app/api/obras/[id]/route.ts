import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { nome, descricao, estado, cliente_id, data_inicio, data_fim } = await req.json();
  const r = await pool.query(
    `UPDATE obras SET nome=$1, descricao=$2, estado=$3, cliente_id=$4, data_inicio=$5, data_fim=$6
     WHERE id=$7 RETURNING *`,
    [nome, descricao ?? null, estado ?? "em_curso", cliente_id || null, data_inicio || null, data_fim || null, id]
  );
  if (!r.rowCount) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json(r.rows[0]);
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await pool.query("DELETE FROM obras WHERE id=$1", [id]);
  return NextResponse.json({ ok: true });
}
