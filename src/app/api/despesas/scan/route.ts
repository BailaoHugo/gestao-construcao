import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const maxDuration = 30;

const PROMPT = `Analisa esta imagem de recibo ou fatura e extrai os dados.
Responde APENAS com JSON valido, sem markdown:
{
  "fornecedor": "nome da empresa",
  "nif": "NIF do fornecedor ou null",
  "data": "YYYY-MM-DD ou null",
  "valor_total": numero com IVA ou null,
  "valor_sem_iva": numero sem IVA ou null,
  "iva": percentagem ex 23 ou null,
  "descricao": "descricao resumida do que foi comprado",
  "categoria": "Material de obra | Ferramentas | Combustivel | Alimentacao | Subcontratacao | Transporte | Outros"
}
Se nao conseguires ler um campo coloca null.`;

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY nao configurada' }, { status: 500 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Multipart invalido' }, { status: 400 });
  }

  const file = form.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Campo file em falta' }, { status: 400 });
  }
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: 'Ficheiro demasiado grande (max 20MB)' }, { status: 413 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const base64 = buf.toString('base64');
  const mimeType = file.type || 'image/jpeg';

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' } },
          { type: 'text', text: PROMPT },
        ],
      }],
      max_tokens: 600,
    });

    const text = response.choices[0]?.message?.content?.trim() || '';
    let extracted: Record<string, unknown> = {};
    try {
      const clean = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
      extracted = JSON.parse(clean);
    } catch {
      return NextResponse.json({ error: 'Nao foi possivel extrair dados da imagem', raw: text }, { status: 422 });
    }

    return NextResponse.json({ ok: true, ...extracted });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/despesas/scan]', msg);
    return NextResponse.json({ error: 'Erro ao chamar IA' }, { status: 500 });
  }
}
