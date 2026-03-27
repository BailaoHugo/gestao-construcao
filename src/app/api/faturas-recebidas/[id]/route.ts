import { NextResponse } from 'next/server';
import { loadFaturaRecebida, updateFaturaRecebida } from '@/controlo-obra/db';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await loadFaturaRecebida(id);
    if (!data) return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao carregar fatura' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await updateFaturaRecebida(id, body);
    if (!updated) return NextResponse.json({ error: 'Nao encontrado' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao atualizar fatura' }, { status: 500 });
  }
}
