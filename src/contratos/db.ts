import type { QueryResult } from "pg";
import { pool } from "@/lib/db";
import { numberToWordsPt } from "@/lib/numberToWords";
import { buildClausulas, EMPREITEIRO } from "./clausulas";
import type { Contrato, ContratoEstado, ContratoResumo, ClausulaContrato } from "./domain";

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string | Date | null): string {
  if (!iso) return "a definir";
  const s = String(iso);
  const d = new Date(s.includes("T") ? s : s + "T00:00:00");
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("pt-PT");
}

function fmtEur(value: number): string {
  return value.toLocaleString("pt-PT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
}

function parseClausulas(raw: unknown): ClausulaContrato[] {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as ClausulaContrato[];
    } catch {
      return [];
    }
  }
  if (Array.isArray(raw)) return raw as ClausulaContrato[];
  return [];
}

// ── Row types ────────────────────────────────────────────────────────────────

type ContratoRow = {
  id: string;
  proposta_id: string;
  revisao_id: string;
  estado: string;
  data_contrato: string | null;
  data_conclusao_prevista: string | null;
  signatario_dono_nome: string;
  signatario_dono_funcao: string;
  signatario_empreiteiro_nome: string;
  signatario_empreiteiro_funcao: string;
  clausulas: unknown;
  created_at: string;
  updated_at: string;
  // Joined fields
  proposta_codigo: string;
  revisao_numero: number;
  cliente_nome: string;
  cliente_nipc: string | null;
  obra_nome: string | null;
  obra_morada: string | null;
  total_venda: string | number | null;
  data_proposta: string | null;
};

// ── Public API ───────────────────────────────────────────────────────────────

export async function loadContratosResumo(): Promise<ContratoResumo[]> {
  const client = await pool.connect();
  try {
    const result: QueryResult<{
      id: string;
      proposta_codigo: string;
      revisao_numero: number;
      cliente_nome: string;
      estado: string;
      data_contrato: string | null;
      total_venda: string | number | null;
      created_at: string;
    }> = await client.query(`
      SELECT
        c.id,
        p.codigo AS proposta_codigo,
        r.numero_revisao AS revisao_numero,
        p.cliente_nome,
        c.estado,
        c.data_contrato,
        r.total_venda,
        c.created_at
      FROM contratos c
      JOIN propostas p ON p.id = c.proposta_id
      JOIN proposta_revisoes r ON r.id = c.revisao_id
      ORDER BY c.created_at DESC
    `);

    return result.rows.map((row) => ({
      id: row.id,
      propostaCodigo: row.proposta_codigo,
      revisaoNumero: row.revisao_numero,
      clienteNome: row.cliente_nome,
      estado: row.estado as ContratoEstado,
      dataContrato: row.data_contrato,
      totalVenda: Number(row.total_venda ?? 0),
      criadoEm: row.created_at,
    }));
  } finally {
    client.release();
  }
}

export async function loadContratoCompleto(id: string): Promise<Contrato | null> {
  const client = await pool.connect();
  try {
    const result: QueryResult<ContratoRow> = await client.query(
      `
      SELECT
        c.id,
        c.proposta_id,
        c.revisao_id,
        c.estado,
        c.data_contrato,
        c.data_conclusao_prevista,
        c.signatario_dono_nome,
        c.signatario_dono_funcao,
        c.signatario_empreiteiro_nome,
        c.signatario_empreiteiro_funcao,
        c.clausulas,
        c.created_at,
        c.updated_at,
        p.codigo AS proposta_codigo,
        r.numero_revisao AS revisao_numero,
        p.cliente_nome,
        p.cliente_nipc,
        p.obra_nome,
        p.obra_morada,
        r.total_venda,
        r.data_proposta
      FROM contratos c
      JOIN propostas p ON p.id = c.proposta_id
      JOIN proposta_revisoes r ON r.id = c.revisao_id
      WHERE c.id = $1
      `,
      [id],
    );

    if ((result.rowCount ?? 0) === 0) return null;

    const row = result.rows[0];
    return mapRowToContrato(row);
  } finally {
    client.release();
  }
}

function mapRowToContrato(row: ContratoRow): Contrato {
  return {
    id: row.id,
    propostaId: row.proposta_id,
    revisaoId: row.revisao_id,
    estado: row.estado as ContratoEstado,
    dataContrato: row.data_contrato,
    dataConclusaoPrevista: row.data_conclusao_prevista,
    signatarioDonoNome: row.signatario_dono_nome,
    signatarioDonoFuncao: row.signatario_dono_funcao,
    signatarioEmpreiteiroNome: row.signatario_empreiteiro_nome,
    signatarioEmpreiteiroFuncao: row.signatario_empreiteiro_funcao,
    clausulas: parseClausulas(row.clausulas),
    propostaCodigo: row.proposta_codigo,
    revisaoNumero: row.revisao_numero,
    clienteNome: row.cliente_nome,
    clienteNipc: row.cliente_nipc,
    obraNome: row.obra_nome,
    obraMorada: row.obra_morada,
    totalVenda: Number(row.total_venda ?? 0),
    dataProposta: row.data_proposta,
    criadoEm: row.created_at,
    atualizadoEm: row.updated_at,
  };
}

