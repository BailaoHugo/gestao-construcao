import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; custoId: string }> },
) {
  const { id: contratoId, custoId } = await params;
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM contrato_custos WHERE id = $1 AND contrato_id = $2`,
      [custoId, contratoId],
    );
    if ((rowCount ?? 0) === 0) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
