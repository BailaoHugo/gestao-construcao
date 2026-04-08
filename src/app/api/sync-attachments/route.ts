import { NextResponse, type NextRequest } from 'next/server';
import { pool } from '@/lib/db';

// POST /api/sync-attachments
// Body: { items: { toconline_id: string; file_hash: string; file_name: string; file_type: string }[] }
export async function POST(req: NextRequest) {
  try {
    const { items } = await req.json() as {
      items: { toconline_id: string; file_hash: string; file_name: string; file_type: string }[];
    };

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items vazio' }, { status: 400 });
    }

    let updated = 0;
    for (const item of items) {
      const fileUrl = `https://app17.toconline.pt/file/${item.file_hash}`;
      const result = await pool.query(
        `UPDATE despesas
         SET documento_ref = $1, updated_at = now()
         WHERE toconline_id = $2
           AND (documento_ref IS NULL OR documento_ref = '')
         RETURNING id`,
        [fileUrl, item.toconline_id]
      );
      updated += result.rowCount ?? 0;
    }

    return NextResponse.json({ ok: true, updated, total: items.length });
  } catch (e) {
    console.error('[sync-attachments]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
