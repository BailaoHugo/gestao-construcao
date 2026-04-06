import { NextResponse, type NextRequest } from "next/server";
import { pool } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await pool.query("DELETE FROM despesas WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { data_despesa, descricao, tipo, valor, centro_custo_id, fornecedor, notas, documento_ref } = body;

  const { rows } = await pool.query(
    `UPDATE despesas SET
       data_despesa = $1, descricao = $2, tipo = $3, valor = $4,
       centro_custo_id = $5, fornecedor = $6, notas = $7, documento_ref = $8,
       updated_at = now()
     WHERE id = $9 RETURNING *`,
    [data_despesa, descricao, tipo, valor,
     centro_custo_id || null, fornecedor || null, notas || null, documento_ref || null, id]
  );
  return NextResponse.json({ row: rows[0] });
}
