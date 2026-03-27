import { pool } from '@/lib/db';
import type { Fatura, FaturaResumo, FaturaCapituloAuto, CreateFaturaInput } from './domain';

// ── Row types ──────────────────────────────────────────────────────────────────────────────

type FaturaRow = {
  id: string;
  contrato_id: string;
  numero: string;
  tipo: string;
  numero_auto: number | null;
  estado: string;
  percentagem_adjudicacao: string;
  data_emissao: string | null;
  data_vencimento: string | null;
  taxa_iva: string;
  notas: string;
  created_at: string;
  updated_at: string;
  proposta_codigo: string;
  cliente_nome: string;
  contrato_valor_total: string;
  valor_bruto: string | null;
};

type CapituloRow = {
  id: string;
  fatura_id: string;
  capitulo: string;
  descricao: string;
  valor_contrato: string;
  percentagem_anterior: string;
  percentagem_atual: string;
};

// ── Computed values ──────────────────────────────────────────────────────────────────────

function computeValues(row: FaturaRow) {
  const pctAdj        = parseFloat(row.percentagem_adjudicacao) || 0;
  const taxaIva       = parseFloat(row.taxa_iva) || 23;
  const contratoTotal = parseFloat(row.contrato_valor_total) || 0;

  let valorTrabalhosBruto = 0;
  let descontoAdjudicacao = 0;
  let valorBase           = 0;

  if (row.tipo === 'adjudicacao') {
    valorBase           = (contratoTotal * pctAdj) / 100;
    valorTrabalhosBruto = valorBase;
    descontoAdjudicacao = 0;
  } else {
    valorTrabalhosBruto = parseFloat(row.valor_bruto ?? '0') || 0;
    descontoAdjudicacao = (valorTrabalhosBruto * pctAdj) / 100;
    valorBase           = valorTrabalhosBruto - descontoAdjudicacao;
  }

  const valorIva   = (valorBase * taxaIva) / 100;
  const valorTotal = valorBase + valorIva;

  return { valorTrabalhosBruto, descontoAdjudicacao, valorBase, valorIva, valorTotal };
}

function rowToResumo(row: FaturaRow): FaturaResumo {
  return {
    id:                     row.id,
    contratoId:             row.contrato_id,
    numero:                 row.numero,
    tipo:                   row.tipo as FaturaResumo['tipo'],
    numeroAuto:             row.numero_auto,
    estado:                 row.estado as FaturaResumo['estado'],
    percentagemAdjudicacao: parseFloat(row.percentagem_adjudicacao),
    dataEmissao:            row.data_emissao,
    dataVencimento:         row.data_vencimento,
    taxaIva:                parseFloat(row.taxa_iva),
    notas:                  row.notas,
    criadoEm:               row.created_at,
    atualizadoEm:           row.updated_at,
    propostaCodigo:         row.proposta_codigo,
    clienteNome:            row.cliente_nome,
    contratoValorTotal:     parseFloat(row.contrato_valor_total),
    ...computeValues(row),
  };
}

function rowToCapitulo(row: CapituloRow): FaturaCapituloAuto {
  return {
    id:                  row.id,
    faturaId:            row.fatura_id,
    capitulo:            row.capitulo,
    descricao:           row.descricao,
    valorContrato:       parseFloat(row.valor_contrato),
    percentagemAnterior: parseFloat(row.percentagem_anterior),
    percentagemAtual:    parseFloat(row.percentagem_atual),
  };
}

// ── Base SELECT ──────────────────────────────────────────────────────────────────────────────

const BASE_SELECT = `
  SELECT
    f.*,
    p.codigo            AS proposta_codigo,
    pr.cliente_nome,
    pr.total_venda      AS contrato_valor_total,
    COALESCE((
      SELECT SUM(fac.valor_contrato * (fac.percentagem_atual - fac.percentagem_anterior) / 100)
      FROM   fatura_auto_capitulos fac
      WHERE  fac.fatura_id = f.id
    ), 0)               AS valor_bruto
  FROM  faturas          f
  JOIN  contratos        c  ON c.id  = f.contrato_id
  JOIN  propostas        p  ON p.id  = c.proposta_id
  JOIN  proposta_revisoes pr ON pr.id = c.revisao_id
`;

// ── Public queries ──────────────────────────────────────────────────────────────────────────────

export async function loadTodasFaturas(): Promise<FaturaResumo[]> {
  const res = await pool.query<FaturaRow>(
    `${BASE_SELECT} ORDER BY f.created_at DESC`,
  );
  return res.rows.map(rowToResumo);
}

