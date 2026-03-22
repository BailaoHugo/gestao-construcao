#!/usr/bin/env node
/**
 * MVP RPA TOConline — Playwright: login, navegação a documentos, tentativa de
 * Contabilidade / download / leitura obra (seletores a ajustar ao DOM real).
 *
 * Uso:
 *   export TOCONLINE_APP_BASE_URL="https://app17.toconline.pt"
 *   export TOCONLINE_WEB_USER="..."
 *   export TOCONLINE_WEB_PASSWORD="..."
 *   export TOCONLINE_RPA_DOCUMENT_URL_TEMPLATE="https://app17.toconline.pt/.../{id}"
 *   export TOCONLINE_API_URL="https://api17.toconline.pt"
 *   export TOCONLINE_ACCESS_TOKEN="..."
 *   MAX_DOCS=5 node scripts/toconline-rpa/mvp.mjs
 *
 * IDs manuais (ignora API):
 *   TOCONLINE_RPA_DOC_IDS="2,3,5,7,11" node scripts/toconline-rpa/mvp.mjs
 *
 * Ver: docs/toconline-rpa-mvp.md
 */

import { mkdirSync, appendFileSync, existsSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

import { applyPostmanEnvFile } from "../toconline-load-postman-env.mjs";
import { SELECTORS } from "./selectors.example.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const OUT = join(ROOT, "tmp", "toconline-rpa");
const DOWNLOADS = join(OUT, "downloads");
const LOGS = join(OUT, "logs");
const SCREENSHOTS = join(OUT, "screenshots");

function env(name, required = false) {
  const v = process.env[name];
  if (required && (!v || !String(v).trim())) {
    console.error(`Variável em falta: ${name}`);
    process.exit(1);
  }
  return v?.trim() ?? "";
}

function parseMaxDocs() {
  const raw = process.argv.find((a) => a.startsWith("--max-docs="));
  if (raw) return Math.max(1, parseInt(raw.split("=")[1], 10) || 5);
  const m = env("MAX_DOCS");
  if (m) return Math.max(1, parseInt(m, 10) || 5);
  return 5;
}

function listDocumentsFromPurchasesListBody(body) {
  if (body == null) return null;
  if (Array.isArray(body)) return body;
  if (typeof body === "object" && Array.isArray(body.data)) return body.data;
  return null;
}

function idFromRow(row) {
  if (!row || typeof row !== "object") return null;
  return row.id ?? row.attributes?.id ?? null;
}

async function fetchDocumentIdsFromApi(limit) {
  const token = env("TOCONLINE_ACCESS_TOKEN");
  const baseRaw = env("TOCONLINE_API_URL");
  if (!token || !baseRaw) return [];
  const base = baseRaw.replace(/\/$/, "");
  const url = `${base}/api/v1/commercial_purchases_documents/?page[size]=${limit}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${token}`,
    },
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    return [];
  }
  if (!res.ok) {
    console.warn(`[API] Listagem HTTP ${res.status} — tenta TOCONLINE_RPA_DOC_IDS ou corrige token/API URL.`);
    return [];
  }
  const arr = listDocumentsFromPurchasesListBody(data);
  if (!arr?.length) return [];
  const ids = [];
  for (const row of arr) {
    const id = idFromRow(row);
    if (id != null) ids.push(id);
    if (ids.length >= limit) break;
  }
  return ids;
}

function loadPostmanEnvOptional() {
  const explicit = env("TOCONLINE_POSTMAN_FILE");
  const fallback = resolve(process.cwd(), "secrets", "toconline-postman.json");
  let filePath = "";
  if (explicit) {
    const p = resolve(process.cwd(), explicit);
    if (existsSync(p)) filePath = p;
  } else if (existsSync(fallback)) {
    filePath = fallback;
  }
  if (!filePath) return;
  try {
    const { applied } = applyPostmanEnvFile(filePath);
    if (applied.length) console.log(`[Postman] ${filePath} → ${applied.join(", ")}`);
  } catch (e) {
    console.warn("[Postman]", e instanceof Error ? e.message : e);
  }
}

function resolveDocIds(maxDocs) {
  const manual = env("TOCONLINE_RPA_DOC_IDS");
  if (manual) {
    return manual
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, maxDocs);
  }
  return fetchDocumentIdsFromApi(maxDocs);
}

function docUrl(template, id) {
  return template.replace(/\{id\}/g, String(id));
}

function logLine(obj) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...obj }) + "\n";
  mkdirSync(LOGS, { recursive: true });
  const file = join(LOGS, `run-${new Date().toISOString().slice(0, 10)}.jsonl`);
  appendFileSync(file, line, "utf8");
  return file;
}

async function tryLogin(page, baseUrl, user, pass) {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.locator(SELECTORS.email).first().waitFor({ state: "visible", timeout: 60_000 });
  await page.locator(SELECTORS.email).first().fill(user);
  await page.locator(SELECTORS.password).first().fill(pass);
  await page.locator(SELECTORS.submit).first().click();
  await page.waitForLoadState("networkidle", { timeout: 120_000 }).catch(() => {});
}

