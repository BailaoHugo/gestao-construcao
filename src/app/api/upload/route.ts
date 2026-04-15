import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Campo file em falta' }, { status: 400, headers: CORS });
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'Ficheiro demasiado grande (max 20MB)' }, { status: 413, headers: CORS });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._\-]/g, '_');
    const filename = `despesas/${safeName}`;

    const blob = await put(filename, file, {
      access: 'public',
      contentType: file.type || 'application/octet-stream',
      addRandomSuffix: false,
    });

    return NextResponse.json({ url: blob.url }, { headers: CORS });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/upload]', msg);
    return NextResponse.json({ error: 'Erro ao fazer upload' }, { status: 500, headers: CORS });
  }
}
