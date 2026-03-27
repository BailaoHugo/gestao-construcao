import { NextResponse } from 'next/server';
import { ImapFlow } from 'imapflow';
import { Pool } from 'pg';
import type { DadosExtraidos } from '@/controlo-obra/domain';

export const runtime = 'nodejs';
export const maxDuration = 60;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function extrairDadosComClaude(base64: string, mediaType: string): Promise<DadosExtraidos> {
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
          { type: 'text', text: `Analisa esta fatura e extrai os dados no formato JSON exato abaixo. Responde APENAS com JSON válido, sem markdown ou texto adicional:\n{"fornecedorNome":"...","fornecedorNif":"...","faturaNumero":"...","faturaData":"YYYY-MM-DD","linhas":[{"descricao":"...","quantidade":1,"precoUnitario":0.00,"total":0.00}],"subtotal":0.00,"iva":0.00,"total":0.00,"observacoes":"..."}` },
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
  // Verify Vercel cron secret
  const auth = req.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const host = process.env.IMAP_HOST;
  const port = Number(process.env.IMAP_PORT ?? 993);
  const user = process.env.IMAP_USER;
  const pass = process.env.IMAP_PASS;
  const folder = process.env.IMAP_FOLDER ?? 'INBOX';

  if (!host || !user || !pass) {
    return NextResponse.json({ error: 'IMAP environment variables not configured' }, { status: 503 });
  }

  const client = new ImapFlow({
    host,
    port,
    secure: port === 993,
    auth: { user, pass },
    logger: false,
  });

  const results: { uid: string; status: string; error?: string }[] = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);
    try {
      // Fetch emails with attachments not yet processed
      const { rows: processed } = await pool.query(
        `SELECT email_uid FROM faturas_recebidas WHERE email_uid IS NOT NULL`,
      );
      const processedUids = new Set(processed.map((r: { email_uid: string }) => r.email_uid));

      for await (const msg of client.fetch('1:*', {
        uid: true,
        envelope: true,
        bodyStructure: true,
      })) {
        const uid = String(msg.uid);
        if (processedUids.has(uid)) continue;

        // Find PDF/image attachments
        const attachments: { section: string; filename: string; type: string }[] = [];
        function scanParts(part: Record<string, unknown>, section = '1') {
          if (part.disposition === 'attachment' || part.filename) {
            const type = String(part.type ?? '').toLowerCase();
            const subtype = String(part.subtype ?? '').toLowerCase();
            const mime = `${type}/${subtype}`;
            if (mime === 'application/pdf' || type === 'image') {
              attachments.push({ section, filename: String(part.filename ?? `attachment.${subtype}`), type: mime });
            }
          }
          if (Array.isArray(part.childNodes)) {
            (part.childNodes as Record<string, unknown>[]).forEach((child, i) =>
              scanParts(child, `${section}.${i + 1}`),
            );
          }
        }
        if (msg.bodyStructure) scanParts(msg.bodyStructure as Record<string, unknown>);
        if (!attachments.length) continue;

        for (const att of attachments) {
          const download = await client.download(String(msg.seq), att.section);
          const chunks: Buffer[] = [];
          for await (const chunk of download.content) chunks.push(chunk as Buffer);
          const base64 = Buffer.concat(chunks).toString('base64');

          const envelope = msg.envelope as { subject?: string; from?: { address?: string }[]; date?: Date } | undefined;
          const { rows } = await pool.query(
            `INSERT INTO faturas_recebidas
               (origem, estado, ficheiro_nome, ficheiro_tipo,
                email_uid, email_remetente, email_assunto, email_data)
             VALUES ('email','processando',$1,$2,$3,$4,$5,$6) RETURNING id`,
            [
              att.filename, att.type, uid,
              envelope?.from?.[0]?.address ?? null,
              envelope?.subject ?? null,
              envelope?.date ?? null,
            ],
          );
          const faturaId: string = rows[0].id;

          let dadosExtraidos: DadosExtraidos | null = null;
          let erroProcessamento: string | null = null;
          try {
            dadosExtraidos = await extrairDadosComClaude(base64, att.type);
          } catch (e) {
            erroProcessamento = String(e);
          }

          await pool.query(
            `UPDATE faturas_recebidas
             SET dados_extraidos=$1, estado=$2, processado_em=now(), erro_processamento=$3
             WHERE id=$4`,
            [
              dadosExtraidos ? JSON.stringify(dadosExtraidos) : null,
              erroProcessamento ? 'pendente' : 'revisto',
              erroProcessamento,
              faturaId,
            ],
          );

          results.push({ uid, status: erroProcessamento ? 'error' : 'ok', error: erroProcessamento ?? undefined });
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  return NextResponse.json({ processed: results.length, results });
}
