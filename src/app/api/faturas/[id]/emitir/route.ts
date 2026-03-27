import { NextRequest, NextResponse } from 'next/server';
import { emitirFatura } from '@/faturas/db';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const fatura = await emitirFatura(id);
    return NextResponse.json(fatura);
  } catch (err) {
    console.error('POST /api/faturas/[id]/emitir', err);
    return NextResponse.json({ error: 'Erro ao emitir fatura' }, { status: 500 });
  }
}
