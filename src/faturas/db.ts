import { pool } from '@/lib/db';
import type { Fatura, FaturaResumo, FaturaCapituloAuto, CreateFaturaInput } from './domain';

type FaturaRow = {
  id: string; contrato_id: string; numero: string; tipo: string;
  numero_auto: number | null; estado: string;
  percentagem_adjudicacao: string; data_emissao: string | null;
  data_vencimento: string | null; taxa_iva: string; notas: string;
  created_at: string; updated_at: string;
  proposta_codigo: string; obra_nome: string; cliente_nome: string;
  contrato_valor_total: string; valor_bruto: string | null;
};

type CapituloRow = {
  id: string; fatura_id: string; capitulo: string; descricao: string;
  valor_contrato: string; percentagem_anterior: string; percentagem_atual: string;
};

function computeValues(row: FaturaRow) {
  const pctAdj = parseFloat(row.percentagem_adjudicacao) || 0;
  const taxaIva = parseFloat(row.taxa_iva) || 23;
  const contratoTotal = parseFloat(row.contrato_valor_total) || 0;
  let valorTrabalhosBruto = 0, descontoAdjudicacao = 0, valorBase = 0;
  if (row.tipo === 'adjudicacao') {
    valorBase = (contratoTotal * pctAdj) / 100;
    valorTrabalhosBruto = valorBase; descontoAdjudicacao = 0;
  } else {
    valorTrabalhosBruto = parseFloat(row.valor_bruto ?? '0') || 0;
    descontoAdjudicacao = (valorTrabalhosBruto * pctAdj) / 100;
    valorBase = valorTrabalhosBruto - descontoAdjudicacao;
  }
  const valorIva = (valorBase * taxaIva) / 100;
  return { valorTrabalhosBruto, descontoAdjudicacao, valorBase, valorIva, valorTotal: valorBase + valorIva };
}

function rowToResumo(row: FaturaRow): FaturaResumo {
  return {
    id: row.id, contratoId: row.contrato_id, numero: row.numero,
    tipo: row.tipo as FaturaResumo['tipo'], numeroAuto: row.numero_auto,
    estado: row.estado as FaturaResumo['estado'],
    percentagemAdjudicacao: parseFloat(row.percentagem_adjudicacao),
    dataEmissao: row.data_emissao, dataVencimento: row.data_vencimento,
    taxaIva: parseFloat(row.taxa_iva), notas: row.notas,
    createdAt: row.created_at, updatedAt: row.updated_at,
    propostaCodigo: row.proposta_codigo, obraNome: row.obra_nome,
    clienteNome: row.cliente_nome, contratoValorTotal: parseFloat(row.contrato_valor_total),
    ...computeValues(row),
  };
}

function rowToCapitulo(row: CapituloRow): FaturaCapituloAuto {
  return {
    id: row.id, faturaId: row.fatura_id, capitulo: row.capitulo, descricao: row.descricao,
    valorContrato: parseFloat(row.valor_contrato),
    percentagemAnterior: parseFloat(row.percentagem_anterior),
    percentagemAtual: parseFloat(row.percentagem_atual),
  };
}

const BASE_SELECT = `
  SELECT f.*,
    p.codigo AS proposta_codigo, p.obra_nome AS obra_nome, p.cliente_nome AS cliente_nome,
    COALESCE(pr.total_venda, pr.total, 0) AS contrato_valor_total,
    COALESCE((SELECT SUM(fac.valor_contrato*(fac.percentagem_atual-fac.percentagem_anterior)/100)
      FROM fatura_auto_capitulos fac WHERE fac.fatura_id=f.id),0) AS valor_bruto
  FROM faturas f
  JOIN contratos c ON c.id=f.contrato_id
  JOIN propostas p ON p.id=c.proposta_id
  JOIN proposta_revisoes pr ON pr.id=c.revisao_id
`;

