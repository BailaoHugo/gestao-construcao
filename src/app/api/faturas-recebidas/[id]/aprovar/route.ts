import { NextResponse } from 'next/server';
import { loadFaturaRecebida, updateFaturaRecebida } from '@/controlo-obra/db';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const fatura = await loadFaturaRecebida(id);
  if (!fatura) {
    return NextResponse.json({ error: 'Fatura não encontrada' }, { status: 404 });
  }
  if (fatura.estado === 'aprovado') {
    return NextResponse.json(fatura);
  }
  if (!['revisto', 'pendente'].includes(fatura.estado)) {
    return NextResponse.json(
      { error: `Não é possível aprovar uma fatura com estado "${fatura.estado}"` },
      { status: 409 },
    );
  }

  // Allow optional body to update contratoId / fornecedorId / notas before approval
  let patch: { contratoId?: string; fornecedorId?: string; notas?: string } = {};
  try {
    const body = await req.json();
    if (body.contratoId) patch.contratoId = body.contratoId;
    if (body.fornecedorId) patch.fornecedorId = body.fornecedorId;
    if (body.notas) patch.notas = body.notas;
  } catch {
    // Body is optional — ignore parse errors
  }

  const updated = await updateFaturaRecebida(id, { ...patch, estado: 'aprovado' });
  return NextResponse.json(updated);
}
