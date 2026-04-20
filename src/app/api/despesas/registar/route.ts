import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

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

interface ScanLinha {
  descricao: string;
  quantidade: number | null;
  unidade: string | null;
  preco_unitario: number | null;
  total: number | null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      fornecedor, nif, nif_comprador, data, valor_total, valor_sem_iva, iva,
      descricao, categoria, centro_custo_id, notas, documento_ref,
      numero_fatura, qr_atcud, linhas,
      forcar,
    } = body;

    const tipo = CATEGORIA_TO_TIPO[categoria] ?? 'outros';
    const valor = valor_total ?? valor_sem_iva ?? null;

    if (!descricao || !valor) {
      return NextResponse.json({ error: 'descricao e valor sao obrigatorios' }, { status: 400 });
    }

    // Duplicate check: same numero_fatura already in DB
    if (numero_fatura && !forcar) {
      const { rows: dup } = await pool.query(
        `SELECT id, fornecedor, data_despesa::text AS data_despesa, valor
           FROM despesas
          WHERE numero_fatura = $1
          LIMIT 1`,
        [numero_fatura]
      );
      if (dup.length > 0) {
        return NextResponse.json(
          { duplicate: true, existing: dup[0] },
          { status: 409 }
        );
      }
    }

    const notasCompletas = [
      notas,
      nif        ? `NIF: ${nif}` : null,
      nif_comprador ? `NIF Comp.: ${nif_comprador}` : null,
      iva        ? `IVA: ${iva}%` : null,
      valor_sem_iva ? `s/IVA: ${valor_sem_iva}€` : null,
      qr_atcud   ? `ATCUD: ${String(qr_atcud).substring(0, 40)}` : null,
    ].filter(Boolean).join(' | ') || null;

    const valorIva = (iva != null && valor_sem_iva != null)
      ? Math.round(valor_sem_iva * (iva / 100) * 100) / 100
      : null;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows } = await client.query(
        `INSERT INTO despesas
          (data_despesa, descricao, tipo, valor, centro_custo_id, fornecedor, notas, documento_ref,
           numero_fatura, valor_sem_iva, valor_iva, valor_total_civa)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING id`,
        [
          data || new Date().toISOString().slice(0, 10),
          descricao, tipo, valor,
          centro_custo_id || null,
          fornecedor || null,
          notasCompletas,
          documento_ref || null,
          numero_fatura || null,
          valor_sem_iva != null ? valor_sem_iva : null,
          valorIva,
          valor_total || null,
        ]
      );

      const despesaId = rows[0].id;

      if (Array.isArray(linhas) && linhas.length > 0) {
        for (const l of linhas as ScanLinha[]) {
          await client.query(
            `INSERT INTO despesa_linhas
              (despesa_id, descricao, quantidade, unidade, preco_unit_sem_iva, taxa_iva, desconto_pct, total_sem_iva)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [
              despesaId,
              l.descricao,
              l.quantidade ?? 1,
              l.unidade ?? 'un',
              l.preco_unitario ?? 0,
              iva ?? 23,
              0,
              l.total ?? 0,
            ]
          );
        }
      }

      await client.query('COMMIT');
      return NextResponse.json({ ok: true, id: despesaId });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/despesas/registar]', msg);
    return NextResponse.json({ error: 'Erro ao guardar despesa' }, { status: 500 });
  }
}