async function openContabilidade(page) {
  try {
    await page.getByRole("tab", { name: /Contabilidade/i }).first().click({ timeout: 15_000 });
    return true;
  } catch {
    try {
      await page.locator(SELECTORS.contabilidadeTab).first().click({ timeout: 10_000 });
      return true;
    } catch {
      return false;
    }
  }
}

async function extractObraText(page) {
  try {
    const loc = page.locator(SELECTORS.obraOrCentro).first();
    await loc.waitFor({ state: "visible", timeout: 8_000 });
    const t = await loc.innerText();
    if ((t || "").trim()) return (t || "").trim().slice(0, 500);
  } catch {
    /* fallback: texto visível com «Obra» ou «Centro» */
  }
  try {
    const byText = page.getByText(/Centro de custo|Obra/i).first();
    await byText.waitFor({ state: "visible", timeout: 5_000 });
    const t = await byText.innerText();
    return (t || "").trim().slice(0, 500) || null;
  } catch {
    return null;
  }
}

async function tryDownloadFirstAttachment(page, docId) {
  mkdirSync(DOWNLOADS, { recursive: true });
  try {
    const dlPromise = page.waitForEvent("download", { timeout: 45_000 });
    await page.locator(SELECTORS.downloadAttachment).first().click({ timeout: 15_000 });
    const download = await dlPromise;
    const suggested = download.suggestedFilename();
    const path = join(DOWNLOADS, `${docId}-${suggested}`);
    await download.saveAs(path);
    return path;
  } catch {
    return null;
  }
}

async function main() {
  loadPostmanEnvOptional();
  const maxDocs = parseMaxDocs();
  const baseUrl = env("TOCONLINE_APP_BASE_URL", true);
  const user = env("TOCONLINE_WEB_USER", true);
  const pass = env("TOCONLINE_WEB_PASSWORD", true);
  const template = env("TOCONLINE_RPA_DOCUMENT_URL_TEMPLATE");

  mkdirSync(OUT, { recursive: true });
  mkdirSync(SCREENSHOTS, { recursive: true });

  const docIds = await resolveDocIds(maxDocs);
  if (!docIds.length) {
    console.error(
      "Sem IDs de documentos. Define uma de:\n" +
        "  TOCONLINE_RPA_DOC_IDS=\"1,2,3\" (manual)\n" +
        "  ou TOCONLINE_ACCESS_TOKEN + TOCONLINE_API_URL (lista via API, até MAX_DOCS)\n",
    );
    process.exit(1);
  }

  if (!template || !template.includes("{id}")) {
    console.error(
      'Define TOCONLINE_RPA_DOCUMENT_URL_TEMPLATE com o URL do detalhe do documento e o placeholder {id}\n' +
        "Exemplo (o caminho real vê-se na barra de endereço após abrires um documento no browser):\n" +
        '  export TOCONLINE_RPA_DOCUMENT_URL_TEMPLATE="https://app17.toconline.pt/algum/caminho/{id}"',
    );
    process.exit(1);
  }

  const headless = env("HEADLESS") !== "false";
  console.log(`[mvp] maxDocs=${maxDocs} headless=${headless} documentos=${docIds.join(",")}`);

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  let loginOk = false;
  try {
    await tryLogin(page, baseUrl, user, pass);
    loginOk = true;
    logLine({ step: "login", ok: true, url: page.url() });
    console.log("[OK] Login concluído (ajusta seletores se o ecrã não for o esperado).");
  } catch (e) {
    const shot = join(SCREENSHOTS, `login-error-${Date.now()}.png`);
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
    logLine({ step: "login", ok: false, error: String(e?.message || e), screenshot: shot });
    console.error("[FAIL] Login:", e);
    console.error(`Screenshot: ${shot}`);
    await browser.close();
    process.exit(1);
  }

  for (const docId of docIds) {
    const url = docUrl(template, docId);
    const entry = {
      step: "document",
      docId,
      url,
      contabilidade: false,
      obraText: null,
      downloadPath: null,
      ok: false,
    };
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await new Promise((r) => setTimeout(r, 1500));
      entry.contabilidade = await openContabilidade(page);
      entry.obraText = await extractObraText(page);
      entry.downloadPath = await tryDownloadFirstAttachment(page, docId);
      entry.ok = Boolean(entry.downloadPath || entry.obraText);
      logLine(entry);
      console.log(
        `[doc ${docId}] contabilidade=${entry.contabilidade} obra=${entry.obraText ? "sim" : "não"} download=${entry.downloadPath ? "sim" : "não"}`,
      );
    } catch (e) {
      const shot = join(SCREENSHOTS, `doc-${docId}-${Date.now()}.png`);
      await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
      entry.error = String(e?.message || e);
      entry.screenshot = shot;
      logLine(entry);
      console.error(`[FAIL] doc ${docId}:`, e);
      console.error(`Screenshot: ${shot}`);
    }
  }

  await browser.close();
  console.log(`[mvp] Logs em ${LOGS}/`);
  console.log(`[mvp] Downloads em ${DOWNLOADS}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
