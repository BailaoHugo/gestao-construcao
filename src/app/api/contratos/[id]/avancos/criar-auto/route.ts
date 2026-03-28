import { NextResponse, type NextRequest } from 'next/server';
import { pool } from '@/lib/db';
import { createFatura } from '@/faturas/db';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id: contratoId } = await params;
  try {
    const body = await req.json() as {
      taxaIva?: number;
      notas?: string;
      percentagens: Array<{ id: string; percentagemAtual: number }>;
    };
    if (!Array.isArray(body.percentagens) || body.percentagens.length === 0) {
      return NextResponse.json({ error: 'percentagens obrigatório' }, { status: 400 });
    }

    // Load current avanços
    const avancos = await pool.query(
      'SELECT * FROM contrato_avancos WHERE contrato_id = $1 ORDER BY ordem',
      [contratoId]
    );
    if (avancos.rows.length === 0) {
      return NextResponse.json({ error: 'Sem artigos de avanço para este contrato' }, { status: 400 });
    }

    // Build map from id -> percentagemAtual
    const pctMap = new Map(body.percentagens.map(p => [p.id, p.percentagemAtual]));

    // Get adjudicação percentage
    const adjRes = await pool.query(
      `SELECT COALESCE(percentagem_adjudicacao, 0) AS pct
       FROM faturas WHERE contrato_id = $1 AND tipo = 'adjudicacao' LIMIT 1`,
      [contratoId]
    );
    const pctAdj = adjRes.rows[0] ? parseFloat(adjRes.rows[0].pct) : 0;

    // Build capitulos - only items with forward progress
    const toUpdate: Array<{ id: string; pctAtual: number }> = [];
    const capitulos = [];
    for (const r of avancos.rows) {
      const pctAtual = pctMap.get(r.id) ?? parseFloat(r.percentagem_faturada);
      const pctAnterior = parseFloat(r.percentagem_faturada);
      if (pctAtual > pctAnterior) {
        capitulos.push({
          capitulo: r.capitulo || String(r.ordem),
          descricao: r.descricao,
          valorContrato: parseFloat(r.valor_contrato),
          percentagemAnterior: pctAnterior,
          percentagemAtual: pctAtual,
        });
        toUpdate.push({ id: r.id, pctAtual });
      }
    }

    if (capitulos.length === 0) {
      return NextResponse.json({ error: 'Nenhum artigo com avanço para faturar' }, { status: 400 });
    }

    // Create fatura auto
    const fatura = await createFatura({
      contratoId,
      tipo: 'auto',
      percentagemAdjudicacao: pctAdj,
      taxaIva: body.taxaIva ?? 0,
      notas: body.notas ?? 'IVA – autoliquidação – Artigo 2.º n.º 1 alínea j) do CIVA',
      capitulos,
    });

    // Update percentagem_faturada
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      for (const u of toUpdate) {
        await c.query(
          'UPDATE contrato_avancos SET percentagem_faturada=$1, updated_at=now() WHERE id=$2',
          [u.pctAtual, u.id]
        );
      }
      await c.query('COMMIT');
    } catch (e) {
      await c.query('ROLLBACK');
      console.error('[criar-auto] Failed to update avancos after fatura creation:', e);
    } finally { c.release(); }

    return NextResponse.json(fatura);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/contratos/avancos/criar-auto]:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
