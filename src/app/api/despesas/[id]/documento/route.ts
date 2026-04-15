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
        const blobUrl = rows[0].documento_ref as string;
        const token = process.env.BLOB_READ_WRITE_TOKEN!;

      // Fetch the private blob server-side using the auth token
      const upstream = await fetch(blobUrl, {
              headers: { Authorization: `Bearer ${token}` },
      });

      if (!upstream.ok) {
              return NextResponse.json({ error: 'Documento nao encontrado' }, { status: 404 });
      }

      const contentType = upstream.headers.get('Content-Type') ?? 'application/octet-stream';
        const filename = blobUrl.split('/').pop()?.split('?')[0] ?? 'documento';

      return new Response(upstream.body, {
              headers: {
                        'Content-Type': contentType,
                        'Content-Disposition': `inline; filename="${filename}"`,
                        'Cache-Control': 'private, max-age=3600',
              },
      });
  } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('[documento]', msg);
        return NextResponse.json({ error: 'Erro ao aceder ao documento' }, { status: 500 });
  }
}
