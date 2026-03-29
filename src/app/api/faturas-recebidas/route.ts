import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { loadFaturasRecebidas } from '@/controlo-obra/db';
import type { FaturaRecebidaEstado, DadosExtraidos } from '@/controlo-obra/domain';

export const runtime = 'nodejs';
export const maxDuration = 60;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function extrairDadosComClaude(base64: string, mediaType: string): Promise<DadosExtraidos> {
  const isImage = mediaType.startsWith('image/');
  const contentBlock = isImage
    ? { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } }
    : { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } };

  const prompt = `Analisa esta fatura/recibo em português e extrai os dados no formato JSON exato abaixo.
Responde APENAS com JSON válido, sem markdown ou texto adicional.
Para tipoCusto escolhe o mais adequado: "material" (materiais/produtos), "subempreitada" (serviços externos/subempreiteiro), "mao_de_obra" (mão de obra direta), "equipamento" (aluguer ou compra de equipamento).
Extrai TODAS as linhas/artigos presentes, com quantidades, preços unitários e totais.

{
  "fornecedorNome": "nome da empresa emissora",
  "fornecedorNif": "NIF sem espaços",
  "faturaNumero": "número da fatura",
  "faturaData": "YYYY-MM-DD",
  "tipoCusto": "material|subempreitada|mao_de_obra|equipamento",
  "linhas": [
    {
      "descricao": "descrição do artigo ou serviço",
      "quantidade": 1,
      "unidade": "un|m|m2|m3|kg|h|dia|vlg",
      "precoUnitario": 0.00,
      "desconto": 0.00,
      "taxaIva": 23,
      "total": 0.00
    }
  ],
  "subtotal": 0.00,
  "iva": 0.00,
  "total": 0.00,
  "observacoes": "qualquer nota relevante"
}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          contentBlock,
          { type: 'text', text: prompt },
        ],
      }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const text: string = data.content?.[0]?.text ?? '{}';
  const clean = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  return JSON.parse(clean) as DadosExtraidos;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const estado = searchParams.get('estado') as FaturaRecebidaEstado | null;
    const data = await loadFaturasRecebidas(estado ?? undefined);
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao carregar faturas' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      fileBase64: string;
      mediaType: string;
      fileName: string;
      contratoId?: string;
    };

    const { fileBase64, mediaType, fileName, contratoId } = body;
    if (!fileBase64 || !mediaType) {
      return NextResponse.json({ error: 'fileBase64 e mediaType são obrigatórios' }, { status: 400 });
    }

    // 1. Criar registo inicial
    const { rows: [fatura] } = await pool.query(
      `INSERT INTO faturas_recebidas (origem, estado, ficheiro_nome, ficheiro_tipo, contrato_id)
       VALUES ('upload', 'processando', $1, $2, $3)
       RETURNING id`,
      [fileName ?? 'upload', mediaType, contratoId ?? null],
    );

    // 2. Processar com Claude Vision
    let dadosExtraidos: DadosExtraidos | null = null;
    let erroProcessamento: string | null = null;

    try {
      dadosExtraidos = await extrairDadosComClaude(fileBase64, mediaType);
    } catch (e) {
      erroProcessamento = String(e);
    }

    // 3. Actualizar registo com resultado
    await pool.query(
      `UPDATE faturas_recebidas
       SET dados_extraidos = $1,
           estado = $2,
           processado_em = now(),
           erro_processamento = $3
       WHERE id = $4`,
      [
        dadosExtraidos ? JSON.stringify(dadosExtraidos) : null,
        erroProcessamento ? 'pendente' : 'revisto',
        erroProcessamento,
        fatura.id,
      ],
    );

    if (erroProcessamento) {
      return NextResponse.json({ id: fatura.id, error: erroProcessamento }, { status: 422 });
    }

    return NextResponse.json({ id: fatura.id, dadosExtraidos }, { status: 201 });
  } catch (err) {
    console.error('[api/faturas-recebidas POST]', err);
    return NextResponse.json({ error: 'Erro ao processar fatura' }, { status: 500 });
  }
}
