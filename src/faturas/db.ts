import { pool } from '@/lib/db';
import type { Fatura, FaturaCompleta } from './domain';

// módulo faturação v1.0 – db layer
const BASE_SELECT = `
  SELECT
    f.id,
    f.contrato_id,
    f.numero,
    f.tipo,
    f.numero_auto,
    f.estado,
    f.percentagem_adjudicacao,
    f.data_emissao,
    f.data_vencimento,
    f.taxa_iva,
    f.notas,
    f.created_at,
    f.updated_at,
    p.codigo        AS proposta_codigo,
    p.obra_nome,
    p.cliente_nome
  FROM faturas f
  LEFT JOIN contratos c ON c.id = f.contrato_id
  LEFT JOIN propostas p ON p.id = c.proposta_id
`;

export async function loadTodasFaturas(): Promise<Fatura[]> {
  const { rows } = await pool.query(
    BASE_SELECT + ' ORDER BY f.created_at DESC',
  );
  return rows;
}

export async function getFatura(id: string): Promise<Fatura | null> {
  const { rows } = await pool.query(BASE_SELECT + ' WHERE f.id = $1', [id]);
  return rows[0] ?? null;
}

export async function createFatura(
  data: Pick<Fatura, 'contrato_id' | 'tipo'> & Partial<Fatura>,
): Promise<Fatura> {
  const {
    contrato_id,
    tipo,
    estado,
    percentagem_adjudicacao,
    taxa_iva,
    notas,
    data_emissao,
    data_vencimento,
  } = data;

  const { rows } = await pool.query(
    `INSERT INTO faturas
       (contrato_id, tipo, estado, percentagem_adjudicacao, taxa_iva,
        notas, data_emissao, data_vencimento)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      contrato_id,
      tipo ?? 'manual',
      estado ?? 'rascunho',
      percentagem_adjudicacao ?? null,
      taxa_iva ?? 23,
      notas ?? null,
      data_emissao ?? null,
      data_vencimento ?? null,
    ],
  );
  return rows[0];
}

export async function updateFatura(
  id: string,
  data: Partial<Fatura>,
): Promise<Fatura> {
  const editable = [
    'tipo', 'estado', 'percentagem_adjudicacao', 'taxa_iva',
    'notas', 'data_emissao', 'data_vencimento',
  ] as const;

  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const field of editable) {
    if (field in data) {
      updates.push(`${field} = $${idx++}`);
      values.push((data as Record<string, unknown>)[field] ?? null);
    }
  }

  if (!updates.length) {
    const fatura = await getFatura(id);
    if (!fatura) throw new Error(`Fatura ${id} não encontrada`);
    return fatura;
  }

  values.push(id);
  const { rows } = await pool.query(
    `UPDATE faturas SET ${updates.join(', ')}, updated_at = NOW()
     WHERE id = $${idx} RETURNING *`,
    values,
  );
  if (!rows[0]) throw new Error(`Fatura ${id} não encontrada`);
  return rows[0];
}

export async function emitirFatura(id: string): Promise<Fatura> {
  const { rows } = await pool.query(
    `UPDATE faturas
     SET estado = 'emitida',
         data_emissao = COALESCE(data_emissao, NOW()::date),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id],
  );
  if (!rows[0]) throw new Error(`Fatura ${id} não encontrada`);
  return rows[0];
}

export async function loadFaturaCompleta(
  id: string,
): Promise<FaturaCompleta | null> {
  const fatura = await getFatura(id);
  if (!fatura) return null;

  const { rows: capitulos } = await pool.query(
    'SELECT * FROM fatura_auto_capitulos WHERE fatura_id = $1 ORDER BY capitulo',
    [id],
  );

  return { ...fatura, capitulos };
}
