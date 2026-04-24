import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { Resend } from 'resend';


// Gerar nome de ficheiro estruturado: YYYYMMDD_CC_FORNECEDOR_REF.ext
function generateFileName(date: string, ccCode: string, fornecedor: string | null, ref: string | null, originalUrl: string | null): string {
  const d = (date || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
  const cc = (ccCode || 'GERAL').replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 20);
  const forn = (fornecedor || 'DESCONHECIDO').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').substring(0, 20).toUpperCase();
  const refClean = (ref || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').substring(0, 20).toUpperCase();
  const ext = originalUrl ? (originalUrl.split('?')[0].split('.').pop() || 'jpg').toLowerCase() : 'jpg';
  const parts = [d, cc, forn, refClean].filter(Boolean);
  return parts.join('_') + '.' + ext;
}

const CATEGORIA_TO_TIPO: Record<string, string> = {
  'Material de obra':       'materiais',
  'Ferramentas':            'equipamentos',
  'Subempreitada':          'subempreitada',
  'Subcontratacao':         'subempreitada',
  'Prestação de serviços':  'mao_de_obra',
  'Combustivel':            'outros',
  'Alimentacao':            'outros',
  'Transporte':             'outros',
  'Outros':                 'outros',
};

interface ScanLinha {
  descricao: string;
  quantidade: number | null;
  unidade: string | null;
  preco_unitario: number | null;
  desconto_pct: number | null;
  total: number | null;
}

async function sendToconlineEmail(params: {
  centroCustoId: string | null;
  fornecedor: string | null;
  documentoRef: string | null;
  descricao: string;
  valor: number;
  data: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.TOCONLINE_FROM_EMAIL;
  const tocEmail = process.env.TOCONLINE_EMAIL ?? '515188166@my.toconline.pt';

  if (!apiKey || !fromEmail) {
    console.warn('[toc-email] RESEND_API_KEY or TOCONLINE_FROM_EMAIL not set — skipping');
    return false;
  }

  // TOConline rejeita emails sem anexo - so enviar se houver documento
  if (!params.documentoRef) {
    console.warn('[toc-email] Sem documento em anexo - a saltar envio para TOConline');
    return false;
  }

  try {
    // Get centro custo code
    let ccCode = '';
    if (params.centroCustoId) {
      const { rows } = await pool.query('SELECT code FROM obras WHERE id = $1', [params.centroCustoId]);
      ccCode = rows[0]?.code ?? '';
    }

    const fornecedorUp = (params.fornecedor ?? '').toUpperCase();
    const subject = [ccCode, fornecedorUp].filter(Boolean).join(' - ') || params.descricao;

    const bodyHtml = `<p>${subject}</p><p>${params.descricao} — ${params.valor.toFixed(2)} € — ${params.data}</p>`;

    // Fetch document attachment if available
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attachments: any[] = [];
    if (params.documentoRef) {
      const token = process.env.BLOB_READ_WRITE_TOKEN;
      const resp = await fetch(params.documentoRef, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (resp.ok) {
        const buf = Buffer.from(await resp.arrayBuffer());
        const rawName = params.documentoRef.split('/').pop() ?? 'fatura';
        const cleanName = rawName.split('?')[0];
        attachments.push({ filename: cleanName, content: buf });
      } else {
        console.warn('[toc-email] Could not fetch blob:', resp.status);
      }
    }

    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: fromEmail,
      to: tocEmail,
      subject,
      html: bodyHtml,
      attachments,
    });

    if (result.error) {
      console.error('[toc-email] Resend error:', result.error);
      return false;
    }

    console.log('[toc-email] Sent OK, id:', result.data?.id);
    return true;
  } catch (e) {
    console.error('[toc-email] Exception:', e);
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      fornecedor, nif, nif_comprador, data, valor_total, valor_sem_iva, iva,
      descricao, categoria, centro_custo_id, notas, documento_ref,
      numero_fatura, qr_atcud, linhas,
      forcar,
    } = body;

    const tipo = CATEGORIA_TO_TIPO[categoria] ?? 'outros';
    const valor = valor_total ?? valor_sem_iva ?? null;

    if (!descricao || !valor) {
      return NextResponse.json({ error: 'descricao e valor sao obrigatorios' }, { status: 400 });
    }

    // Duplicate check: same numero_fatura already in DB
    if (numero_fatura && !forcar) {
      const { rows: dup } = await pool.query(
        `SELECT id, fornecedor, data_despesa::text AS data_despesa, valor
           FROM despesas
          WHERE numero_fatura = $1
          LIMIT 1`,
        [numero_fatura]
      );
      if (dup.length > 0) {
        return NextResponse.json(
          { duplicate: true, existing: dup[0] },
          { status: 409 }
        );
      }
    }

    const notasCompletas = [
      notas,
      nif        ? `NIF: ${nif}` : null,
      nif_comprador ? `NIF Comp.: ${nif_comprador}` : null,
      iva        ? `IVA: ${iva}%` : null,
      valor_sem_iva ? `s/IVA: ${valor_sem_iva}€` : null,
      qr_atcud   ? `ATCUD: ${String(qr_atcud).substring(0, 40)}` : null,
    ].filter(Boolean).join(' | ') || null;

    const valorIva = (iva != null && valor_sem_iva != null)
      ? Math.round(valor_sem_iva * (iva / 100) * 100) / 100
      : null;

    const client = await pool.connect();
    let despesaId: number;
    try {
      await client.query('BEGIN');

      // Lookup centro de custo para nome estruturado de ficheiro
      let ccCode = '';
      let ccNome = '';
      if (centro_custo_id) {
        const ccRows = await client.query(
          'SELECT code, name FROM obras WHERE id = $1',
          [centro_custo_id]
        );
        ccCode = ccRows.rows[0]?.code ?? '';
        ccNome = ccRows.rows[0]?.name ?? '';
      }
      const nomeFicheiro = generateFileName(
        data || new Date().toISOString().slice(0, 10),
        ccCode,
        fornecedor || null,
        numero_fatura || null,
        documento_ref || null
      );

      const { rows } = await client.query(
        `INSERT INTO despesas
          (data_despesa, descricao, tipo, valor, centro_custo_id, fornecedor, notas, documento_ref,
           numero_fatura, valor_sem_iva, valor_iva, valor_total_civa, nome_ficheiro, centro_custo_nome)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING id`,
        [
          data || new Date().toISOString().slice(0, 10),
          descricao, tipo, valor,
          centro_custo_id || null,
          fornecedor || null,
          notasCompletas,
          documento_ref || null,
          numero_fatura || null,
          valor_sem_iva != null ? valor_sem_iva : null,
          valorIva,
          valor_total || null,
          nomeFicheiro,
          ccNome || null,
        ]
      );

      despesaId = rows[0].id;

      if (Array.isArray(linhas) && linhas.length > 0) {
        for (const l of linhas as ScanLinha[]) {
          await client.query(
            `INSERT INTO despesa_linhas
              (despesa_id, descricao, quantidade, unidade, preco_unit_sem_iva, taxa_iva, desconto_pct, total_sem_iva)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [
              despesaId,
              l.descricao,
              l.quantidade ?? 1,
              l.unidade ?? 'un',
              l.preco_unitario ?? 0,
              iva ?? 23,
              l.desconto_pct ?? 0,
              l.total ?? 0,
            ]
          );
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // Send to TOConline via email (non-blocking — never fails the save)
    const tocSent = await sendToconlineEmail({
      centroCustoId: centro_custo_id || null,
      fornecedor: fornecedor || null,
      documentoRef: documento_ref || null,
      descricao,
      valor,
      data: data || new Date().toISOString().slice(0, 10),
    });

    return NextResponse.json({ ok: true, id: despesaId, toc_sent: tocSent });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/despesas/registar]', msg);
    return NextResponse.json({ error: 'Erro ao guardar despesa' }, { status: 500 });
  }
}
