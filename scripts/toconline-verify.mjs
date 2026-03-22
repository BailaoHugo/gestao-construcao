#!/usr/bin/env node
/**
 * Verificação técnica da API TOConline (documentos de compra, PDF, campos, anexos).
 *
 * Uso:
 *   export TOCONLINE_API_URL="https://api17.toconline.pt"   # «Endereço de acesso à API» (nº varia)
 *   export TOCONLINE_ACCESS_TOKEN="..."   # Bearer obtido via OAuth (Postman ou passo 0 abaixo)
 *   node scripts/toconline-verify.mjs
 *
 * Opcional — trocar código OAuth por token (após redirect manual):
 *   export TOCONLINE_OAUTH_URL="https://...."
 *   export TOCONLINE_CLIENT_ID="..."
 *   export TOCONLINE_CLIENT_SECRET="..."
 *   export TOCONLINE_AUTH_CODE="..."      # código único do ?code=
 *   node scripts/toconline-verify.mjs
 *
 * Opcional — variáveis a partir do export Postman (Environment ou Collection):
 *   export TOCONLINE_POSTMAN_FILE="/caminho/para/Postman.json"
 *   # ou coloca o ficheiro em: secrets/toconline-postman.json
 *
 * Não commite tokens. Usa apenas .env.local ou export na shell.
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { applyPostmanEnvFile } from "./toconline-load-postman-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "tmp", "toconline-verify");

function env(name, required = false) {
  const v = process.env[name];
  if (required && (!v || !String(v).trim())) {
    console.error(`Variável em falta: ${name}`);
    process.exit(1);
  }
  return v?.trim() ?? "";
}

/** Rejeita placeholders copiados da documentação (ex.: https://<o teu host>). */
function assertValidApiUrl(raw) {
  const s = String(raw).trim();
  if (!s) {
    console.error("TOCONLINE_API_URL está vazio.");
    process.exit(1);
  }
  if (/[<>]/.test(s) || /placeholder|o teu host|teu host/i.test(s)) {
    console.error(
      "TOCONLINE_API_URL parece um placeholder da documentação (ex.: <o teu host>).\n" +
        "Substitua pelo URL real «Endereço de acesso à API» (Dados API), por exemplo:\n" +
        "  export TOCONLINE_API_URL=\"https://api17.toconline.pt\"\n" +
        "(o valor exacto vem no email; não use < nem >).",
    );
    process.exit(1);
  }
  try {
    const u = new URL(s);
    if (u.protocol !== "https:" && u.protocol !== "http:") {
      throw new Error("protocolo inválido");
    }
  } catch {
    console.error(
      "TOCONLINE_API_URL não é um URL válido:",
      s,
      "\nExemplo de formato: https://algum-host.toconline.pt",
    );
    process.exit(1);
  }
}

function assertTokenLooksReal(raw) {
  const s = String(raw).trim();
  if (!s) return;
  if (s === "<token>" || /^<.+>$/.test(s) || s === "seu_token" || s === "your_token") {
    console.error(
      "TOCONLINE_ACCESS_TOKEN parece um placeholder (ex.: <token>).\n" +
        "Cole o access_token real devolvido pelo OAuth / Postman (sem < >).",
    );
    process.exit(1);
  }
  if (/token\s*real/i.test(s) || /\.{3}token|token\.{3}/i.test(s)) {
    console.error(
      "TOCONLINE_ACCESS_TOKEN parece texto de exemplo (ex.: «…token real…»).\n" +
        "Substitua pelo valor real do campo access_token (resposta OAuth / Postman).",
    );
    process.exit(1);
  }
  if (
    /^cola_/i.test(s) ||
    /cole_aqui|paste_here|example_token|fake_token|do_json$/i.test(s)
  ) {
    console.error(
      "TOCONLINE_ACCESS_TOKEN parece instrução de documentação (ex.: cola_o_access_token…), não o token real.\n" +
        "Corre: npm run toconline:oauth-token -- \"CODIGO\" e copia o campo access_token do JSON (string longa).",
    );
    process.exit(1);
  }
}

