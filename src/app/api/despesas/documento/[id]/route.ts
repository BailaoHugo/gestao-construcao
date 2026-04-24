import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { rows } = await pool.query(
    'SELECT documento_ref, nome_ficheiro FROM despesas WHERE id = $1',
    [params.id]
  );
  if (!rows[0]?.documento_ref) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
  const { documento_ref, nome_ficheiro } = rows[0];
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  // Para blobs privados, fazer proxy do conteúdo
  const resp = await fetch(documento_ref, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!resp.ok) {
    return NextResponse.json({ error: 'blob not found' }, { status: 404 });
  }
  const buf = await resp.arrayBuffer();
  const ct = resp.headers.get('content-type') || 'application/octet-stream';
  const filename = nome_ficheiro || documento_ref.split('/').pop()?.split('?')[0] || 'documento';
  return new NextResponse(buf, {
    headers: {
      'Content-Type': ct,
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'private, max-age=3600',
    },
  });
}
