import { randomUUID } from "node:crypto";
import type { QueryResult } from "pg";
import { pool, withTransaction } from "@/lib/db";
import type {
  Proposta,
  PropostaEstado,
  PropostaFolhaRosto,
  PropostaLinha,
  PropostaResumo,
  PropostaRevisao,
} from "@/propostas/domain";

type PropostaRow = {
  id: string;
  codigo: string;
  obra_id: string | null;
  cliente_nome: string;
  cliente_contacto: string | null;
  cliente_email: string | null;
  obra_nome: string | null;
  obra_morada: string | null;
  referencia_interna: string | null;
  notas: string | null;
  estado_atual: string;
  created_at: string;
  updated_at: string;
};

type RevisaoRow = {
  id: string;
  proposta_id: string;
  numero_revisao: number;
  estado: string;
  data_proposta: string | null;
  validade_texto: string | null;
  total: string | number | null;
  created_at: string;
  updated_at: string;
};

type LinhaRow = {
  id: string;
  revisao_id: string;
  ordem: number;
  origem: string;
  artigo_id: string | null;
  codigo_artigo: string | null;
  descricao: string;
  unidade: string | null;
  quantidade: string | number | null;
  preco_unitario: string | number | null;
  total_linha: string | number | null;
};

export async function loadPropostasResumo(): Promise<PropostaResumo[]> {
  const client = await pool.connect();
  try {
    const result: QueryResult<{
      id: string;
      codigo: string;
      cliente_nome: string;
      obra_nome: string | null;
      estado_atual: string;
      created_at: string;
      numero_revisao: number;
      total: string | number | null;
    }> = await client.query(
      `
        select
          p.id,
          p.codigo,
          p.cliente_nome,
          p.obra_nome,
          p.estado_atual,
          p.created_at,
          r.numero_revisao,
          r.total
        from propostas p
        left join lateral (
          select numero_revisao, total
          from proposta_revisoes
          where proposta_id = p.id
          order by numero_revisao desc
          limit 1
        ) r on true
        order by p.created_at desc
      `,
    );

    return result.rows.map((row) => ({
      id: row.id,
      codigo: row.codigo,
      clienteNome: row.cliente_nome,
      obraNome: row.obra_nome ?? undefined,
      revisaoAtual: row.numero_revisao ?? 1,
      estadoAtual: (row.estado_atual as PropostaEstado) ?? "RASCUNHO",
      dataCriacao: row.created_at,
      totalAtual: Number(row.total ?? 0),
    }));
  } finally {
    client.release();
  }
}

export async function loadPropostaCompleta(
  id: string,
): Promise<Proposta | null> {
  const client = await pool.connect();
  try {
    const propostaRes: QueryResult<PropostaRow> = await client.query(
      `
        select
          id,
          codigo,
          obra_id,
          cliente_nome,
          cliente_contacto,
          cliente_email,
          obra_nome,
          obra_morada,
          referencia_interna,
          notas,
          estado_atual,
          created_at,
          updated_at
        from propostas
        where id = $1
      `,
      [id],
    );

    if (propostaRes.rowCount === 0) {
      return null;
    }

    const propostaRow = propostaRes.rows[0];

    const revisoesRes: QueryResult<RevisaoRow> = await client.query(
      `
        select
          id,
          proposta_id,
          numero_revisao,
          estado,
          data_proposta,
          validade_texto,
          total,
          created_at,
          updated_at
        from proposta_revisoes
        where proposta_id = $1
        order by numero_revisao asc
      `,
      [id],
    );

    if (revisoesRes.rowCount === 0) {
      return null;
    }

    const revisaoIds = revisoesRes.rows.map((r) => r.id);

    const linhasRes: QueryResult<LinhaRow> = await client.query(
      `
        select
          id,
          revisao_id,
          ordem,
          origem,
          artigo_id,
          codigo_artigo,
          descricao,
          unidade,
          quantidade,
          preco_unitario,
          total_linha
        from proposta_linhas
        where revisao_id = any($1::uuid[])
        order by revisao_id, ordem, created_at
      `,
      [revisaoIds],
    );

    const linhasByRevisao = new Map<string, PropostaLinha[]>();
    for (const row of linhasRes.rows) {
      const linha: PropostaLinha = {
        id: row.id,
        artigoId: row.artigo_id,
        origem: row.origem as PropostaLinha["origem"],
        descricao: row.descricao,
        unidade: row.unidade ?? "",
        quantidade: Number(row.quantidade ?? 0),
        precoUnitario: Number(row.preco_unitario ?? 0),
        totalLinha: Number(row.total_linha ?? 0),
      };
      const list = linhasByRevisao.get(row.revisao_id) ?? [];
      list.push(linha);
      linhasByRevisao.set(row.revisao_id, list);
    }

    const revisoes: PropostaRevisao[] = revisoesRes.rows.map((row) => {
      const linhas = linhasByRevisao.get(row.id) ?? [];
      const folhaRosto: PropostaFolhaRosto = {
        clienteNome: propostaRow.cliente_nome,
        clienteContacto: propostaRow.cliente_contacto ?? undefined,
        clienteEmail: propostaRow.cliente_email ?? undefined,
        obraNome: propostaRow.obra_nome ?? undefined,
        obraMorada: propostaRow.obra_morada ?? undefined,
        dataProposta: row.data_proposta ?? propostaRow.created_at.slice(0, 10),
        validadeDias: undefined,
        validadeTexto: row.validade_texto ?? undefined,
        referenciaInterna: propostaRow.referencia_interna ?? undefined,
        notas: propostaRow.notas ?? undefined,
      };

      return {
        id: row.id,
        propostaId: row.proposta_id,
        numeroRevisao: row.numero_revisao,
        estado: row.estado as PropostaEstado,
        folhaRosto,
        linhas,
        total: Number(row.total ?? 0),
        criadoEm: row.created_at,
        atualizadoEm: row.updated_at,
      };
    });

    const revisaoAtual =
      revisoes.reduce((acc, r) =>
        r.numeroRevisao > acc.numeroRevisao ? r : acc,
      ) ?? revisoes[0];

    const proposta: Proposta = {
      id: propostaRow.id,
      codigo: propostaRow.codigo,
      estado: propostaRow.estado_atual as PropostaEstado,
      revisaoAtual,
      todasRevisoes: revisoes,
    };

    return proposta;
  } finally {
    client.release();
  }
}