export async function loadTodasFaturas(): Promise<FaturaResumo[]> {
  return (await pool.query<FaturaRow>(`${BASE_SELECT} ORDER BY f.created_at DESC`)).rows.map(rowToResumo);
}
export async function loadFaturasDoContrato(id: string): Promise<FaturaResumo[]> {
  return (await pool.query<FaturaRow>(`${BASE_SELECT} WHERE f.contrato_id=$1 ORDER BY f.created_at`,[id])).rows.map(rowToResumo);
}
export async function loadFaturaCompleta(id: string): Promise<Fatura|null> {
  const res = await pool.query<FaturaRow>(`${BASE_SELECT} WHERE f.id=$1`,[id]);
  if (!res.rows[0]) return null;
  const caps = await pool.query<CapituloRow>(`SELECT * FROM fatura_auto_capitulos WHERE fatura_id=$1 ORDER BY capitulo`,[id]);
  return { ...rowToResumo(res.rows[0]), capitulos: caps.rows.map(rowToCapitulo) };
}
export async function getPercentagemAdjudicacaoDoContrato(id: string): Promise<number> {
  const r = await pool.query(`SELECT percentagem_adjudicacao FROM faturas WHERE contrato_id=$1 AND tipo='adjudicacao' LIMIT 1`,[id]);
  return r.rows[0] ? parseFloat(r.rows[0].percentagem_adjudicacao) : 30;
}
async function generateNumeroFatura(): Promise<string> {
  const y = new Date().getFullYear();
  const r = await pool.query(`SELECT COUNT(*) AS cnt FROM faturas WHERE numero LIKE $1`,[`FAT-${y}-%`]);
  return `FAT-${y}-${String(parseInt(r.rows[0].cnt)+1).padStart(4,'0')}`;
}
async function getNextNumeroAuto(id: string): Promise<number> {
  return (await pool.query(`SELECT COALESCE(MAX(numero_auto),0)+1 AS n FROM faturas WHERE contrato_id=$1 AND tipo='auto'`,[id])).rows[0].n;
}
export async function createFatura(input: CreateFaturaInput): Promise<Fatura> {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const numero = await generateNumeroFatura();
    const nAuto = input.tipo==='auto' ? await getNextNumeroAuto(input.contratoId) : null;
    const {rows} = await c.query(
      `INSERT INTO faturas(contrato_id,numero,tipo,numero_auto,percentagem_adjudicacao,taxa_iva,notas) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [input.contratoId,numero,input.tipo,nAuto,input.percentagemAdjudicacao??30,input.taxaIva??23,input.notas??'']);
    const fid = rows[0].id as string;
    if (input.tipo==='auto' && input.capitulos?.length)
      for (const cap of input.capitulos)
        await c.query(`INSERT INTO fatura_auto_capitulos(fatura_id,capitulo,descricao,valor_contrato,percentagem_anterior,percentagem_atual) VALUES($1,$2,$3,$4,$5,$6)`,
          [fid,cap.capitulo,cap.descricao,cap.valorContrato,cap.percentagemAnterior,cap.percentagemAtual]);
    await c.query('COMMIT');
    return (await loadFaturaCompleta(fid))!;
  } catch(e){await c.query('ROLLBACK');throw e;} finally{c.release();}
}
export async function emitirFatura(id: string): Promise<Fatura> {
  const t = new Date().toISOString().split('T')[0];
  const d = new Date(Date.now()+30*86400000).toISOString().split('T')[0];
  await pool.query(`UPDATE faturas SET estado='EMITIDA',data_emissao=$2,data_vencimento=$3,updated_at=now() WHERE id=$1 AND estado='RASCUNHO'`,[id,t,d]);
  return (await loadFaturaCompleta(id))!;
}
export async function updateCapitulosAuto(fid: string, caps: NonNullable<CreateFaturaInput['capitulos']>): Promise<void> {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query('DELETE FROM fatura_auto_capitulos WHERE fatura_id=$1',[fid]);
    for (const cap of caps)
      await c.query(`INSERT INTO fatura_auto_capitulos(fatura_id,capitulo,descricao,valor_contrato,percentagem_anterior,percentagem_atual) VALUES($1,$2,$3,$4,$5,$6)`,
        [fid,cap.capitulo,cap.descricao,cap.valorContrato,cap.percentagemAnterior,cap.percentagemAtual]);
    await c.query('COMMIT');
  } catch(e){await c.query('ROLLBACK');throw e;} finally{c.release();}
}
