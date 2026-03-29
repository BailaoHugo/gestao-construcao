import { Pool } from 'pg';
import {
  Fornecedor,
  CreateFornecedorInput,
  Trabalhador,
  CreateTrabalhadorInput,
  FaturaRecebida,
  FaturaRecebidaEstado,
  CustoObra,
  CreateCustoObraInput,
  ResumoControloObra,
} from './domain';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ── Fornecedores ─────────────────────────────────────────────────────────────

export async function loadFornecedores(ativo?: boolean): Promise<Fornecedor[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (ativo !== undefined) {
    conditions.push(`ativo = $${values.length + 1}`);
    values.push(ativo);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `SELECT id, nome, nif, email, telefone, morada, tipo, notas, ativo,
            criado_em AS "criadoEm", atualizado_em AS "atualizadoEm"
     FROM fornecedores ${where} ORDER BY nome`,
    values,
  );
  return rows;
}

export async function loadFornecedor(id: string): Promise<Fornecedor | null> {
  const { rows } = await pool.query(
    `SELECT id, nome, nif, email, telefone, morada, tipo, notas, ativo,
            criado_em AS "criadoEm", atualizado_em AS "atualizadoEm"
     FROM fornecedores WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function createFornecedor(input: CreateFornecedorInput): Promise<Fornecedor> {
  const { rows } = await pool.query(
    `INSERT INTO fornecedores (nome, nif, email, telefone, morada, tipo, notas)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, nome, nif, email, telefone, morada, tipo, notas, ativo,
               criado_em AS "criadoEm", atualizado_em AS "atualizadoEm"`,
    [
      input.nome,
      input.nif ?? null,
      input.email ?? null,
      input.telefone ?? null,
      input.morada ?? null,
      input.tipo ?? 'fornecedor',
      input.notas ?? null,
    ],
  );
  return rows[0];
}

export async function updateFornecedor(
  id: string,
  input: Partial<CreateFornecedorInput> & { ativo?: boolean },
): Promise<Fornecedor | null> {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (input.nome !== undefined)      { sets.push(`nome = $${values.length+1}`);      values.push(input.nome); }
  if (input.nif !== undefined)       { sets.push(`nif = $${values.length+1}`);       values.push(input.nif); }
  if (input.email !== undefined)     { sets.push(`email = $${values.length+1}`);     values.push(input.email); }
  if (input.telefone !== undefined)  { sets.push(`telefone = $${values.length+1}`);  values.push(input.telefone); }
  if (input.morada !== undefined)    { sets.push(`morada = $${values.length+1}`);    values.push(input.morada); }
  if (input.tipo !== undefined)      { sets.push(`tipo = $${values.length+1}`);      values.push(input.tipo); }
  if (input.notas !== undefined)     { sets.push(`notas = $${values.length+1}`);     values.push(input.notas); }
  if (input.ativo !== undefined)     { sets.push(`ativo = $${values.length+1}`);     values.push(input.ativo); }
  if (!sets.length) return loadFornecedor(id);
  sets.push(`atualizado_em = now()`);
  values.push(id);
  const { rows } = await pool.query(
    `UPDATE fornecedores SET ${sets.join(', ')} WHERE id = $${values.length}
     RETURNING id, nome, nif, email, telefone, morada, tipo, notas, ativo,
               criado_em AS "criadoEm", atualizado_em AS "atualizadoEm"`,
    values,
  );
  return rows[0] ?? null;
}

// ── Trabalhadores ─────────────────────────────────────────────────────────────

export async function loadTrabalhadores(ativo?: boolean): Promise<Trabalhador[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  if (ativo !== undefined) {
    conditions.push(`ativo = $${values.length + 1}`);
    values.push(ativo);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `SELECT id, nome, cargo, custo_hora AS "custoHora", ativo, notas,
            criado_em AS "criadoEm", atualizado_em AS "atualizadoEm"
     FROM trabalhadores ${where} ORDER BY nome`,
    values,
  );
  return rows;
}

export async function loadTrabalhador(id: string): Promise<Trabalhador | null> {
  const { rows } = await pool.query(
    `SELECT id, nome, cargo, custo_hora AS "custoHora", ativo, notas,
            criado_em AS "criadoEm", atualizado_em AS "atualizadoEm"
     FROM trabalhadores WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function createTrabalhador(input: CreateTrabalhadorInput): Promise<Trabalhador> {
  const { rows } = await pool.query(
    `INSERT INTO trabalhadores (nome, cargo, custo_hora, notas)
     VALUES ($1, $2, $3, $4)
     RETURNING id, nome, cargo, custo_hora AS "custoHora", ativo, notas,
               criado_em AS "criadoEm", atualizado_em AS "atualizadoEm"`,
    [input.nome, input.cargo ?? null, input.custoHora ?? 0, input.notas ?? null],
  );
  return rows[0];
}

export async function updateTrabalhador(
  id: string,
  input: Partial<CreateTrabalhadorInput> & { ativo?: boolean },
): Promise<Trabalhador | null> {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (input.nome !== undefined)      { sets.push(`nome = $${values.length+1}`);       values.push(input.nome); }
  if (input.cargo !== undefined)     { sets.push(`cargo = $${values.length+1}`);      values.push(input.cargo); }
  if (input.custoHora !== undefined) { sets.push(`custo_hora = $${values.length+1}`); values.push(input.custoHora); }
  if (input.notas !== undefined)     { sets.push(`notas = $${values.length+1}`);      values.push(input.notas); }
  if (input.ativo !== undefined)     { sets.push(`ativo = $${values.length+1}`);      values.push(input.ativo); }
  if (!sets.length) return loadTrabalhador(id);
  sets.push(`atualizado_em = now()`);
  values.push(id);
  const { rows } = await pool.query(
    `UPDATE trabalhadores SET ${sets.join(', ')} WHERE id = $${values.length}
     RETURNING id, nome, cargo, custo_hora AS "custoHora", ativo, notas,
               criado_em AS "criadoEm", atualizado_em AS "atualizadoEm"`,
    values,
  );
  return rows[0] ?? null;
}

// ── Faturas Recebidas ─────────────────────────────────────────────────────────

export async function loadFaturasRecebidas(estado?: FaturaRecebidaEstado): Promise<FaturaRecebida[]> {
  const values: unknown[] = [];
  const where = estado ? `WHERE fr.estado = $${(values.push(estado), values.length)}` : '';
  const { rows } = await pool.query(
    `SELECT fr.id, fr.contrato_id AS "contratoId", fr.fornecedor_id AS "fornecedorId",
            fr.origem, fr.estado,
            fr.ficheiro_url AS "ficheiroUrl", fr.ficheiro_nome AS "ficheiroNome",
            fr.ficheiro_tipo AS "ficheiroTipo",
            fr.dados_extraidos AS "dadosExtraidos",
            fr.email_remetente AS "emailRemetente", fr.email_assunto AS "emailAssunto",
            fr.email_data AS "emailData", fr.email_uid AS "emailUid",
            fr.processado_em AS "processadoEm", fr.erro_processamento AS "erroProcessamento",
            fr.notas, fr.criado_em AS "criadoEm",
            f.nome AS "fornecedorNome",
            p.codigo AS "contratoNumero", p.cliente_nome AS "contratoDesignacao"
     FROM faturas_recebidas fr
     LEFT JOIN fornecedores f ON f.id = fr.fornecedor_id
     LEFT JOIN contratos c ON c.id = fr.contrato_id
    LEFT JOIN propostas p ON p.id = c.proposta_id
     ${where}
     ORDER BY fr.criado_em DESC`,
    values,
  );
  return rows.map(r => ({
    ...r,
    contratoInfo: r.contratoNumero ? `${r.contratoNumero} – ${r.contratoDesignacao}` : null,
  }));
}

export async function loadFaturaRecebida(id: string): Promise<FaturaRecebida | null> {
  const { rows } = await pool.query(
    `SELECT fr.id, fr.contrato_id AS "contratoId", fr.fornecedor_id AS "fornecedorId",
            fr.origem, fr.estado,
            fr.ficheiro_url AS "ficheiroUrl", fr.ficheiro_nome AS "ficheiroNome",
            fr.ficheiro_tipo AS "ficheiroTipo",
            fr.dados_extraidos AS "dadosExtraidos",
            fr.email_remetente AS "emailRemetente", fr.email_assunto AS "emailAssunto",
            fr.email_data AS "emailData", fr.email_uid AS "emailUid",
            fr.processado_em AS "processadoEm", fr.erro_processamento AS "erroProcessamento",
            fr.notas, fr.criado_em AS "criadoEm",
            f.nome AS "fornecedorNome",
            p.codigo AS "contratoNumero", p.cliente_nome AS "contratoDesignacao"
     FROM faturas_recebidas fr
     LEFT JOIN fornecedores f ON f.id = fr.fornecedor_id
     LEFT JOIN contratos c ON c.id = fr.contrato_id
    LEFT JOIN propostas p ON p.id = c.proposta_id
     WHERE fr.id = $1`,
    [id],
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return { ...r, contratoInfo: r.contratoNumero ? `${r.contratoNumero} – ${r.contratoDesignacao}` : null };
}

export async function updateFaturaRecebida(
  id: string,
  patch: Partial<{
    contratoId: string; fornecedorId: string; estado: FaturaRecebidaEstado;
    dadosExtraidos: unknown; processadoEm: Date; erroProcessamento: string;
    notas: string; ficheiroUrl: string; ficheiroNome: string; ficheiroTipo: string;
  }>,
): Promise<FaturaRecebida | null> {
  const map: Record<string, string> = {
    contratoId: 'contrato_id', fornecedorId: 'fornecedor_id', estado: 'estado',
    dadosExtraidos: 'dados_extraidos', processadoEm: 'processado_em',
    erroProcessamento: 'erro_processamento', notas: 'notas',
    ficheiroUrl: 'ficheiro_url', ficheiroNome: 'ficheiro_nome', ficheiroTipo: 'ficheiro_tipo',
  };
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [key, col] of Object.entries(map)) {
    if ((patch as Record<string, unknown>)[key] !== undefined) {
      sets.push(`${col} = $${values.length + 1}`);
      values.push((patch as Record<string, unknown>)[key]);
    }
  }
  if (!sets.length) return loadFaturaRecebida(id);
  sets.push(`atualizado_em = now()`);
  values.push(id);
  await pool.query(`UPDATE faturas_recebidas SET ${sets.join(', ')} WHERE id = $${values.length}`, values);
  return loadFaturaRecebida(id);
}

// ── Custos de Obra ────────────────────────────────────────────────────────────

export async function loadCustosObra(contratoId: string): Promise<CustoObra[]> {
  const { rows } = await pool.query(
    `SELECT co.id, co.contrato_id AS "contratoId",
            co.fatura_recebida_id AS "faturaRecebidaId",
            co.tipo, co.data, co.descricao, co.capitulo_ref AS "capituloRef",
            co.fornecedor_id AS "fornecedorId", co.trabalhador_id AS "trabalhadorId",
            co.quantidade, co.custo_unitario AS "custoUnitario",
            co.valor, co.fatura_ref AS "faturaRef", co.notas,
            co.criado_em AS "criadoEm",
            f.nome AS "fornecedorNome",
            t.nome AS "trabalhadorNome"
     FROM custos_obra co
     LEFT JOIN fornecedores f ON f.id = co.fornecedor_id
     LEFT JOIN trabalhadores t ON t.id = co.trabalhador_id
     WHERE co.contrato_id = $1
     ORDER BY co.data DESC, co.criado_em DESC`,
    [contratoId],
  );
  return rows;
}

export async function createCustoObra(input: CreateCustoObraInput): Promise<CustoObra> {
  const { rows } = await pool.query(
    `INSERT INTO custos_obra
       (contrato_id, fatura_recebida_id, tipo, data, descricao, capitulo_ref,
        fornecedor_id, trabalhador_id, quantidade, custo_unitario, valor, fatura_ref, notas)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING id, contrato_id AS "contratoId",
               fatura_recebida_id AS "faturaRecebidaId",
               tipo, data, descricao, capitulo_ref AS "capituloRef",
               fornecedor_id AS "fornecedorId", trabalhador_id AS "trabalhadorId",
               quantidade, custo_unitario AS "custoUnitario",
               valor, fatura_ref AS "faturaRef", notas,
               criado_em AS "criadoEm"`,
    [
      input.contratoId, input.faturaRecebidaId ?? null, input.tipo, input.data,
      input.descricao ?? null, input.capituloRef ?? null,
      input.fornecedorId ?? null, input.trabalhadorId ?? null,
      input.quantidade ?? null, input.custoUnitario ?? null,
      input.valor, input.faturaRef ?? null, input.notas ?? null,
    ],  );
  return rows[0];
}

export async function deleteCustoObra(id: string): Promise<boolean> {
  const { rowCount } = await pool.query(`DELETE FROM custos_obra WHERE id = $1`, [id]);
  return (rowCount ?? 0) > 0;
}

export async function loadResumoControloObra(contratoId: string): Promise<ResumoControloObra> {
  const { rows } = await pool.query(
    `SELECT
       COALESCE(SUM(valor), 0)                                          AS "totalCustos",
       COALESCE(SUM(CASE WHEN tipo='material'       THEN valor END), 0) AS "totalMateriais",
       COALESCE(SUM(CASE WHEN tipo='subempreitada'  THEN valor END), 0) AS "totalSubempreitadas",
       COALESCE(SUM(CASE WHEN tipo='mao_de_obra'    THEN valor END), 0) AS "totalMaoDeObra",
       COALESCE(SUM(CASE WHEN tipo='equipamento'    THEN valor END), 0) AS "totalEquipamento"
     FROM custos_obra WHERE contrato_id = $1`,
    [contratoId],
  );
  const { rows: fr } = await pool.query(
    `SELECT COUNT(*) AS cnt FROM faturas_recebidas
     WHERE contrato_id = $1 AND estado IN ('pendente','processando','revisto')`,
    [contratoId],
  );
  const r = rows[0];
  return {
    contratoId,
    totalCustos:         Number(r.totalCustos),
    totalMateriais:      Number(r.totalMateriais),
    totalSubempreitadas: Number(r.totalSubempreitadas),
    totalMaoDeObra:      Number(r.totalMaoDeObra),
    totalEquipamento:    Number(r.totalEquipamento),
    numFaturasPendentes: Number(fr[0].cnt),
  };
}
