import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// Mapeamento de categorias do scan para tipos da tabela despesas
const CATEGORIA_TO_TIPO: Record<string, string> = {
  'Material de obra':       'materiais',
  'Ferramentas':            'equipamentos',
  'Subempreitada':          'mao_de_obra',
  'Subcontratacao':         'mao_de_obra',
  'Prestação de serviços':  'mao_de_obra',
  'Combustivel':            'outros',
  'Alimentacao':            'outros',
  'Transporte':             'outros',
  'Outros':                 'outros',
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      fornecedor, nif, data, valor_total, valor_sem_iva, iva,
      descricao, categoria, centro_custo_id, notas, documento_ref,
    } = body;

    const tipo = CATEGORIA_TO_TIPO[categoria] ?? 'outros';
    const valor = valor_total ?? valor_sem_iva ?? null;

    if (!descricao || !valor) {
      return NextResponse.json({ error: 'descricao e valor sao obrigatorios' }, { status: 400 });
    }

    const notasCompletas = [
      notas,
      nif ? `NIF: ${nif}` : null,
      iva  ? `IVA: ${iva}%` : null,
      valor_sem_iva ? `Sem IVA: ${valor_sem_iva}€` : null,
    ].filter(Boolean).join(' | ') || null;

    const { rows } = await pool.query(
      `INSERT INTO despesas
         (data_despesa, descricao, tipo, valor, centro_custo_id, fornecedor, notas, documento_ref)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        data || new Date().toISOString().slice(0, 10),
        descricao,
        tipo,
        valor,
        centro_custo_id || null,
        fornecedor || null,
        notasCompletas,
        documento_ref || null,
      ]
    );

    return NextResponse.json({ ok: true, id: rows[0].id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/despesas/registar]', msg);
    return NextResponse.json({ error: 'Erro ao guardar despesa' }, { status: 500 });
  }
}