export async function createPropostaWithRevisao(
  folhaRosto: PropostaFolhaRosto,
  linhas: PropostaLinha[],
): Promise<{ id: string }> {
  if (!folhaRosto.clienteNome || linhas.length === 0) {
    throw new Error("Cliente e pelo menos uma linha são obrigatórios");
  }

  const now = new Date().toISOString();
  const propostaId = randomUUID();
  const revisaoId = randomUUID();

  const total = linhas.reduce((sum, l) => sum + (l.totalLinha ?? 0), 0);

  const codigo =
    "P-" +
    new Date().getFullYear() +
    "-" +
    propostaId.slice(0, 4).toUpperCase();

  await withTransaction(async (client) => {
    await client.query(
      `
        insert into propostas (
          id,
          codigo,
          obra_id,
          cliente_nome,
          cliente_contacto,
          cliente_email,
          obra_nome,
          obra_morada,
          referencia_interna,
          notas,
          estado_atual,
          created_at,
          updated_at
        )
        values ($1, $2, null, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
      `,
      [
        propostaId,
        codigo,
        folhaRosto.clienteNome,
        folhaRosto.clienteContacto ?? null,
        folhaRosto.clienteEmail ?? null,
        folhaRosto.obraNome ?? null,
        folhaRosto.obraMorada ?? null,
        folhaRosto.referenciaInterna ?? null,
        folhaRosto.notas ?? null,
        "RASCUNHO",
        now,
      ],
    );

    await client.query(
      `
        insert into proposta_revisoes (
          id,
          proposta_id,
          numero_revisao,
          estado,
          data_proposta,
          validade_texto,
          total,
          created_at,
          updated_at
        )
        values ($1, $2, 1, $3, $4, $5, $6, $7, $7)
      `,
      [
        revisaoId,
        propostaId,
        "RASCUNHO",
        folhaRosto.dataProposta || null,
        folhaRosto.validadeTexto ??
          (folhaRosto.validadeDias
            ? `${folhaRosto.validadeDias} dias`
            : null),
        total,
        now,
      ],
    );

    let ordem = 1;
    for (const linha of linhas) {
      const linhaId = randomUUID();
      await client.query(
        `
          insert into proposta_linhas (
            id,
            revisao_id,
            ordem,
            origem,
            artigo_id,
            codigo_artigo,
            descricao,
            unidade,
            quantidade,
            preco_unitario,
            total_linha,
            created_at,
            updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12)
        `,
        [
          linhaId,
          revisaoId,
          ordem++,
          linha.origem,
          null,
          linha.artigoId ?? null,
          linha.descricao,
          linha.unidade || null,
          linha.quantidade,
          linha.precoUnitario,
          linha.totalLinha,
          now,
        ],
      );
    }
  });

  return { id: propostaId };
}

