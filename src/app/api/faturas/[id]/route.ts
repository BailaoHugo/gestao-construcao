import { NextRequest, NextResponse } from 'next/server';
import { loadFaturaCompleta } from '@/faturas/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const fatura = await loadFaturaCompleta(params.id);
    if (!fatura) {
      return NextResponse.json({ error: 'Fatura não encontrada' }, { status: 404 });
    }
    return NextResponse.json(fatura);
  } catch (err) {
    console.error('GET /api/faturas/[id]', err);
    return NextResponse.json({ error: 'Erro ao carregar fatura' }, { status: 500 });
  }
}
