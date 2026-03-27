import { pool } from '@/lib/db';
import type { Fatura, FaturaCompleta } from './domain';

// módulo faturação v1.0 – db layer
const BASE_SELECT = `
  SELECT
    f.id,
    f.contrato_id           AS "contratoId",
    f.numero,
    f.tipo,
    f.numero_auto           AS "numeroAuto",
    f.estado,
    f.percentagem_adjudicacao AS "percentagemAdjudicacao",
    f.data_emissao          AS "dataEmissao",
    f.data_vencimento       AS "dataVencimento",
    f.taxa_iva              AS "taxaIva",
    f.notas,
    f.created_at            AS "createdAt",
    f.updated_at            AS "updatedAt",
    COALESCE(p.codigo, '')  AS "propostaCodigo",
    COALESCE(p.obra_nome, '') AS "obraNome",
    COALESCE(p.cliente_nome, '') AS "clienteNome"
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
  data: Pick<Fatura, 'contratoId' | 'tipo'> & Partial<Fatura>,
): Promise<Fatura> {
  const {
    contratoId,
    tipo,
    estado,
    percentagemAdjudicacao,
    taxaIva,
    notas,
    dataEmissao,
    dataVencimento,
  } = data;

  const { rows } = await pool.query(
    `INSERT INTO faturas
       (contrato_id, tipo, estado, percentagem_adjudicacao, taxa_iva,
        notas, data_emissao, data_vencimento)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id`,
    [
      contratoId,
      tipo ?? 'manual',
      estado ?? 'RASCUNHO',
      percentagemAdjudicacao ?? null,
      taxaIva ?? 23,
      notas ?? null,
      dataEmissao ?? null,
      dataVencimento ?? null,
    ],
  );
  const created = await getFatura(rows[0].id);
  if (!created) throw new Error('Fatura criada não encontrada');
  return created;
}

export async function updateFatura(
  id: string,
  data: Partial<Fatura>,
): Promise<Fatura> {
  const fieldMap: Record<string, string> = {
    tipo: 'tipo',
    estado: 'estado',
    percentagemAdjudicacao: 'percentagem_adjudicacao',
    taxaIva: 'taxa_iva',
    notas: 'notas',
    dataEmissao: 'data_emissao',
    dataVencimento: 'data_vencimento',
  };

  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const [tsKey, dbCol] of Object.entries(fieldMap)) {
    if (tsKey in data) {
      updates.push(`${dbCol} = $${idx++}`);
      values.push((data as Record<string, unknown>)[tsKey] ?? null);
    }
  }

  if (!updates.length) {
    const fatura = await getFatura(id);
    if (!fatura) throw new Error(`Fatura ${id} não encontrada`);
    return fatura;
  }

  values.push(id);
  await pool.query(
    `UPDATE faturas SET ${updates.join(', ')}, updated_at = NOW()
     WHERE id = $${idx}`,
    values,
  );
  const updated = await getFatura(id);
  if (!updated) throw new Error(`Fatura ${id} não encontrada`);
  return updated;
}

export async function emitirFatura(id: string): Promise<Fatura> {
  await pool.query(
    `UPDATE faturas
     SET estado = 'EMITIDA',
         data_emissao = COALESCE(data_emissao, NOW()::date),
         updated_at = NOW()
     WHERE id = $1`,
    [id],
  );
  const fatura = await getFatura(id);
  if (!fatura) throw new Error(`Fatura ${id} não encontrada`);
  return fatura;
}

export async function loadFaturaCompleta(
  id: string,
): Promise<FaturaCompleta | null> {
  const fatura = await getFatura(id);
  if (!fatura) return null;

  const { rows: capitulos } = await pool.query(
    `SELECT
       id,
       fatura_id            AS "faturaId",
       capitulo,
       descricao,
       valor_contrato       AS "valorContrato",
       percentagem_anterior AS "percentagemAnterior",
       percentagem_atual    AS "percentagemAtual"
     FROM fatura_auto_capitulos
     WHERE fatura_id = $1
     ORDER BY capitulo`,
    [id],
  );

  return { ...fatura, capitulos };
}