export async function loadFaturasDoContrato(contratoId: string): Promise<FaturaResumo[]> {
  const res = await pool.query<FaturaRow>(
    `${BASE_SELECT} WHERE f.contrato_id = $1 ORDER BY f.created_at`,
    [contratoId],
  );
  return res.rows.map(rowToResumo);
}

export async function loadFaturaCompleta(id: string): Promise<Fatura | null> {
  const res = await pool.query<FaturaRow>(
    `${BASE_SELECT} WHERE f.id = $1`,
    [id],
  );
  if (!res.rows[0]) return null;

  const resumo = rowToResumo(res.rows[0]);

  const capRes = await pool.query<CapituloRow>(
    `SELECT * FROM fatura_auto_capitulos WHERE fatura_id = $1 ORDER BY capitulo`,
    [id],
  );

  return { ...resumo, capitulos: capRes.rows.map(rowToCapitulo) };
}

export async function getPercentagemAdjudicacaoDoContrato(contratoId: string): Promise<number> {
  const res = await pool.query(
    `SELECT percentagem_adjudicacao FROM faturas
     WHERE  contrato_id = $1 AND tipo = 'adjudicacao' LIMIT 1`,
    [contratoId],
  );
  return res.rows[0] ? parseFloat(res.rows[0].percentagem_adjudicacao) : 30;
}

// ── Helpers ───────────────────────────────────────────────────────────────────────────────────────────────────────

async function generateNumeroFatura(): Promise<string> {
  const year = new Date().getFullYear();
  const res  = await pool.query(
    `SELECT COUNT(*) AS cnt FROM faturas WHERE numero LIKE $1`,
    [`FAT-${year}-%`],
  );
  const count = parseInt(res.rows[0].cnt as string) + 1;
  return `FAT-${year}-${String(count).padStart(4, '0')}`;
}

async function getNextNumeroAuto(contratoId: string): Promise<number> {
  const res = await pool.query(
    `SELECT COALESCE(MAX(numero_auto), 0) + 1 AS next_num
     FROM   faturas WHERE contrato_id = $1 AND tipo = 'auto'`,
    [contratoId],
  );
  return res.rows[0].next_num as number;
}

// ── Mutations ───────────────────────────────────────────────────────────────────────────────────────────────────────

export async function createFatura(input: CreateFaturaInput): Promise<Fatura> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const numero     = await generateNumeroFatura();
    const numeroAuto = input.tipo === 'auto' ? await getNextNumeroAuto(input.contratoId) : null;
    const pctAdj     = input.percentagemAdjudicacao ?? 30;
    const taxaIva    = input.taxaIva ?? 23;

    const { rows } = await client.query(
      `INSERT INTO faturas
         (contrato_id, numero, tipo, numero_auto, percentagem_adjudicacao, taxa_iva, notas)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id`,
      [input.contratoId, numero, input.tipo, numeroAuto, pctAdj, taxaIva, input.notas ?? ''],
    );
    const faturaId = rows[0].id as string;

    if (input.tipo === 'auto' && input.capitulos?.length) {
      for (const cap of input.capitulos) {
        await client.query(
          `INSERT INTO fatura_auto_capitulos
             (fatura_id, capitulo, descricao, valor_contrato, percentagem_anterior, percentagem_atual)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [faturaId, cap.capitulo, cap.descricao, cap.valorContrato, cap.percentagemAnterior, cap.percentagemAtual],
        );
      }
    }

    await client.query('COMMIT');
    return (await loadFaturaCompleta(faturaId))!;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function emitirFatura(id: string): Promise<Fatura> {
  const today = new Date().toISOString().split('T')[0];
  const due   = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  await pool.query(
    `UPDATE faturas
     SET    estado = 'EMITIDA', data_emissao = $2, data_vencimento = $3, updated_at = now()
     WHERE  id = $1 AND estado = 'RASCUNHO'`,
    [id, today, due],
  );

  return (await loadFaturaCompleta(id))!;
}

export async function updateCapitulosAuto(
  faturaId: string,
  capitulos: NonNullable<CreateFaturaInput['capitulos']>,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM fatura_auto_capitulos WHERE fatura_id = $1', [faturaId]);
    for (const cap of capitulos) {
      await client.query(
        `INSERT INTO fatura_auto_capitulos
           (fatura_id, capitulo, descricao, valor_contrato, percentagem_anterior, percentagem_atual)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [faturaId, cap.capitulo, cap.descricao, cap.valorContrato, cap.percentagemAnterior, cap.percentagemAtual],
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
