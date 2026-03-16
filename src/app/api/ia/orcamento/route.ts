import { NextResponse } from "next/server";
import OpenAI from "openai";
import { pool } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { descricao } = await req.json();

    if (!descricao || typeof descricao !== "string" || !descricao.trim()) {
      return NextResponse.json(
        { error: "Descrição inválida" },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY não configurada" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const like = `%${descricao.trim()}%`;

    let catalogoBloco = "ARTIGOS EXISTENTES NO CATÁLOGO:\n";

    try {
      const { rows } = await pool.query<{
        codigo: string;
        descricao: string;
        unidade: string | null;
        capitulo: string | null;
        pu_custo: number | string | null;
        pu_venda: number | string | null;
      }>(
        `
        select
          codigo,
          descricao,
          unidade,
          capitulo,
          pu_custo,
          pu_venda
        from artigos
        where ativo = true
          and (
            codigo ilike $1
            or descricao ilike $1
          )
        order by codigo asc
        limit 10
        `,
        [like],
      );

      if (!rows || rows.length === 0) {
        catalogoBloco += "- Nenhum artigo relevante encontrado.\n";
      } else {
        for (const row of rows) {
          const puCusto =
            row.pu_custo === null || row.pu_custo === undefined
              ? "—"
              : String(row.pu_custo);
          const puVenda =
            row.pu_venda === null || row.pu_venda === undefined
              ? "—"
              : String(row.pu_venda);

          catalogoBloco += `- ${row.codigo} | ${row.descricao} | un: ${
            row.unidade ?? "—"
          } | cap: ${row.capitulo ?? "—"} | pu_custo: ${puCusto} | pu_venda: ${puVenda}\n`;
        }
      }
    } catch (err) {
      console.error("[api/ia/orcamento] catálogo lookup failed:", err);
      catalogoBloco += "- Nenhum artigo relevante encontrado.\n";
    }

    const systemPrompt = `
És um assistente de orçamentação de construção civil em Portugal.

Recebes uma descrição de trabalhos e tens de devolver linhas de orçamento.

Tens acesso a uma lista de artigos existentes no catálogo. Sempre que for adequado, deves PREFERIR reutilizar e adaptar estes artigos em vez de inventar linhas totalmente novas. Só deves criar uma linha genérica quando não existir nenhum artigo de catálogo suficientemente parecido.

${catalogoBloco}

Cada linha deve ter exatamente 8 colunas separadas por ;

Formato obrigatório:
CAPÍTULO;LISTAGEM DE TRABALHOS;UN.;QTD.;UNITÁRIO VENDA;TOTAL VENDA;UNITÁRIO CUSTO;TOTAL CUSTO

Regras:
- Não devolver cabeçalho
- Não devolver texto antes ou depois
- Não usar markdown
- Usar vírgula decimal
- Usar capítulos plausíveis
- Gerar entre 2 e 6 linhas
`;

    const response = await openai.responses.create({
      model: "gpt-4.1",
      input: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: descricao,
        },
      ],
    });

    const texto = response.output_text?.trim() || "";

    if (!texto) {
      return NextResponse.json(
        { error: "Falha ao gerar linhas com IA" },
        { status: 500 }
      );
    }

    const linhas = texto
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    return NextResponse.json({ linhas });
  } catch (err) {
    console.error("IA erro:", err);

    return NextResponse.json(
      { error: "Erro ao gerar linhas com IA" },
      { status: 500 }
    );
  }
}
