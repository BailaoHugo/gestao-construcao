import { NextRequest, NextResponse } from 'next/server';
import { emitirFatura } from '@/faturas/db';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const fatura = await emitirFatura(params.id);
    return NextResponse.json(fatura);
  } catch (err) {
    console.error('POST /api/faturas/[id]/emitir', err);
    return NextResponse.json({ error: 'Erro ao emitir fatura' }, { status: 500 });
  }
}
