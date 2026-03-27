import { NextResponse } from 'next/server';
import { loadCustosObra, createCustoObra } from '@/controlo-obra/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const contratoId = searchParams.get('contratoId');
    if (!contratoId) return NextResponse.json({ error: 'contratoId obrigatorio' }, { status: 400 });
    const data = await loadCustosObra(contratoId);
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao carregar custos' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.contratoId) return NextResponse.json({ error: 'contratoId obrigatorio' }, { status: 400 });
    if (!body.tipo) return NextResponse.json({ error: 'tipo obrigatorio' }, { status: 400 });
    if (body.valor === undefined) return NextResponse.json({ error: 'valor obrigatorio' }, { status: 400 });
    const custo = await createCustoObra(body);
    return NextResponse.json(custo, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao criar custo' }, { status: 500 });
  }
}
