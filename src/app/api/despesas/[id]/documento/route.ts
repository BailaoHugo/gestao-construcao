import { head } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { rows } = await pool.query(
    'SELECT documento_ref FROM despesas WHERE id = $1',
    [id]
  );

  if (!rows[0]?.documento_ref) {
    return NextResponse.json({ error: 'Sem documento' }, { status: 404 });
  }

  try {
    const blob = await head(rows[0].documento_ref);
    return NextResponse.redirect(blob.downloadUrl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[documento]', msg);
    return NextResponse.json({ error: 'Erro ao aceder ao documento' }, { status: 500 });
  }
}
