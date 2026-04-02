import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Polyfill DOMMatrix at module level so it is set before pdfjs is ever imported
/* eslint-disable @typescript-eslint/no-explicit-any */
if (typeof (globalThis as any).DOMMatrix === 'undefined') {
  (globalThis as any).DOMMatrix = class DOMMatrix {
    a=1; b=0; c=0; d=1; e=0; f=0;
    m11=1; m12=0; m13=0; m14=0;
    m21=0; m22=1; m23=0; m24=0;
    m31=0; m32=0; m33=1; m34=0;
    m41=0; m42=0; m43=0; m44=1;
    is2D=true; isIdentity=true;
    constructor(_init?: any) {}
    static fromMatrix(_o?: any) { return new (globalThis as any).DOMMatrix(); }
    multiply(_o?: any) { return this; }
    translate(_x=0, _y=0, _z=0) { return this; }
    scale(_x=1, _y=1) { return this; }
    rotate(_x=0, _y=0, _z=0) { return this; }
    inverse() { return this; }
    transformPoint(p?: any) { return p || { x: 0, y: 0, z: 0, w: 1 }; }
    toFloat32Array() { return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]); }
    toFloat64Array() { return new Float64Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]); }
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const PROMPT = `Analisa este recibo ou fatura e extrai os dados. Responde APENAS com JSON valido, sem markdown, com estes campos exatos: { "fornecedor": "nome da empresa", "nif": "NIF do fornecedor ou null", "data": "YYYY-MM-DD ou null", "valor_total": numero com IVA ou null, "valor_sem_iva": numero sem IVA ou null, "iva": percentagem ex 23 ou null, "descricao": "descricao resumida do que foi comprado", "categoria": "Material de obra | Ferramentas | Combustivel | Alimentacao | Subcontratacao | Transporte | Outros" } Se nao conseguires ler um campo coloca null.`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function extractPdfText(buf: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs') as any;
  pdfjsLib.GlobalWorkerOptions.workerSrc = '';
  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(buf),
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    text += tc.items.map((item: any) => item.str || '').join(' ') + '\n';
  }
  return text.trim();
}

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY nao configurada' }, { status: 500 });
  }
  let form: FormData;
  try { form = await req.formData(); }
  catch { return NextResponse.json({ error: 'Multipart invalido' }, { status: 400 }); }
  const file = form.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Campo file em falta' }, { status: 400 });
  }
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: 'Ficheiro demasiado grande (max 20MB)' }, { status: 413 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || 'image/jpeg';
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let inputContent: any[];

  if (mimeType === 'application/pdf') {
    let pdfText: string;
    try {
      pdfText = await extractPdfText(buf);
    } catch (e) {
      return NextResponse.json({ error: 'Erro ao processar PDF: ' + (e instanceof Error ? e.message : String(e)) }, { status: 422 });
    }
    if (!pdfText) {
      return NextResponse.json({ error: 'Nao foi possivel extrair texto do PDF' }, { status: 422 });
    }
    inputContent = [
      { type: 'input_text', text: `${PROMPT}\n\nTexto extraido do documento PDF:\n${pdfText}` },
    ];
  } else {
    const base64 = buf.toString('base64');
    inputContent = [
      { type: 'input_image', image_url: `data:${mimeType};base64,${base64}`, detail: 'auto' },
      { type: 'input_text', text: PROMPT },
    ];
  }

  try {
    const response = await openai.responses.create({
      model: 'gpt-4o',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      input: [{ role: 'user', content: inputContent }] as any,
    });
    const text = response.output_text?.trim() || '';
    let extracted: Record<string, unknown> = {};
    try {
      const clean = text.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
      extracted = JSON.parse(clean);
    } catch {
      return NextResponse.json({ error: 'Nao foi possivel extrair dados', raw: text }, { status: 422 });
    }
    return NextResponse.json({ ok: true, ...extracted });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/despesas/scan]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
