import { NextResponse } from 'next/server';
import { loadFaturasRecebidas } from '@/controlo-obra/db';
import type { FaturaRecebidaEstado } from '@/controlo-obra/domain';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const estado = searchParams.get('estado') as FaturaRecebidaEstado | null;
    const data = await loadFaturasRecebidas(estado ?? undefined);
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao carregar faturas' }, { status: 500 });
  }
}
