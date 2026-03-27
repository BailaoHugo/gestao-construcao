import { NextRequest, NextResponse } from 'next/server';
import { loadTodasFaturas, createFatura } from '@/faturas/db';

export async function GET() {
  try {
    const faturas = await loadTodasFaturas();
    return NextResponse.json(faturas);
  } catch (err) {
    console.error('GET /api/faturas', err);
    return NextResponse.json({ error: 'Erro ao carregar faturas' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fatura = await createFatura(body);
    return NextResponse.json(fatura, { status: 201 });
  } catch (err) {
    console.error('POST /api/faturas', err);
    return NextResponse.json({ error: 'Erro ao criar fatura' }, { status: 500 });
  }
}
