import { NextRequest, NextResponse } from 'next/server';
import { loadFaturaCompleta } from '@/faturas/db';
import { renderFaturaPdf } from '@/lib/faturas/pdf';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const fatura = await loadFaturaCompleta(params.id);
    if (!fatura) {
      return NextResponse.json({ error: 'Fatura não encontrada' }, { status: 404 });
    }

    const buffer = await renderFaturaPdf(fatura);
    const filename = `${fatura.numero}.pdf`;

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('GET /api/faturas/[id]/pdf', err);
    return NextResponse.json({ error: 'Erro ao gerar PDF' }, { status: 500 });
  }
}
