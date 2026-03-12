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
  total_custo: string | number | null;
  total_venda: string | number | null;
  margem_valor: string | number | null;
  margem_percentagem: string | number | null;
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
  preco_custo_unitario: string | number | null;
  total_custo_linha: string | number | null;
  preco_venda_unitario: string | number | null;
  total_venda_linha: string | number | null;
  grande_capitulo: string | null;
  capitulo: string | null;
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
      total_venda: string | number | null;
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
          r.total_venda
        from propostas p
        left join lateral (
          select numero_revisao, total_venda
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
      totalAtual: Number(row.total_venda ?? 0),
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
          total_linha,
          preco_custo_unitario,
          total_custo_linha,
          preco_venda_unitario,
          total_venda_linha,
          grande_capitulo,
          capitulo
        from proposta_linhas
        where revisao_id = any($1::uuid[])
        order by revisao_id, ordem, created_at
      `,
      [revisaoIds],
    );

    const linhasByRevisao = new Map<string, PropostaLinha[]>();
    for (const row of linhasRes.rows) {
      const quantidade = Number(row.quantidade ?? 0);
      const precoCusto = Number(row.preco_custo_unitario ?? 0);
      const precoVenda = Number(
        row.preco_venda_unitario ?? row.preco_unitario ?? 0,
      );
      const totalCusto =
        row.total_custo_linha !== null && row.total_custo_linha !== undefined
          ? Number(row.total_custo_linha)
          : quantidade * precoCusto;
      const totalVenda =
        row.total_venda_linha !== null && row.total_venda_linha !== undefined
          ? Number(row.total_venda_linha)
          : Number(row.total_linha ?? quantidade * precoVenda);

      const linha: PropostaLinha = {
        id: row.id,
        artigoId: row.artigo_id,
        origem: row.origem as PropostaLinha["origem"],
        descricao: row.descricao,
        unidade: row.unidade ?? "",
        grandeCapitulo: row.grande_capitulo ?? "",
        capitulo: row.capitulo ?? "",
        quantidade,
        precoCustoUnitario: precoCusto,
        totalCustoLinha: totalCusto,
        precoVendaUnitario: precoVenda,
        totalVendaLinha: totalVenda,
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
        totalCusto: Number(
          row.total_custo ??
            linhas.reduce((sum, l) => sum + l.totalCustoLinha, 0),
        ),
        totalVenda: Number(
          row.total_venda ??
            linhas.reduce((sum, l) => sum + l.totalVendaLinha, 0),
        ),
        margemValor: Number(
          row.margem_valor ??
            (Number(row.total_venda ?? 0) - Number(row.total_custo ?? 0)),
        ),
        margemPercentagem: Number(
          row.margem_percentagem ??
            (Number(row.total_venda ?? 0) > 0
              ? ((Number(row.total_venda ?? 0) -
                  Number(row.total_custo ?? 0)) /
                  Number(row.total_venda ?? 0)) *
                100
              : 0),
        ),
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

  const linhasEnriquecidas = linhas.map((linha) => {
    const quantidade = linha.quantidade ?? 0;
    const precoCusto = linha.precoCustoUnitario ?? 0;
    const precoVenda = linha.precoVendaUnitario ?? 0;
    const totalCusto = quantidade * precoCusto;
    const totalVenda = quantidade * precoVenda;
    return {
      ...linha,
      quantidade,
      precoCustoUnitario: precoCusto,
      precoVendaUnitario: precoVenda,
      totalCustoLinha: totalCusto,
      totalVendaLinha: totalVenda,
    };
  });

  const totalCusto = linhasEnriquecidas.reduce(
    (sum, l) => sum + l.totalCustoLinha,
    0,
  );
  const totalVenda = linhasEnriquecidas.reduce(
    (sum, l) => sum + l.totalVendaLinha,
    0,
  );
  const margemValor = totalVenda - totalCusto;
  const margemPercentagem = totalVenda > 0 ? (margemValor / totalVenda) * 100 : 0;

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
          total_custo,
          total_venda,
          margem_valor,
          margem_percentagem,
          created_at,
          updated_at
        )
        values ($1, $2, 1, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
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
        totalVenda,
        totalCusto,
        totalVenda,
        margemValor,
        margemPercentagem,
        now,
      ],
    );

    let ordem = 1;
    for (const linha of linhasEnriquecidas) {
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
            preco_custo_unitario,
            total_custo_linha,
            preco_venda_unitario,
            total_venda_linha,
            grande_capitulo,
            capitulo,
            created_at,
            updated_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
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
          linha.precoVendaUnitario,
          linha.totalVendaLinha,
          linha.precoCustoUnitario,
          linha.totalCustoLinha,
          linha.precoVendaUnitario,
          linha.totalVendaLinha,
          linha.grandeCapitulo ?? null,
          linha.capitulo ?? null,
          now,
          now,
        ],
      );
    }
  });

  return { id: propostaId };
}

