import { NextResponse } from "next/server";
import OpenAI from "openai";

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

    const systemPrompt = `
És um assistente de orçamentação de construção civil em Portugal.

Recebes uma descrição de trabalhos e tens de devolver linhas de orçamento.

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
