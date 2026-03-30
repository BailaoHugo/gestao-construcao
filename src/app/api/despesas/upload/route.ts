import { put } from '@vercel/blob';
import { Resend } from 'resend';
import { Pool } from 'pg';
import { NextRequest, NextResponse } from 'next/server';
import { migrateDespesas } from '@/lib/toconline';

export const dynamic = 'force-dynamic';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const form   = await req.formData();
    const file   = form.get('file')          as File   | null;
    const centro = (form.get('centro_custo') as string) || '';
    const fornec = (form.get('fornecedor')   as string) || '';
    const valor  = (form.get('valor')        as string) || '';
    const data   = (form.get('data')         as string) || new Date().toISOString().slice(0, 10);

    if (!file) return NextResponse.json({ error: 'Ficheiro obrigatorio' }, { status: 400 });

    await migrateDespesas();

    const blob = await put('despesas/' + Date.now() + '-' + file.name, file, { access: 'public' });

    await pool.query(
      'INSERT INTO despesas (document_type,status,date,gross_total,supplier_nome,arquivo_url,arquivo_nome,centro_custo,origem,synced_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,' + "'manual'" + ',now())',
      ['DSP', 2, data, valor ? parseFloat(valor) : null, fornec || null, blob.url, file.name, centro || null],
    );

    const subject = centro ? 'Fatura ' + (fornec || 'Manual') + ' - ' + centro : 'Fatura ' + (fornec || 'Manual');
    const fileBase64 = Buffer.from(await file.arrayBuffer()).toString('base64');

    await resend.emails.send({
      from: 'gestao@ennova.pt',
      to:   '515188166@my.toconline.pt',
      subject,
      html: '<p>Fatura enviada via sistema de gestao Ennova.</p><p><b>Fornecedor:</b> ' + (fornec || 'N/D') + '</p><p><b>Centro de Custo:</b> ' + (centro || 'N/D') + '</p><p><b>Valor:</b> ' + (valor ? valor + ' EUR' : 'N/D') + '</p><p><b>Data:</b> ' + data + '</p>',
      attachments: [{ filename: file.name, content: fileBase64 }],
    });

    return NextResponse.json({ ok: true, url: blob.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/despesas/upload]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