export async function createContrato(
  propostaId: string,
  revisaoId: string,
): Promise<{ id: string }> {
  const client = await pool.connect();
  try {
    // Load proposta + revisao data
    const propostaRes: QueryResult<{
      codigo: string;
      cliente_nome: string;
      cliente_nipc: string | null;
      obra_nome: string | null;
      obra_morada: string | null;
    }> = await client.query(
      `SELECT codigo, cliente_nome, cliente_nipc, obra_nome, obra_morada FROM propostas WHERE id = $1`,
      [propostaId],
    );

    if ((propostaRes.rowCount ?? 0) === 0) {
      throw new Error("Proposta não encontrada");
    }

    const proposta = propostaRes.rows[0];

    const revisaoRes: QueryResult<{
      id: string;
      numero_revisao: number;
      total_venda: string | number | null;
      data_proposta: string | null;
    }> = await client.query(
      `SELECT id, numero_revisao, total_venda, data_proposta FROM proposta_revisoes WHERE id = $1`,
      [revisaoId],
    );

    if ((revisaoRes.rowCount ?? 0) === 0) {
      throw new Error("Revisão não encontrada");
    }

    const revisao = revisaoRes.rows[0];
    const totalVenda = Number(revisao.total_venda ?? 0);

    // Build clausulas
    const referenciaProposta = `${proposta.codigo} – Revisão ${revisao.numero_revisao}`;
    const dataProposta = fmtDate(revisao.data_proposta);
    const obraMorada = proposta.obra_morada ?? proposta.obra_nome ?? "a definir";
    const valorNumerico = fmtEur(totalVenda);
    const valorPorExtenso = numberToWordsPt(totalVenda);

    const clausulas = buildClausulas({
      referenciaProposta,
      dataProposta,
      obraMorada,
      valorNumerico,
      valorPorExtenso,
      dataConclusaoPrevista: "a definir",
    });

    // Insert contrato
    const insertRes: QueryResult<{ id: string }> = await client.query(
      `
      INSERT INTO contratos (
        proposta_id,
        revisao_id,
        estado,
        signatario_dono_nome,
        signatario_dono_funcao,
        signatario_empreiteiro_nome,
        signatario_empreiteiro_funcao,
        clausulas
      ) VALUES ($1, $2, 'RASCUNHO', $3, $4, $5, $6, $7)
      RETURNING id
      `,
      [
        propostaId,
        revisaoId,
        proposta.cliente_nome,
        "",
        EMPREITEIRO.razaoSocial,
        "Gerente",
        JSON.stringify(clausulas),
      ],
    );

    return { id: insertRes.rows[0].id };
  } finally {
    client.release();
  }
}

export async function updateContrato(
  id: string,
  patch: {
    estado?: ContratoEstado;
    dataContrato?: string | null;
    dataConclusaoPrevista?: string | null;
    signatarioDonoNome?: string;
    signatarioDonoFuncao?: string;
    signatarioEmpreiteiroNome?: string;
    signatarioEmpreiteiroFuncao?: string;
    clausulas?: ClausulaContrato[];
  },
): Promise<void> {
  const client = await pool.connect();
  try {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (patch.estado !== undefined) {
      fields.push(`estado = $${idx++}`);
      values.push(patch.estado);
    }
    if ("dataContrato" in patch) {
      fields.push(`data_contrato = $${idx++}`);
      values.push(patch.dataContrato ?? null);
    }
    if ("dataConclusaoPrevista" in patch) {
      fields.push(`data_conclusao_prevista = $${idx++}`);
      values.push(patch.dataConclusaoPrevista ?? null);
    }
    if (patch.signatarioDonoNome !== undefined) {
      fields.push(`signatario_dono_nome = $${idx++}`);
      values.push(patch.signatarioDonoNome);
    }
    if (patch.signatarioDonoFuncao !== undefined) {
      fields.push(`signatario_dono_funcao = $${idx++}`);
      values.push(patch.signatarioDonoFuncao);
    }
    if (patch.signatarioEmpreiteiroNome !== undefined) {
      fields.push(`signatario_empreiteiro_nome = $${idx++}`);
      values.push(patch.signatarioEmpreiteiroNome);
    }
    if (patch.signatarioEmpreiteiroFuncao !== undefined) {
      fields.push(`signatario_empreiteiro_funcao = $${idx++}`);
      values.push(patch.signatarioEmpreiteiroFuncao);
    }
    if (patch.clausulas !== undefined) {
      fields.push(`clausulas = $${idx++}`);
      values.push(JSON.stringify(patch.clausulas));
    }

    if (fields.length === 0) return;

    fields.push(`updated_at = now()`);
    values.push(id);

    await client.query(
      `UPDATE contratos SET ${fields.join(", ")} WHERE id = $${idx}`,
      values,
    );
  } finally {
    client.release();
  }
}
