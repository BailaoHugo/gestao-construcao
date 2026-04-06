import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await req.json();
  const name      = (body.name ?? body.nome ?? "").trim() || undefined;
  const descricao = body.descricao ?? null;
  const estado    = body.estado    ?? undefined;
  const clienteId = body.cliente_id !== undefined ? (body.cliente_id || null) : undefined;
  const dataIni   = body.data_inicio !== undefined ? (body.data_inicio || null) : undefined;
  const dataFim   = body.data_fim    !== undefined ? (body.data_fim    || null) : undefined;

  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  if (name      !== undefined) { sets.push(`name=$${i++}`);        vals.push(name); }
  if (descricao !== undefined) { sets.push(`descricao=$${i++}`);   vals.push(descricao); }
  if (estado    !== undefined) { sets.push(`estado=$${i++}`);      vals.push(estado); }
  if (clienteId !== undefined) { sets.push(`cliente_id=$${i++}`);  vals.push(clienteId); }
  if (dataIni   !== undefined) { sets.push(`data_inicio=$${i++}`); vals.push(dataIni); }
  if (dataFim   !== undefined) { sets.push(`data_fim=$${i++}`);    vals.push(dataFim); }

  if (sets.length === 0) return NextResponse.json({ error: "Nada a actualizar" }, { status: 400 });
  vals.push(id);
  const r = await pool.query(
    `UPDATE obras SET ${sets.join(', ')} WHERE id=$${i} RETURNING *`,
    vals
  );
  if (!r.rowCount) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json(r.rows[0]);
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  return PATCH(req, context);
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await pool.query("DELETE FROM obras WHERE id=$1", [id]);
  return NextResponse.json({ ok: true });
}
