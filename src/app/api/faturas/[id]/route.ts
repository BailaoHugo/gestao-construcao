import { NextRequest, NextResponse } from 'next/server';
import { loadFaturaCompleta } from '@/faturas/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const fatura = await loadFaturaCompleta(id);
    if (!fatura) {
      return NextResponse.json({ error: 'Fatura não encontrada' }, { status: 404 });
    }
    return NextResponse.json(fatura);
  } catch (err) {
    console.error('GET /api/faturas/[id]', err);
    return NextResponse.json({ error: 'Erro ao carregar fatura' }, { status: 500 });
  }
}
