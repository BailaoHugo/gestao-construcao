import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
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
  const refreshToken = process.env.TOCONLINE_REFRESH_TOKEN;
  if (!clientId || !secret || !oauthUrl) throw new Error('TOConline nao configurado');
  if (!refreshToken) throw new Error('TOConline: TOCONLINE_REFRESH_TOKEN nao definido');
  const credentials = Buffer.from(clientId + ':' + secret).toString('base64');
  const resp = await fetch(oauthUrl + '/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + credentials,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      scope: 'commercial',
    }).toString(),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error('TOConline refresh falhou: ' + resp.status + ' ' + text);
  }
  const data = await resp.json();
  _tokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
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
    // Auto-classificar: trabalhadores independentes sao tipicamente subempreiteiros.
    // No ON CONFLICT, so atualizamos o tipo se ainda for o valor padrao ('fornecedor'),
    // para preservar classificacoes manuais feitas pelo utilizador.
    const tipo = item.is_independent_worker === true ? 'subempreiteiro' : 'fornecedor';
    await pool.query(
      `INSERT INTO fornecedores (toconline_id, nome, nif, email, telefone, ativo, tipo, toconline_synced_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now())
       ON CONFLICT (toconline_id) DO UPDATE SET
         nome = EXCLUDED.nome,
         nif = EXCLUDED.nif,
         email = EXCLUDED.email,
         telefone = EXCLUDED.telefone,
         ativo = EXCLUDED.ativo,
         tipo = CASE WHEN fornecedores.tipo = 'fornecedor' THEN EXCLUDED.tipo ELSE fornecedores.tipo END,
         toconline_synced_at = now(),
         atualizado_em = now()`,
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
         nome = EXCLUDED.nome,
         nif = EXCLUDED.nif,
         email = EXCLUDED.email,
         telefone = EXCLUDED.telefone,
         ativo = EXCLUDED.ativo,
         synced_at = now()`,
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
           codigo = EXCLUDED.codigo,
           designacao = EXCLUDED.designacao,
           ativo = EXCLUDED.ativo,
           synced_at = now()`,
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
    try {
      results[key] = await fn();
    } catch (e) {
      results[key] = { error: (e as Error).message };
    }
  }
  const hasErrors = Object.values(results).some(r => 'error' in r);
  await pool.query(
    `UPDATE toconline_sync_log SET estado = $1, concluido_em = now(), resultado = $2 WHERE id = $3`,
    [hasErrors ? 'parcial' : 'ok', JSON.stringify(results), logId],
  );
  return results;
}

// -- Utilitarios -----------------------------------------------------------------

export function isConfigured(): boolean {
  return !!(
    process.env.TOCONLINE_ACCESS_TOKEN ||
    (process.env.TOCONLINE_CLIENT_ID &&
      process.env.TOCONLINE_SECRET &&
      process.env.TOCONLINE_OAUTH_URL &&
      process.env.TOCONLINE_REFRESH_TOKEN)
  );
}
