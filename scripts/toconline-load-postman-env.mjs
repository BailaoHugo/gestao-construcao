/**
 * Lê um ficheiro exportado pelo Postman (ambiente ou coleção) e aplica
 * variáveis conhecidas a process.env (só se a variável ainda não estiver definida).
 *
 * Formatos suportados:
 * - Postman Environment (tem `values: [{ key, value, enabled }]`)
 * - Postman Collection v2.x (tem `variable: [{ key, value }]`)
 */

import { readFileSync, existsSync } from "fs";

const MAPS = [
  {
    env: "TOCONLINE_API_URL",
    keys: [
      "api_url",
      "apiurl",
      "api-url",
      "base_url",
      "baseurl",
      "toconline_api_url",
      "toconline-api-url",
    ],
  },
  {
    env: "TOCONLINE_OAUTH_URL",
    keys: ["oauth_url", "oauthurl", "oauth-url", "auth_url", "authurl"],
  },
  {
    env: "TOCONLINE_ACCESS_TOKEN",
    keys: [
      "access_token",
      "accesstoken",
      "access-token",
      "token",
      "bearer",
      "auth_token",
    ],
  },
  {
    env: "TOCONLINE_CLIENT_ID",
    keys: ["client_id", "clientid", "client-id"],
  },
  {
    env: "TOCONLINE_CLIENT_SECRET",
    keys: ["client_secret", "clientsecret", "client-secret"],
  },
];

function normKey(k) {
  return String(k)
    .trim()
    .toLowerCase()
    .replace(/[\s_]/g, "");
}

function collectPairsFromJson(j) {
  const pairs = [];
  if (j && Array.isArray(j.values)) {
    for (const v of j.values) {
      if (v && v.enabled === false) continue;
      if (v && v.key != null && v.value != null) {
        pairs.push([String(v.key), String(v.value)]);
      }
    }
  }
  if (j && Array.isArray(j.variable)) {
    for (const v of j.variable) {
      if (v && v.key != null && v.value != null) {
        pairs.push([String(v.key), String(v.value)]);
      }
    }
  }
  return pairs;
}

/**
 * @param {string} filePath
 * @returns {{ applied: string[], skipped: string[] }}
 */
export function applyPostmanEnvFile(filePath) {
  if (!filePath || !String(filePath).trim()) {
    return { applied: [], skipped: [] };
  }
  if (!existsSync(filePath)) {
    throw new Error(`Ficheiro não encontrado: ${filePath}`);
  }
  const raw = readFileSync(filePath, "utf8");
  const j = JSON.parse(raw);
  const pairs = collectPairsFromJson(j);
  const byNorm = new Map();
  for (const [k, v] of pairs) {
    const nk = normKey(k);
    if (!byNorm.has(nk)) byNorm.set(nk, v);
  }

  const applied = [];
  const skipped = [];

  for (const { env, keys } of MAPS) {
    if (process.env[env] && String(process.env[env]).trim()) {
      skipped.push(`${env} (já definido no ambiente)`);
      continue;
    }
    let found = null;
    for (const key of keys) {
      const val = byNorm.get(normKey(key));
      if (val != null && String(val).trim() && !/^\{\{/.test(String(val).trim())) {
        found = String(val).trim();
        break;
      }
    }
    if (found) {
      process.env[env] = found;
      applied.push(env);
    }
  }

  return { applied, skipped };
}
