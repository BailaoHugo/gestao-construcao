import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Campo file em falta' }, { status: 400 });
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'Ficheiro demasiado grande (max 20MB)' }, { status: 413 });
    }

    const ext = file.name.split('.').pop() ?? 'jpg';
    const filename = `despesas/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const blob = await put(filename, file, {
      access: 'public',
      contentType: file.type || 'application/octet-stream',
    });

    return NextResponse.json({ url: blob.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/upload]', msg);
    return NextResponse.json({ error: 'Erro ao fazer upload' }, { status: 500 });
  }
}
