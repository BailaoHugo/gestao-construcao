import { NextResponse } from 'next/server';
import { loadTrabalhadores, createTrabalhador } from '@/controlo-obra/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ativoParam = searchParams.get('ativo');
    const ativo = ativoParam !== null ? ativoParam === 'true' : undefined;
    const data = await loadTrabalhadores(ativo);
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao carregar trabalhadores' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.nome) return NextResponse.json({ error: 'Nome obrigatorio' }, { status: 400 });
    const trabalhador = await createTrabalhador(body);
    return NextResponse.json(trabalhador, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao criar trabalhador' }, { status: 500 });
  }
}
