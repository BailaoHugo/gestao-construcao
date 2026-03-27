import { NextResponse } from 'next/server';
import { loadResumoControloObra } from '@/controlo-obra/db';

export async function GET(_: Request, { params }: { params: Promise<{ contratoId: string }> }) {
  try {
    const { contratoId } = await params;
    const resumo = await loadResumoControloObra(contratoId);
    return NextResponse.json(resumo);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao carregar resumo' }, { status: 500 });
  }
}