/** Headers HTTP só aceitam ByteString; tokens OAuth são ASCII. */
function assertTokenAsciiOnly(raw) {
  const s = String(raw);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c > 127) {
      console.error(
        `TOCONLINE_ACCESS_TOKEN tem carácter não ASCII na posição ${i} (Unicode U+${c.toString(16)}).\n` +
          "Causa típica: copiar reticências «…» (Unicode) do texto de exemplo em vez do token.\n" +
          "Cole só o access_token (Postman / JSON do /token), sem reticências nem espaços estranhos.",
      );
      process.exit(1);
    }
  }
}

function headersJson() {
  return {
    Accept: "application/json",
    "Content-Type": "application/vnd.api+json",
    Authorization: `Bearer ${accessToken}`,
  };
}

let accessToken = "";

async function exchangeAuthCode() {
  const oauthUrl = env("TOCONLINE_OAUTH_URL");
  const clientId = env("TOCONLINE_CLIENT_ID");
  const clientSecret = env("TOCONLINE_CLIENT_SECRET");
  const code = env("TOCONLINE_AUTH_CODE");
  if (!oauthUrl || !clientId || !clientSecret || !code) return null;

  const base = oauthUrl.replace(/\/$/, "");
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    scope: "commercial",
  });

  const res = await fetch(`${base}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      Authorization: `Basic ${basic}`,
    },
    body,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    console.error("[FAIL] Resposta /token não é JSON:", text.slice(0, 500));
    process.exit(1);
  }
  if (!res.ok) {
    console.error("[FAIL] POST token:", res.status, data);
    process.exit(1);
  }
  return data.access_token;
}

function saveJson(name, obj) {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const path = join(OUT_DIR, name);
  writeFileSync(path, JSON.stringify(obj, null, 2), "utf8");
  return path;
}

function collectKeysMatching(obj, pattern, path = "", out = []) {
  if (obj === null || obj === undefined) return out;
  if (typeof obj !== "object") return out;
  if (Array.isArray(obj)) {
    obj.forEach((item, i) =>
      collectKeysMatching(item, pattern, `${path}[${i}]`, out),
    );
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    const p = path ? `${path}.${k}` : k;
    if (pattern.test(k)) out.push({ path: p, sample: typeof v === "object" ? "[object]" : v });
    collectKeysMatching(v, pattern, p, out);
  }
  return out;
}

function findObraLikeKeys(obj) {
  const terms = /obra|project|cost|centro|analit|analytic|rubric|cc_|work_order|site/i;
  return collectKeysMatching(obj, terms);
}

/**
 * Corpo da listagem de documentos de compra: a API pode devolver
 * - array na raiz `[{ id, ... }, ...]`, ou
 * - envelope `{ data: [...] }` (JSON:API / legado).
 */
function listDocumentsFromPurchasesListBody(body) {
  if (body == null) return null;
  if (Array.isArray(body)) return body;
  if (typeof body === "object" && Array.isArray(body.data)) return body.data;
  return null;
}

function firstPurchaseDocumentId(body) {
  const arr = listDocumentsFromPurchasesListBody(body);
  if (!arr?.length) return null;
  const row = arr[0];
  if (!row || typeof row !== "object") return null;
  return row.id ?? row.attributes?.id ?? null;
}

async function fetchJson(label, url) {
  const res = await fetch(url, { headers: headersJson() });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { _raw: text.slice(0, 2000) };
  }
  return { label, url, status: res.status, ok: res.ok, data };
}

function resolvePostmanEnvPath() {
  const explicit = env("TOCONLINE_POSTMAN_FILE");
  if (explicit) return resolve(process.cwd(), explicit);
  const fallback = resolve(process.cwd(), "secrets", "toconline-postman.json");
  if (existsSync(fallback)) return fallback;
  return "";
}

async function main() {
  console.log("=== TOConline — verificação API ===\n");

  const postmanPath = resolvePostmanEnvPath();
  if (postmanPath) {
    try {
      const { applied, skipped } = applyPostmanEnvFile(postmanPath);
      if (applied.length) {
        console.log(
          `[Postman] Carregado ${postmanPath}\n         → definido: ${applied.join(", ")}`,
        );
      } else {
        console.log(
          `[Postman] Ficheiro lido (${postmanPath}) mas nenhuma variável TOCONLINE_* reconhecida (ou já estavam no ambiente).`,
        );
      }
      if (skipped.length) {
        console.log(`         (ignoradas: ${skipped.join("; ")})`);
      }
      console.log("");
    } catch (e) {
      console.error(
        "[ERRO] TOCONLINE_POSTMAN_FILE / secrets/toconline-postman.json:",
        e instanceof Error ? e.message : String(e),
      );
      process.exit(1);
    }
  }

  accessToken = env("TOCONLINE_ACCESS_TOKEN");
  if (!accessToken) {
    const exchanged = await exchangeAuthCode();
    if (exchanged) {
      accessToken = exchanged;
      console.log("[OK] Token obtido via TOCONLINE_AUTH_CODE (não grave este output em ficheiros partilhados)\n");
    }
  }

  if (!accessToken) {
    console.error(
      "Defina TOCONLINE_ACCESS_TOKEN ou as variáveis OAuth + TOCONLINE_AUTH_CODE.\nVer docs/toconline-verificacao-api.md\n",
    );
    process.exit(1);
  }

  assertTokenLooksReal(accessToken);
  assertTokenAsciiOnly(accessToken);

  const baseRaw = env("TOCONLINE_API_URL", true);
  assertValidApiUrl(baseRaw);
  const base = baseRaw.replace(/\/$/, "");

  const results = [];

  // 1) Listagem v1
  const listV1Url = `${base}/api/v1/commercial_purchases_documents/`;
  let r1 = await fetchJson("GET documentos compra (v1)", listV1Url);
  results.push(r1);
  console.log(`[${r1.ok ? "OK" : "FAIL"}] ${r1.label} → HTTP ${r1.status}`);
  if (!r1.ok && r1.status === 404) {
    const alt = `${base}/api/v1/commercial_purchases_documents`;
    r1 = await fetchJson("GET documentos compra (v1 sem slash)", alt);
    results.push(r1);
    console.log(`[${r1.ok ? "OK" : "FAIL"}] ${r1.label} → HTTP ${r1.status}`);
  }

  // 2) Listagem legado
  const listLegacy = `${base}/api/commercial_purchases_documents`;
  const r2 = await fetchJson("GET documentos compra (legado)", listLegacy);
  results.push(r2);
  console.log(`[${r2.ok ? "OK" : "FAIL"}] ${r2.label} → HTTP ${r2.status}`);

  // Extrair primeiro id (prioriza lista que respondeu OK)
  let firstId = null;
  const listPayload = r1.ok ? r1.data : r2.ok ? r2.data : null;
  const listArr = listDocumentsFromPurchasesListBody(listPayload);
  if (listArr?.length) {
    firstId = firstPurchaseDocumentId(listPayload);
    console.log(
      `     Documentos na resposta: ${listArr.length} | primeiro id: ${firstId ?? "—"}`,
    );
  } else {
    console.log(
      "     Documentos na resposta: 0 (ou formato não reconhecido — esperado array na raiz ou { data: [] })",
    );
  }

  saveJson("01-list-v1.json", r1);
  saveJson("02-list-legacy.json", r2);

  // 3) Detalhe por id (várias convenções)
  if (firstId) {
    const detailUrls = [
      `${base}/api/v1/commercial_purchases_documents/${firstId}`,
      `${base}/api/commercial_purchases_documents/${firstId}`,
    ];
    for (const url of detailUrls) {
      const rd = await fetchJson("GET documento por id", url);
      results.push(rd);
      console.log(`[${rd.ok ? "OK" : "FAIL"}] ${rd.label} ${url} → HTTP ${rd.status}`);
      if (rd.ok) {
        saveJson(`03-detail-${firstId}.json`, rd);
        const obraHints = findObraLikeKeys(rd.data);
        if (obraHints.length) {
          console.log("     Campos com possível ligação obra/CC/analítica (heurística):");
          obraHints.slice(0, 15).forEach((h) => console.log(`       - ${h.path}`));
        } else {
          console.log("     Nenhuma chave óbvia (obra/centro/analítica) na amostra.");
        }
        const attachHints = collectKeysMatching(
          rd.data,
          /attach|anexo|archive|blob|file_id|document_file|upload|storage/i,
        );
        if (attachHints.length) {
          console.log("     Campos com possível ligação a ficheiros/anexos:");
          attachHints.forEach((h) => console.log(`       - ${h.path}`));
        } else {
          console.log("     Nenhuma chave óbvia de anexo/ficheiro no detalhe.");
        }
        break;
      }
    }
  } else {
    console.log("[SKIP] Sem id de documento para testar GET detalhe.");
  }

  // 4) Linhas (global)
  const linesUrl = `${base}/api/commercial_purchases_document_lines?page[size]=10`;
  const rLines = await fetchJson("GET linhas documentos compra", linesUrl);
  results.push(rLines);
  console.log(`[${rLines.ok ? "OK" : "FAIL"}] ${rLines.label} → HTTP ${rLines.status}`);
  saveJson("04-lines.json", rLines);

  // 5) url_for_print (PDF) — documento finalizado
  if (firstId) {
    const printUrl = `${base}/api/url_for_print/${firstId}?filter[type]=PurchasesDocument`;
    const rp = await fetchJson("GET url_for_print (PDF compra)", printUrl);
    results.push(rp);
    console.log(`[${rp.ok ? "OK" : "FAIL"}] ${rp.label} → HTTP ${rp.status}`);
    saveJson("05-url-for-print.json", rp);
    if (rp.ok && rp.data?.data?.attributes?.url) {
      const u = rp.data.data.attributes.url;
      const full = `${u.scheme}://${u.host}${u.port && u.port !== 443 && u.port !== 80 ? `:${u.port}` : ""}${u.path}`;
      console.log(`     URL construída (PDF): ${full.slice(0, 120)}...`);
      // Muitos endpoints de download não aceitam HEAD (405); tentar GET com Range mínimo.
      let probe = await fetch(full, { method: "HEAD", redirect: "follow" });
      const headStatus = probe.status;
      if (headStatus === 405 || headStatus === 501) {
        probe = await fetch(full, {
          method: "GET",
          redirect: "follow",
          headers: { Range: "bytes=0-0" },
        });
        if (probe.status === 416) {
          console.log(
            `     Ficheiro público: HEAD → HTTP ${headStatus}; GET Range → 416 (não foi feito GET completo no script para não descarregar o PDF).`,
          );
        } else {
          console.log(
            `     Ficheiro público: HEAD → HTTP ${headStatus}; GET Range (1 byte): HTTP ${probe.status} (content-type: ${probe.headers.get("content-type") ?? "—"})`,
          );
        }
      } else {
        console.log(
          `     HEAD ao ficheiro público: HTTP ${probe.status} (content-type: ${probe.headers.get("content-type") ?? "—"})`,
        );
      }
    }
  } else {
    console.log("[SKIP] Sem id para url_for_print.");
  }

  // 6) Paginação page[size]
  const pageUrl = `${base}/api/v1/commercial_purchases_documents/?page[size]=2`;
  const rPage = await fetchJson("GET lista com page[size]=2", pageUrl);
  results.push(rPage);
  console.log(`[${rPage.ok ? "OK" : "FAIL"}] ${rPage.label} → HTTP ${rPage.status}`);

  const failed = results.filter((x) => !x.ok);
  console.log("\n--- Resumo ---");
  console.log(`Pedidos registados: ${results.length}`);
  console.log(`Falhas HTTP: ${failed.length}`);
  if (failed.length) {
    failed.forEach((f) =>
      console.log(`  - ${f.status} ${f.label}`),
    );
  }
  console.log(`\nJSONs gravados em: ${OUT_DIR}`);
  console.log("\nInterpretação: confirme manualmente se a resposta inclui anexos; este script só procura nomes de chaves.");
  process.exit(failed.some((f) => f.status === 401 || f.status === 403) ? 2 : failed.length > 2 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
