import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const { rows } = await pool.query(
    `SELECT o.*, c.nome AS cliente_nome
     FROM obras o
     LEFT JOIN clientes c ON c.id = o.cliente_id
     WHERE o.id = $1`,
    [id]
  );
  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await req.json();

  const name      = body.name      !== undefined ? (body.name ?? body.nome ?? "").trim() || undefined : undefined;
  const descricao = body.descricao !== undefined ? (body.descricao ?? null)  : undefined;
  const estado    = body.estado    !== undefined ?  body.estado              : undefined;
  const clienteId = body.cliente_id !== undefined ? (body.cliente_id || null) : undefined;
  const dataIni   = body.data_inicio !== undefined ? (body.data_inicio || null) : undefined;
  const dataFim   = body.data_fim    !== undefined ? (body.data_fim    || null) : undefined;
  const morada    = body.morada    !== undefined ? (body.morada    ?? null) : undefined;
  const nipc      = body.nipc      !== undefined ? (body.nipc      ?? null) : undefined;

  const sets: string[] = [];
  const vals: unknown[] = [];
  let i = 1;

  if (name      !== undefined) { sets.push(`name=$${i++}`);       vals.push(name); }
  if (descricao !== undefined) { sets.push(`descricao=$${i++}`);  vals.push(descricao); }
  if (estado    !== undefined) { sets.push(`estado=$${i++}`);     vals.push(estado); }
  if (clienteId !== undefined) { sets.push(`cliente_id=$${i++}`); vals.push(clienteId); }
  if (dataIni   !== undefined) { sets.push(`data_inicio=$${i++}`); vals.push(dataIni); }
  if (dataFim   !== undefined) { sets.push(`data_fim=$${i++}`);   vals.push(dataFim); }
  if (morada    !== undefined) { sets.push(`morada=$${i++}`);     vals.push(morada); }
  if (nipc      !== undefined) { sets.push(`nipc=$${i++}`);       vals.push(nipc); }

  if (sets.length === 0) return NextResponse.json({ error: "Nada a actualizar" }, { status: 400 });

  vals.push(id);
  const r = await pool.query(
    `UPDATE obras SET ${sets.join(', ')}, updated_at=now() WHERE id=$${i} RETURNING *`,
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
