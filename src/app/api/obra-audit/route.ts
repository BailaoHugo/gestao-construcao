import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('key') !== 'audit2026') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const obraCode = searchParams.get('obra') || '123';

  // Buscar todas as despesas da obra
  const { rows } = await pool.query(`
    SELECT
      d.id, d.data_despesa, d.fornecedor, d.numero_fatura,
      COALESCE(d.valor_sem_iva,0)::float AS valor_sem_iva,
      d.tipo, d.nome_ficheiro,
      o.code AS obra_code, o.name AS obra_nome,
      -- NIF do fornecedor guardado nas notas
      (regexp_match(d.notas, 'NIF: (\d+)'))[1] AS nif_fornecedor
    FROM despesas d
    LEFT JOIN obras o ON o.id = d.centro_custo_id
    WHERE o.code = $1
    ORDER BY d.data_despesa DESC, d.id DESC
  `, [obraCode]);

  // Detectar duplicados por numero_fatura
  const refCount: Record<string, number> = {};
  for (const r of rows) {
    if (r.numero_fatura) {
      refCount[r.numero_fatura] = (refCount[r.numero_fatura] || 0) + 1;
    }
  }
  const duplicados = Object.entries(refCount).filter(([, c]) => c > 1).map(([ref]) => ref);

  // Detectar auto-facturação (NIF da empresa como fornecedor)
  const COMPANY_NIFS = ['515188166'];
  const autoFaturacao = rows.filter(r =>
    COMPANY_NIFS.some(nif =>
      r.nif_fornecedor === nif ||
      (r.fornecedor || '').toLowerCase().includes('solid projects')
    )
  );

  return NextResponse.json({
    total: rows.length,
    duplicados_refs: duplicados,
    num_duplicados: duplicados.length,
    auto_faturacao: autoFaturacao.map(r => ({ id: r.id, fornecedor: r.fornecedor, ref: r.numero_fatura, data: r.data_despesa, valor: r.valor_sem_iva })),
    despesas: rows.map(r => ({
      id: r.id,
      data: r.data_despesa,
      fornecedor: r.fornecedor,
      ref: r.numero_fatura,
      valor: r.valor_sem_iva,
      tipo: r.tipo,
      ficheiro: r.nome_ficheiro,
      duplicado: duplicados.includes(r.numero_fatura),
      auto_fat: COMPANY_NIFS.some(nif => r.nif_fornecedor === nif || (r.fornecedor||'').toLowerCase().includes('solid projects'))
    }))
  });
}
