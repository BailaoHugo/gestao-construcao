import { NextResponse, type NextRequest } from 'next/server';
import { pool } from '@/lib/db';

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS contrato_avancos (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      contrato_id uuid NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
      ordem integer NOT NULL DEFAULT 0,
      capitulo text NOT NULL DEFAULT '',
      descricao text NOT NULL,
      valor_contrato numeric(12,2) NOT NULL DEFAULT 0,
      percentagem_faturada numeric(5,2) NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_contrato_avancos_contrato_id ON contrato_avancos(contrato_id)`);
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: contratoId } = await params;
  try {
    await ensureTable();
    const existing = await pool.query(
      'SELECT * FROM contrato_avancos WHERE contrato_id = $1 ORDER BY ordem',
      [contratoId]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json(existing.rows.map(r => ({
        id: r.id, contratoId: r.contrato_id, ordem: r.ordem,
        capitulo: r.capitulo, descricao: r.descricao,
        valorContrato: parseFloat(r.valor_contrato),
        percentagemFaturada: parseFloat(r.percentagem_faturada),
      })));
    }
    // Auto-populate from proposta_linhas
    const cRes = await pool.query(
      `SELECT c.revisao_id FROM contratos c WHERE c.id = $1`,
      [contratoId]
    );
    if (!cRes.rows[0]) return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 });
    const { revisao_id } = cRes.rows[0];
    const linhasRes = await pool.query(
      `SELECT ordem, COALESCE(capitulo, '') AS capitulo, descricao, total_linha
       FROM proposta_linhas WHERE revisao_id = $1 ORDER BY ordem`,
      [revisao_id]
    );
    if (linhasRes.rows.length === 0) return NextResponse.json([]);
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      const result = [];
      for (const linha of linhasRes.rows) {
        const ins = await c.query(
          `INSERT INTO contrato_avancos(contrato_id, ordem, capitulo, descricao, valor_contrato, percentagem_faturada)
           VALUES($1,$2,$3,$4,$5,0) RETURNING *`,
          [contratoId, linha.ordem, linha.capitulo || '', linha.descricao, parseFloat(linha.total_linha) || 0]
        );
        result.push(ins.rows[0]);
      }
      await c.query('COMMIT');
      return NextResponse.json(result.map(r => ({
        id: r.id, contratoId: r.contrato_id, ordem: r.ordem,
        capitulo: r.capitulo, descricao: r.descricao,
        valorContrato: parseFloat(r.valor_contrato),
        percentagemFaturada: parseFloat(r.percentagem_faturada),
      })));
    } catch (e) { await c.query('ROLLBACK'); throw e; }
    finally { c.release(); }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/contratos/avancos] GET:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id: contratoId } = await params;
  try {
    await ensureTable();
    const body = await req.json() as { items: Array<{ id: string; percentagemFaturada: number }> };
    if (!Array.isArray(body.items)) return NextResponse.json({ error: 'items obrigatório' }, { status: 400 });
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      for (const item of body.items) {
        await c.query(
          `UPDATE contrato_avancos SET percentagem_faturada=$1, updated_at=now() WHERE id=$2 AND contrato_id=$3`,
          [item.percentagemFaturada, item.id, contratoId]
        );
      }
      await c.query('COMMIT');
    } catch (e) { await c.query('ROLLBACK'); throw e; }
    finally { c.release(); }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
