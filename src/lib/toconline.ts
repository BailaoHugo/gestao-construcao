import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 10000,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? undefined : { rejectUnauthorized: false },
});

// -- OAuth Token -----------------------------------------------------------------

let _tokenCache: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  if (_tokenCache && Date.now() < _tokenCache.expiresAt - 60_000) {
    return _tokenCache.token;
  }
  const staticToken = process.env.TOCONLINE_ACCESS_TOKEN;
  if (staticToken) {
    _tokenCache = { token: staticToken, expiresAt: Date.now() + 3600 * 1000 };
    return staticToken;
  }
  const clientId = process.env.TOCONLINE_CLIENT_ID;
  const secret = process.env.TOCONLINE_SECRET;
  const oauthUrl = process.env.TOCONLINE_OAUTH_URL;
  // Read refresh token: prefer DB (rotating tokens), fallback to env var
  const envRefreshToken = process.env.TOCONLINE_REFRESH_TOKEN;
  let refreshToken = envRefreshToken;
  let usedDbToken = false;
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS app_config (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
    const cfgRow = await pool.query(`SELECT value FROM app_config WHERE key = 'toconline_refresh_token'`);
    if (cfgRow.rows[0]?.value) { refreshToken = cfgRow.rows[0].value; usedDbToken = true; }
  } catch (_) {}
  if (!clientId || !secret || !oauthUrl) throw new Error('TOConline nao configurado');
  if (!refreshToken) throw new Error('TOConline: TOCONLINE_REFRESH_TOKEN nao definido');
  const credentials = Buffer.from(clientId + ':' + secret).toString('base64');
  const doRefresh = (token: string) => fetch(oauthUrl + '/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + credentials,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: token }).toString(),
  });
  let resp = await doRefresh(refreshToken);

        // Race-condition guard: se 401, esperar e re-ler DB (outra instância pode ter rotacionado o token)
        if (!resp.ok && resp.status === 401) {
          await new Promise(r => setTimeout(r, 700));
          try {
            const rr = await pool.query(
              `SELECT value FROM app_config WHERE key = 'toconline_refresh_token'`
            );
            const fresh = rr.rows[0]?.value;
            if (fresh && fresh !== refreshToken) {
              console.log('[toconline] token rotacionado por outra instância, a tentar...');
              refreshToken = fresh;
              resp = await doRefresh(fresh);
            }
          } catch (_) {}
        }
        // Se ainda 401, tentar env var como último recurso
        if (!resp.ok && resp.status === 401 && envRefreshToken && envRefreshToken !== refreshToken) {
          console.log('[toconline] token inválido, a usar env var como fallback...');
          try {
            await pool.query(`DELETE FROM app_config WHERE key = 'toconline_refresh_token'`);
          } catch (_) {}
          refreshToken = envRefreshToken;
          resp = await doRefresh(refreshToken);
        }
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error('TOConline refresh falhou: ' + resp.status + ' ' + text);
  }
  const data = await resp.json();
  _tokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  // Persist rotating refresh token so next cold start uses the new one
  if (data.refresh_token) {
    try {
      await pool.query(
        `INSERT INTO app_config (key, value) VALUES ('toconline_refresh_token', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [data.refresh_token]
      );
    } catch (_) {}
  }
  return _tokenCache.token;
}

// -- API Fetch -------------------------------------------------------------------

export async function tocFetch<T = unknown>(path: string): Promise<T> {
  const apiUrl = process.env.TOCONLINE_API_URL;
  if (!apiUrl) throw new Error('TOCONLINE_API_URL nao configurado');
  const token = await getAccessToken();
  const resp = await fetch(apiUrl + path, {
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error('TOConline API ' + resp.status + ': ' + text);
  }
  return resp.json();
}

// -- Normalize JSON:API ----------------------------------------------------------
// TOConline usa JSON:API: { data: [{ id, type, attributes: { ... } }] }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeItem(item: any): any {
  if (!item || typeof item !== 'object') return item;
  if (item.attributes && typeof item.attributes === 'object') {
    return { id: item.id, ...item.attributes };
  }
  return item;
}

// -- Tipos -----------------------------------------------------------------------

export interface TocFornecedor {
  id: string | number;
  business_name?: string;
  tax_registration_number?: string;
  name?: string;
  nome?: string;
  tax_id?: string;
  nif?: string;
  email?: string;
  phone?: string;
  active?: boolean;
  is_independent_worker?: boolean;
}

export interface TocCliente {
  id: string | number;
  business_name?: string;
  tax_registration_number?: string;
  name?: string;
  nome?: string;
  tax_id?: string;
  nif?: string;
  email?: string;
  phone?: string;
  active?: boolean;
}

export interface TocCentroCusto {
  id: string | number;
  code?: string;
  name?: string;
  nome?: string;
  active?: boolean;
}

function extractArray<T>(data: T[] | { data: T[] } | { items: T[] }): T[] {
  if (Array.isArray(data)) return data;
  if ('data' in data) return (data as { data: T[] }).data;
  if ('items' in data) return (data as { items: T[] }).items;
  return [];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveName(item: any): string {
  return item.business_name || item.nome || item.name || item.designation || item.designacao || 'Desconhecido';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveNif(item: any): string | null {
  return item.tax_registration_number ?? item.nif ?? item.tax_id ?? item.vat_number ?? null;
}

// -- Sync Fornecedores -----------------------------------------------------------

export async function syncFornecedores(): Promise<{ upserted: number }> {
  const raw = await tocFetch<unknown>('/suppliers');
  const items = extractArray<TocFornecedor>(raw as never).map(normalizeItem);
  console.log('[toconline] suppliers[0]:', JSON.stringify(items[0] ?? null));
  let upserted = 0;
  for (const item of items) {
    const tipo = item.is_independent_worker === true ? 'subempreiteiro' : 'fornecedor';
    await pool.query(
      `INSERT INTO fornecedores (toconline_id, nome, nif, email, telefone, ativo, tipo, toconline_synced_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now())
       ON CONFLICT (toconline_id) DO UPDATE SET
         nome = EXCLUDED.nome, nif = EXCLUDED.nif, email = EXCLUDED.email,
         telefone = EXCLUDED.telefone, ativo = EXCLUDED.ativo,
         tipo = CASE WHEN fornecedores.tipo = 'fornecedor' THEN EXCLUDED.tipo ELSE fornecedores.tipo END,
         toconline_synced_at = now(), atualizado_em = now()`,
      [String(item.id), resolveName(item), resolveNif(item), item.email ?? null, item.phone ?? null, item.active ?? true, tipo],
    );
    upserted++;
  }
  return { upserted };
}

// -- Sync Clientes ---------------------------------------------------------------

export async function syncClientes(): Promise<{ upserted: number }> {
  const raw = await tocFetch<unknown>('/customers');
  const items = extractArray<TocCliente>(raw as never).map(normalizeItem);
  console.log('[toconline] customers[0]:', JSON.stringify(items[0] ?? null));
  let upserted = 0;
  for (const item of items) {
    await pool.query(
      `INSERT INTO toconline_clientes (toconline_id, nome, nif, email, telefone, ativo, synced_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (toconline_id) DO UPDATE SET
         nome = EXCLUDED.nome, nif = EXCLUDED.nif, email = EXCLUDED.email,
         telefone = EXCLUDED.telefone, ativo = EXCLUDED.ativo, synced_at = now()`,
      [String(item.id), resolveName(item), resolveNif(item), item.email ?? null, item.phone ?? null, item.active ?? true],
    );
    upserted++;
  }
  return { upserted };
}

// -- Sync Centros de Custo -------------------------------------------------------

export async function syncCentrosCusto(): Promise<{ upserted: number; skipped?: boolean }> {
  try {
    const raw = await tocFetch<unknown>('/cost_centers');
    const items = extractArray<TocCentroCusto>(raw as never).map(normalizeItem);
    let upserted = 0;
    for (const item of items) {
      await pool.query(
        `INSERT INTO centros_custo (toconline_id, codigo, designacao, ativo, synced_at)
         VALUES ($1, $2, $3, $4, now())
         ON CONFLICT (toconline_id) DO UPDATE SET
           codigo = EXCLUDED.codigo, designacao = EXCLUDED.designacao,
           ativo = EXCLUDED.ativo, synced_at = now()`,
        [String(item.id), item.code ?? String(item.id), resolveName(item), item.active ?? true],
      );
      upserted++;
    }
    return { upserted };
  } catch (e) {
    const msg = (e as Error).message ?? '';
    if (msg.includes('404') || msg.includes('FORBIDDEN') || msg.includes('403')) {
      console.log('[toconline] centros_custo nao disponivel neste scope, a ignorar');
      return { upserted: 0, skipped: true };
    }
    throw e;
  }
}

// -- Sync Completo ---------------------------------------------------------------

export type SyncResults = Record<string, { upserted: number; skipped?: boolean } | { error: string }>;

export async function runFullSync(): Promise<SyncResults> {
  const logId = (await pool.query(`INSERT INTO toconline_sync_log (estado) VALUES ('iniciado') RETURNING id`)).rows[0].id;
  const results: SyncResults = {};
  const tasks: [string, () => Promise<{ upserted: number; skipped?: boolean }>][] = [
    ['fornecedores', syncFornecedores],
    ['clientes', syncClientes],
    ['centros_custo', syncCentrosCusto],
  ];
  for (const [key, fn] of tasks) {
    try { results[key] = await fn(); }
    catch (e) { results[key] = { error: (e as Error).message }; }
  }
  const hasErrors = Object.values(results).some(r => 'error' in r);
  await pool.query(
    `UPDATE toconline_sync_log SET estado = $1, concluido_em = now(), resultado = $2 WHERE id = $3`,
    [hasErrors ? 'parcial' : 'ok', JSON.stringify(results), logId],
  );
  return results;
}


// -- Sync Despesas para tabela app (despesas) ----------------------------------
// Mapeamento: tipo de documento TOC → tipo da app
const DOC_TYPE_TO_TIPO: Record<string, string> = {
  'FR': 'materiais',    // Factura/Recibo
  'FT': 'materiais',    // Factura
  'VD': 'materiais',    // Venda a dinheiro
  'FS': 'mao_de_obra',  // Folha de serviços / subempreitada
  'NC': 'outros',       // Nota de crédito
};

function docTypeToTipo(docType: string | null): string {
  if (!docType) return 'outros';
  const upper = docType.toUpperCase();
  return DOC_TYPE_TO_TIPO[upper] ?? 'materiais';
}

export async function syncDespesasToApp(
  startDate: string,
  endDate: string,
): Promise<{ upserted: number; skipped: number; pages: number }> {
  // Garantir coluna toconline_id na tabela despesas
  await pool.query(`
    ALTER TABLE despesas
      ADD COLUMN IF NOT EXISTS toconline_id TEXT UNIQUE
  `);

  // Carregar obras para matching de centro de custo
  const obrasRes = await pool.query(
    'SELECT id, code, name FROM obras ORDER BY code'
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obras: { id: string; code: string; name: string }[] = obrasRes.rows;

  function matchCentroCusto(
    tocCode: string | null,
    tocName: string | null,
  ): string | null {
    if (!tocCode && !tocName) return null;
    // Exact code match
    if (tocCode) {
      const byCode = obras.find(
        o => o.code.toLowerCase() === tocCode.toLowerCase()
      );
      if (byCode) return byCode.id;
    }
    // Partial name match
    if (tocName) {
      const lcName = tocName.toLowerCase();
      const byName = obras.find(
        o => o.name.toLowerCase().includes(lcName) ||
             lcName.includes(o.name.toLowerCase())
      );
      if (byName) return byName.id;
    }
    return null;
  }

  let upserted = 0;
  let skipped = 0;
  let pageNum = 1;
  const pageSize = 100;

  while (true) {
    const filterExpr = `purchases_documents.date>='${startDate}'::date AND purchases_documents.date<='${endDate}'::date`;
    const qs = new URLSearchParams({
      'page[number]': String(pageNum),
      'page[size]':   String(pageSize),
    });

    const raw = await tocFetch<unknown>(
      `/commercial_purchases_documents?filter="${filterExpr}"&${qs}`
    );
    const data = Array.isArray(raw)
      ? raw
      : ((raw as { data?: unknown[] }).data ?? []);
    const items = data.map(normalizeItem) as TocDespesa[];

    if (items.length === 0) break;

    for (const item of items) {
      try {
           // URL do documento: sem fetch individual por doc (evita sobrecarga DB/API)
          const docUrl: string | null = null;

        const tipo  = docTypeToTipo(item.document_type ?? null);
        const valor = item.net_total ?? item.gross_total ?? null;
        if (!valor) { skipped++; continue; }

        const centroCustoId = matchCentroCusto(
          item.centro_custo ?? null,
          item.centro_custo ?? null,
        );

        const descricao =
          (item.document_no ? `${item.document_no} ` : '') +
          (item.document_type ? `(${item.document_type}) ` : '') +
          (item.notes ?? '');

        const notas = [
          item.supplier_tax_registration_number
            ? `NIF: ${item.supplier_tax_registration_number}`
            : null,
          item.net_total != null
            ? `Sem IVA: ${item.net_total}€`
            : null,
          item.tax_payable != null
            ? `IVA: ${item.tax_payable}€`
            : null,
          item.centro_custo
            ? `CC TOC: ${item.centro_custo}`
            : null,
        ]
          .filter(Boolean)
          .join(' | ') || null;

        await pool.query(
          `INSERT INTO despesas
             (toconline_id, data_despesa, descricao, tipo,
              valor, valor_sem_iva, valor_iva, valor_total_civa,
              numero_fatura, centro_custo_id, fornecedor, notas, documento_ref)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
           ON CONFLICT (toconline_id) DO UPDATE SET
             data_despesa     = EXCLUDED.data_despesa,
             descricao        = EXCLUDED.descricao,
             tipo             = EXCLUDED.tipo,
             valor            = EXCLUDED.valor,
             valor_sem_iva    = EXCLUDED.valor_sem_iva,
             valor_iva        = EXCLUDED.valor_iva,
             valor_total_civa = EXCLUDED.valor_total_civa,
             numero_fatura    = COALESCE(EXCLUDED.numero_fatura, despesas.numero_fatura),
             centro_custo_id  = COALESCE(EXCLUDED.centro_custo_id, despesas.centro_custo_id),
             fornecedor       = EXCLUDED.fornecedor,
             notas            = EXCLUDED.notas,
             documento_ref    = COALESCE(EXCLUDED.documento_ref, despesas.documento_ref)`,
          [
            String(item.id),
            item.date ?? new Date().toISOString().slice(0, 10),
            descricao.trim() || 'Documento TOC Online',
            tipo,
            item.net_total ?? item.gross_total ?? null,
            item.net_total ?? null,
            item.tax_payable ?? null,
            item.gross_total ?? null,
            item.document_no ?? null,
            centroCustoId,
            item.supplier_business_name ?? null,
            notas,
            docUrl,
          ]
        );
        upserted++;
      } catch (e) {
        console.error('[syncDespesasToApp] doc', item.id, (e as Error).message);
        skipped++;
      }
    }

    if (items.length < pageSize) break;
    pageNum++;
  }

  return { upserted, skipped, pages: pageNum };
}

// -- Utilitarios -----------------------------------------------------------------

export function isConfigured(): boolean {
  return !!(
    process.env.TOCONLINE_ACCESS_TOKEN ||
    (process.env.TOCONLINE_CLIENT_ID && process.env.TOCONLINE_SECRET &&
     process.env.TOCONLINE_OAUTH_URL && process.env.TOCONLINE_REFRESH_TOKEN)
  );
}

// -- Despesas (Documentos de Compra) -----------------------------------------

export interface TocDespesa {
  id: string;
  document_no?: string | null;
  document_type?: string | null;
  status?: number | null;
  date?: string | null;
  due_date?: string | null;
  gross_total?: number | null;
  net_total?: number | null;
  tax_payable?: number | null;
  pending_total?: number | null;
  supplier_business_name?: string | null;
  supplier_tax_registration_number?: string | null;
  external_reference?: string | null;
  notes?: string | null;
  currency_iso_code?: string | null;
  synced_at?: string | null;
  centro_custo?: string | null;
  arquivo_url?: string | null;
  arquivo_nome?: string | null;
  origem?: string | null;
}

const CREATE_DESPESAS_TABLE = `
  CREATE TABLE IF NOT EXISTS despesas (
    id            SERIAL PRIMARY KEY,
    toconline_id  TEXT UNIQUE,
    document_no   TEXT,
    document_type TEXT,
    status        INTEGER,
    date          DATE,
    due_date      DATE,
    gross_total   NUMERIC(12,2),
    net_total     NUMERIC(12,2),
    tax_payable   NUMERIC(12,2),
    pending_total NUMERIC(12,2),
    supplier_nome TEXT,
    supplier_nif  TEXT,
    external_ref  TEXT,
    notes         TEXT,
    currency      TEXT DEFAULT 'EUR',
    centro_custo  TEXT,
    arquivo_url   TEXT,
    arquivo_nome  TEXT,
    origem        TEXT DEFAULT 'toconline',
    synced_at     TIMESTAMP DEFAULT now(),
    criado_em     TIMESTAMP DEFAULT now()
  )
`;

export async function migrateDespesas(): Promise<void> {
  await pool.query(CREATE_DESPESAS_TABLE);
  // Idempotent: add new columns to existing tables
  await pool.query(`
    ALTER TABLE despesas
      ADD COLUMN IF NOT EXISTS centro_custo TEXT,
      ADD COLUMN IF NOT EXISTS arquivo_url  TEXT,
      ADD COLUMN IF NOT EXISTS arquivo_nome TEXT,
      ADD COLUMN IF NOT EXISTS origem       TEXT DEFAULT 'toconline'
  `);
  await pool.query(`UPDATE despesas SET origem = 'toconline' WHERE origem IS NULL`);
}

export async function syncDespesas(
  startDate: string,
  endDate: string,
): Promise<{ upserted: number; pages: number }> {
  await migrateDespesas();

  let upserted = 0;
  let pageNum = 1;
  const pageSize = 100;

  while (true) {
    const filterExpr = `purchases_documents.date>='${startDate}'::date AND purchases_documents.date<='${endDate}'::date`;
    const paginationQs = new URLSearchParams({
      'page[number]': String(pageNum),
      'page[size]': String(pageSize),
    });
    const raw = await tocFetch<unknown>(`/commercial_purchases_documents?filter="${filterExpr}"&${paginationQs}`);
    const data = Array.isArray(raw) ? raw : ((raw as { data?: unknown[] }).data ?? []);
    const items = data.map(normalizeItem) as TocDespesa[];

    for (const item of items) {
      await pool.query(
        `INSERT INTO despesas (
          toconline_id, document_no, document_type, status, date, due_date,
          gross_total, net_total, tax_payable, pending_total,
          supplier_nome, supplier_nif, external_ref, notes, currency,
          origem, synced_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'toconline',now())
        ON CONFLICT (toconline_id) DO UPDATE SET
          document_no   = EXCLUDED.document_no,
          document_type = EXCLUDED.document_type,
          status        = EXCLUDED.status,
          date          = EXCLUDED.date,
          due_date      = EXCLUDED.due_date,
          gross_total   = EXCLUDED.gross_total,
          net_total     = EXCLUDED.net_total,
          tax_payable   = EXCLUDED.tax_payable,
          pending_total = EXCLUDED.pending_total,
          supplier_nome = EXCLUDED.supplier_nome,
          supplier_nif  = EXCLUDED.supplier_nif,
          external_ref  = EXCLUDED.external_ref,
          notes         = EXCLUDED.notes,
          currency      = EXCLUDED.currency,
          synced_at     = now()`,
        [
          String(item.id),
          item.document_no ?? null,
          item.document_type ?? null,
          item.status ?? null,
          item.date ?? null,
          item.due_date ?? null,
          item.gross_total ?? null,
          item.net_total ?? null,
          item.tax_payable ?? null,
          item.pending_total ?? null,
          item.supplier_business_name ?? null,
          item.supplier_tax_registration_number ?? null,
          item.external_reference ?? null,
          item.notes ?? null,
          item.currency_iso_code ?? 'EUR',
        ],
      );
      upserted++;
    }

    if (items.length < pageSize) break;
    pageNum++;
  }

  return { upserted, pages: pageNum };
}

export async function loadDespesas(
  startDate: string,
  endDate: string,
): Promise<TocDespesa[]> {
  try {
    const { rows } = await pool.query(
      `SELECT
          toconline_id                              AS id,
          document_no, document_type, status,
          to_char(date,     'YYYY-MM-DD')           AS date,
          to_char(due_date, 'YYYY-MM-DD')           AS due_date,
          gross_total, net_total, tax_payable, pending_total,
          supplier_nome  AS supplier_business_name,
          supplier_nif   AS supplier_tax_registration_number,
          external_ref   AS external_reference,
          notes,
          currency       AS currency_iso_code,
          centro_custo, arquivo_url, arquivo_nome, origem,
          to_char(synced_at, 'YYYY-MM-DD HH24:MI')  AS synced_at
       FROM despesas
       WHERE date BETWEEN $1 AND $2
       ORDER BY date DESC, document_no`,
      [startDate, endDate],
    );
    return rows;
  } catch {
    return [];
  }
}
