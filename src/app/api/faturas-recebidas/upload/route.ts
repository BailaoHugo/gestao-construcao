import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import type { DadosExtraidos } from '@/controlo-obra/domain';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function extrairDadosComClaude(
  base64: string,
  mediaType: string,
): Promise<DadosExtraidos> {
  const isImage = mediaType.startsWith('image/');
  const contentBlock = isImage
    ? { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } }
    : { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } };

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          contentBlock,
          {
            type: 'text',
            text: `Analisa esta fatura e extrai os dados no formato JSON exato abaixo. Responde APENAS com JSON válido, sem markdown ou texto adicional:
{"fornecedorNome":"...","fornecedorNif":"...","faturaNumero":"...","faturaData":"YYYY-MM-DD","linhas":[{"descricao":"...","quantidade":1,"precoUnitario":0.00,"total":0.00}],"subtotal":0.00,"iva":0.00,"total":0.00,"observacoes":"..."}`,
          },
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

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const contratoId = (form.get('contratoId') as string | null) || null;

    if (!file) {
      return NextResponse.json({ error: 'Campo "file" obrigatório' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mediaType = file.type || 'application/pdf';

    // Create initial record with estado='processando'
    const { rows } = await pool.query(
      `INSERT INTO faturas_recebidas (contrato_id, origem, estado, ficheiro_nome, ficheiro_tipo)
       VALUES ($1, 'upload', 'processando', $2, $3)
       RETURNING id`,
      [contratoId, file.name, mediaType],
    );
    const faturaId: string = rows[0].id;

    // Extract data with Claude Vision
    let dadosExtraidos: DadosExtraidos | null = null;
    let erroProcessamento: string | null = null;
    try {
      dadosExtraidos = await extrairDadosComClaude(base64, mediaType);
    } catch (e) {
      erroProcessamento = String(e);
    }

    // Update record with results
    await pool.query(
      `UPDATE faturas_recebidas
       SET dados_extraidos = $1, estado = $2, processado_em = now(), erro_processamento = $3
       WHERE id = $4`,
      [
        dadosExtraidos ? JSON.stringify(dadosExtraidos) : null,
        erroProcessamento ? 'pendente' : 'revisto',
        erroProcessamento,
        faturaId,
      ],
    );

    const { rows: fr } = await pool.query(
      `SELECT id, contrato_id AS "contratoId", fornecedor_id AS "fornecedorId",
              origem, estado, ficheiro_url AS "ficheiroUrl",
              ficheiro_nome AS "ficheiroNome", ficheiro_tipo AS "ficheiroTipo",
              dados_extraidos AS "dadosExtraidos",
              processado_em AS "processadoEm",
              erro_processamento AS "erroProcessamento",
              notas, criado_em AS "criadoEm"
       FROM faturas_recebidas WHERE id = $1`,
      [faturaId],
    );
    return NextResponse.json(fr[0], { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
