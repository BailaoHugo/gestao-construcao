import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const obraId = searchParams.get('obra_id');
  const from = searchParams.get('from') || '2026-01-01';
  const to = searchParams.get('to') || new Date().toISOString().slice(0, 10);

  if (!obraId) return NextResponse.json({ error: 'obra_id required' }, { status: 400 });

  const [despRows, pontoRows] = await Promise.all([
    pool.query(`
      SELECT id, data_despesa, fornecedor, numero_fatura,
        COALESCE(valor_sem_iva, 0)::float   AS valor_sem_iva,
        COALESCE(valor_total_civa, 0)::float AS valor_total_civa,
        tipo, nome_ficheiro, documento_ref
      FROM despesas
      WHERE centro_custo_id = $1 AND data_despesa BETWEEN $2 AND $3
      ORDER BY data_despesa DESC
    `, [obraId, from, to]),
    pool.query(`
      SELECT
        t.nome AS trabalhador,
        COUNT(rp.id)::int AS dias,
        COALESCE(SUM(rp.horas), 0)::float AS total_horas,
        COALESCE(SUM(rp.custo), 0)::float AS total_custo
      FROM registos_ponto rp
      JOIN trabalhadores t ON t.id = rp.trabalhador_id
      WHERE rp.obra_id = $1 AND rp.data BETWEEN $2 AND $3 AND rp.tipo != 'falta'
      GROUP BY t.nome
      ORDER BY total_custo DESC
    `, [obraId, from, to]),
  ]);

  // Agrupar fornecedores por nome normalizado
  const normalize = (s: string | null) =>
    (s || '').toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

  const fornMap: Record<string, { fornecedor: string; fornecedor_key: string; total_sem_iva: number; num_faturas: number; tipo: string }> = {};
  for (const d of despRows.rows) {
    const key = normalize(d.fornecedor);
    if (!fornMap[key]) {
      fornMap[key] = { fornecedor: d.fornecedor || '(sem nome)', fornecedor_key: key, total_sem_iva: 0, num_faturas: 0, tipo: d.tipo };
    }
    fornMap[key].total_sem_iva += d.valor_sem_iva || 0;
    fornMap[key].num_faturas += 1;
  }
  const fornecedores = Object.values(fornMap).sort((a, b) => b.total_sem_iva - a.total_sem_iva);

  return NextResponse.json({
    fornecedores,
    despesas: despRows.rows,
    ponto: pontoRows.rows,
  });
}
