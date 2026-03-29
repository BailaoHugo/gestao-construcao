import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ── OAuth Token ───────────────────────────────────────────────────────────────

let _tokenCache: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(): Promise<string> {
  if (_tokenCache && Date.now() < _tokenCache.expiresAt - 60_000) {
    return _tokenCache.token;
  }

  const clientId = process.env.TOCONLINE_CLIENT_ID;
  const secret   = process.env.TOCONLINE_SECRET;
  const oauthUrl = process.env.TOCONLINE_OAUTH_URL;

  if (!clientId || !secret || !oauthUrl) {
    throw new Error(
      'Credenciais TOConline em falta: defina TOCONLINE_CLIENT_ID, TOCONLINE_SECRET e TOCONLINE_OAUTH_URL',
    );
  }

  const credentials = Buffer.from(`${clientId}:${secret}`).toString('base64');
  const resp = await fetch(`${oauthUrl}/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`TOConline OAuth falhou: ${resp.status} ${text}`);
  }

  const data = await resp.json();
  _tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return _tokenCache.token;
}

// ── API Fetch ─────────────────────────────────────────────────────────────────

export async function tocFetch<T = unknown>(path: string): Promise<T> {
  const apiUrl = process.env.TOCONLINE_API_URL;
  if (!apiUrl) throw new Error('TOCONLINE_API_URL nao configurado');

  const token = await getAccessToken();
  const resp = await fetch(`${apiUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`TOConline API ${resp.status}: ${text}`);
  }
  return resp.json();
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface TocFornecedor {
  id: string | number;
  name: string;
  tax_id?: string;
  email?: string;
  phone?: string;
  address?: string;
  active?: boolean;
}

export interface TocCliente {
  id: string | number;
  name: string;
  tax_id?: string;
  email?: string;
  phone?: string;
  active?: boolean;
}

export interface TocCentroCusto {
  id: string | number;
  code?: string;
  name: string;
  active?: boolean;
}

function extractArray<T>(data: T[] | { data: T[] } | { items: T[] }): T[] {
  if (Array.isArray(data)) return data;
  if ('data' in data) return (data as { data: T[] }).data;
  if ('items' in data) return (data as { items: T[] }).items;
  return [];
}

// ── Sync Fornecedores ─────────────────────────────────────────────────────────

export async function syncFornecedores(): Promise<{ upserted: number }> {
  const raw = await tocFetch<unknown>('/suppliers');
  const items = extractArray<TocFornecedor>(raw as never);

  let upserted = 0;
  for (const item of items) {
    await pool.query(
      `INSERT INTO fornecedores (toconline_id, nome, nif, email, telefone, ativo, toconline_synced_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (toconline_id) DO UPDATE SET
         nome                 = EXCLUDED.nome,
         nif                  = EXCLUDED.nif,
         email                = EXCLUDED.email,
         telefone             = EXCLUDED.telefone,
         ativo                = EXCLUDED.ativo,
         toconline_synced_at  = now(),
         atualizado_em        = now()`,
      [String(item.id), item.name, item.tax_id ?? null,
       item.email ?? null, item.phone ?? null, item.active ?? true],
    );
    upserted++;
  }
  return { upserted };
}

// ── Sync Clientes ─────────────────────────────────────────────────────────────

export async function syncClientes(): Promise<{ upserted: number }> {
  const raw = await tocFetch<unknown>('/customers');
  const items = extractArray<TocCliente>(raw as never);

  let upserted = 0;
  for (const item of items) {
    await pool.query(
      `INSERT INTO toconline_clientes (toconline_id, nome, nif, email, telefone, ativo, synced_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (toconline_id) DO UPDATE SET
         nome       = EXCLUDED.nome,
         nif        = EXCLUDED.nif,
         email      = EXCLUDED.email,
         telefone   = EXCLUDED.telefone,
         ativo      = EXCLUDED.ativo,
         synced_at  = now()`,
      [String(item.id), item.name, item.tax_id ?? null,
       item.email ?? null, item.phone ?? null, item.active ?? true],
    );
    upserted++;
  }
  return { upserted };
}

// ── Sync Centros de Custo ─────────────────────────────────────────────────────

export async function syncCentrosCusto(): Promise<{ upserted: number }> {
  // Endpoint tipico: /cost_centers ou /accounting/cost_centers
  // Confirmar com suporte TOConline se necessario
  const raw = await tocFetch<unknown>('/cost_centers');
  const items = extractArray<TocCentroCusto>(raw as never);

  let upserted = 0;
  for (const item of items) {
    await pool.query(
      `INSERT INTO centros_custo (toconline_id, codigo, designacao, ativo, synced_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (toconline_id) DO UPDATE SET
         codigo     = EXCLUDED.codigo,
         designacao = EXCLUDED.designacao,
         ativo      = EXCLUDED.ativo,
         synced_at  = now()`,
      [String(item.id), item.code ?? String(item.id), item.name, item.active ?? true],
    );
    upserted++;
  }
  return { upserted };
}

// ── Sync Completo ─────────────────────────────────────────────────────────────

export type SyncResults = Record<string, { upserted: number } | { error: string }>;

export async function runFullSync(): Promise<SyncResults> {
  const logId = (
    await pool.query(
      `INSERT INTO toconline_sync_log (estado) VALUES ('iniciado') RETURNING id`,
    )
  ).rows[0].id;

  const results: SyncResults = {};

  const tasks: [string, () => Promise<{ upserted: number }>][] = [
    ['fornecedores', syncFornecedores],
    ['clientes',     syncClientes],
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
    `UPDATE toconline_sync_log
       SET estado = $1, concluido_em = now(), resultado = $2
     WHERE id = $3`,
    [hasErrors ? 'parcial' : 'ok', JSON.stringify(results), logId],
  );

  return results;
}

// ── Utilitarios ───────────────────────────────────────────────────────────────

export function isConfigured(): boolean {
  return !!(
    process.env.TOCONLINE_CLIENT_ID &&
    process.env.TOCONLINE_SECRET &&
    process.env.TOCONLINE_OAUTH_URL &&
    process.env.TOCONLINE_API_URL
  );
}
