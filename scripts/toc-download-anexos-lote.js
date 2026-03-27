#!/usr/bin/env node
"use strict";

/**
 * TOConline - Download em lote de anexos de faturas de compra.
 *
 * Requisitos:
 * - Node.js + Playwright
 * - VM Linux
 *
 * Execução (exemplo):
 *   node scripts/toc-download-anexos-lote.js --chunk-size=20 --start=0 --limit=9999
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { chromium } = require("playwright");

const DEFAULT_LIST_URL =
  "https://app17.toconline.pt/purchases/invoices?documentType=FC&date=2025-12-23%2C2026-03-23";

const ROOT = process.cwd();
const AUTH_DIR = path.join(ROOT, ".auth");
const AUTH_FILE = path.join(AUTH_DIR, "toconline.json");
const OUT_BASE = path.join(ROOT, "downloads", "toconline-anexos");
const OUT_FILES = path.join(OUT_BASE, "files");
const OUT_LOGS = path.join(OUT_BASE, "logs");
const STATE_FILE = path.join(OUT_LOGS, "state.json");
const CSV_FILE = path.join(OUT_LOGS, "results.csv");

const DOCUMENT_URL = (id) => `https://app17.toconline.pt/rus/purchases/documents/${id}/edit`;
const EXT_RE = /\.(jpe?g|png|pdf)\b/i;

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function parseArgs(argv) {
  const out = {
    listUrl: DEFAULT_LIST_URL,
    chunkSize: 20,
    start: 0,
    limit: 9999,
    retryErrors: false,
    headless: true,
    docDelayMs: 700,
    anexoDelayMs: 350,
    debugList: false,
  };

  for (const arg of argv) {
    if (arg.startsWith("--chunk-size=")) out.chunkSize = intOr(arg.split("=")[1], 20);
    else if (arg.startsWith("--start=")) out.start = intOr(arg.split("=")[1], 0);
    else if (arg.startsWith("--limit=")) out.limit = intOr(arg.split("=")[1], 9999);
    else if (arg === "--retry-errors") out.retryErrors = true;
    else if (arg.startsWith("--list-url=")) out.listUrl = arg.slice("--list-url=".length);
    else if (arg === "--headed") out.headless = false;
    else if (arg === "--debug-list") out.debugList = true;
    else if (arg.startsWith("--doc-delay-ms=")) out.docDelayMs = intOr(arg.split("=")[1], 700);
    else if (arg.startsWith("--anexo-delay-ms=")) out.anexoDelayMs = intOr(arg.split("=")[1], 350);
  }
  return out;
}

function intOr(v, fallback) {
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : fallback;
}

function ensureDirs() {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.mkdirSync(OUT_FILES, { recursive: true });
  fs.mkdirSync(OUT_LOGS, { recursive: true });
}

function waitEnter(promptText) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(promptText, () => {
      rl.close();
      resolve();
    });
  });
}

function env(name) {
  return String(process.env[name] || "").trim();
}

function stripAccents(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeName(s) {
  return stripAccents(String(s || ""))
    .replace(/[\/\\:*?"<>|]/g, " ")
    .replace(/[^\w.\- ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toDataIso(ddmmyyyy) {
  const m = String(ddmmyyyy || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return "";
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function readState() {
  if (!fs.existsSync(STATE_FILE)) return { entries: {}, updatedAt: new Date().toISOString() };
  try {
    const j = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    if (!j || typeof j !== "object" || typeof j.entries !== "object") {
      return { entries: {}, updatedAt: new Date().toISOString() };
    }
    return j;
  } catch {
    return { entries: {}, updatedAt: new Date().toISOString() };
  }
}

function saveState(state) {
  state.updatedAt = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

function ensureCsvHeader() {
  if (fs.existsSync(CSV_FILE)) return;
  const header = [
    "docId",
    "numero",
    "fornecedor",
    "data",
    "total",
    "anexoIndex",
    "status",
    "fileName",
    "error",
    "processedAt",
  ];
  fs.writeFileSync(CSV_FILE, `${header.join(",")}\n`, "utf8");
}

function csvEscape(v) {
  const s = String(v == null ? "" : v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function appendCsvRow(row) {
  const cols = [
    row.docId,
    row.numero,
    row.fornecedor,
    row.data,
    row.total,
    row.anexoIndex,
    row.status,
    row.fileName,
    row.error,
    row.processedAt,
  ];
  fs.appendFileSync(CSV_FILE, `${cols.map(csvEscape).join(",")}\n`, "utf8");
}

function stateKey(docId, idx) {
  return `${docId}__${String(idx).padStart(2, "0")}`;
}

function deepWalk(value, visitor) {
  if (value == null) return;
  if (Array.isArray(value)) {
    for (const v of value) deepWalk(v, visitor);
    return;
  }
  if (typeof value !== "object") return;
  visitor(value);
  for (const v of Object.values(value)) deepWalk(v, visitor);
}

function normalizeDocFromAnyObject(obj) {
  if (!obj || typeof obj !== "object") return null;

  const idRaw =
    obj.document_id ??
    obj.documentId ??
    obj.id ??
    obj.document?.id ??
    obj.attributes?.id ??
    null;
  const id = idRaw == null ? "" : String(idRaw).trim();
  if (!/^\d+$/.test(id)) return null;

  const numero =
    obj.number ??
    obj.numero ??
    obj.document_number ??
    obj.code ??
    obj.attributes?.number ??
    "";

  const fornecedor =
    obj.supplier_name ??
    obj.supplier ??
    obj.vendor ??
    obj.provider ??
    obj.partner_name ??
    obj.attributes?.supplier_name ??
    "";

  const data =
    obj.date ??
    obj.document_date ??
    obj.issue_date ??
    obj.attributes?.date ??
    obj.attributes?.document_date ??
    "";

  const total =
    obj.total ??
    obj.total_amount ??
    obj.amount_total ??
    obj.attributes?.total ??
    obj.attributes?.total_amount ??
    "";

  return {
    id,
    href: `https://app17.toconline.pt/rus/purchases/documents/${id}/edit`,
    numero: String(numero || "").trim(),
    fornecedor: String(fornecedor || "").trim(),
    data: String(data || "").trim(),
    total: String(total || "").trim(),
    _raw: "fallback_network_json",
  };
}

function extractDocsFromJsonPayload(payload) {
  const out = [];
  deepWalk(payload, (obj) => {
    const d = normalizeDocFromAnyObject(obj);
    if (d) out.push(d);
  });
  return out;
}

async function createContextAndEnsureLogin(browser, opts) {
  if (fs.existsSync(AUTH_FILE)) {
    const context = await browser.newContext({
      storageState: AUTH_FILE,
      acceptDownloads: true,
    });
    const page = await context.newPage();
    await page.goto(opts.listUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
    const loginVisible = await hasLoginForm(page);
    if (!isLikelyLoggedOut(page.url()) && !loginVisible) return { context, page };
    await context.close();
    console.log("[auth] storageState expirado; vai renovar sessão.");
  }

  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  await page.goto(opts.listUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
  const envLoginOk = await tryEnvLogin(page);
  if (envLoginOk) {
    console.log("[auth] Login automático por TOCONLINE_WEB_USER/TOCONLINE_WEB_PASSWORD: OK");
  } else {
    console.log("[auth] Faz login manual no browser aberto.");
    await waitEnter("[auth] Depois do login completo, prime Enter para continuar...");
  }
  await context.storageState({ path: AUTH_FILE });
  console.log(`[auth] storageState guardado em ${AUTH_FILE}`);
  return { context, page };
}

function isLikelyLoggedOut(url) {
  return /login|auth|oauth|signin/i.test(String(url || ""));
}

async function hasLoginForm(page) {
  try {
    const c = await page
      .locator(
        'input[type="email"], input[name="email"], input[name="username"], input[type="password"], button[type="submit"]',
      )
      .count();
    return c > 0;
  } catch {
    return false;
  }
}

async function tryEnvLogin(page) {
  const user = env("TOCONLINE_WEB_USER");
  const pass = env("TOCONLINE_WEB_PASSWORD");
  if (!user || !pass) return false;

  const emailLoc = page.locator(
    'input[type="email"], input[name="email"], input[name="username"], #email',
  );
  const passLoc = page.locator('input[type="password"]');
  const submitLoc = page.locator(
    'button[type="submit"], button:has-text("Entrar"), button:has-text("Login"), [data-testid="login-submit"]',
  );

  try {
    await emailLoc.first().waitFor({ state: "visible", timeout: 20_000 });
    await emailLoc.first().fill(user);
    await passLoc.first().fill(pass);
    await submitLoc.first().click({ timeout: 10_000 });
    await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
    await delay(1200);
    const stillLogin = (await hasLoginForm(page)) || isLikelyLoggedOut(page.url());
    return !stillLogin;
  } catch {
    return false;
  }
}

async function collectVisibleRows(page, listUrl, debugList = false) {
  const networkDocs = [];
  const seenResp = new Set();
  const onResponse = async (resp) => {
    try {
      const url = resp.url();
      if (!/purchases|invoice|document|commercial/i.test(url)) return;
      if (seenResp.has(url)) return;
      const ct = (resp.headers()["content-type"] || "").toLowerCase();
      if (!ct.includes("json")) return;
      const status = resp.status();
      if (status < 200 || status >= 300) return;
      const json = await resp.json().catch(() => null);
      if (!json) return;
      const docs = extractDocsFromJsonPayload(json);
      if (docs.length) {
        seenResp.add(url);
        networkDocs.push(...docs);
      }
    } catch {
      // ignore
    }
  };

  page.on("response", onResponse);
  await page.goto(listUrl, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
  await delay(1500);
  page.off("response", onResponse);

  const rows = await page.evaluate((dbg) => {
    const out = [];
    const debug = {
      allLinks: 0,
      matchedDocLinks: 0,
      matchedGeneric: 0,
      rowLikeFound: 0,
      url: location.href,
      title: document.title || "",
      bodyLen: (document.body?.innerText || "").length,
      loginHints: false,
      samples: [],
      genericSamples: [],
    };

    const base = "https://app17.toconline.pt";
    const docIdFromText = (txt) => {
      const m = String(txt || "").match(/\/documents\/(\d+)(?:\/edit)?/i);
      return m ? m[1] : "";
    };
    const toAbs = (u) => {
      if (!u) return "";
      if (/^https?:\/\//i.test(u)) return u;
      if (u.startsWith("/")) return `${base}${u}`;
      return `${base}/${u}`;
    };

    const links = Array.from(document.querySelectorAll("a[href]"));
    debug.allLinks = links.length;

    const rxLogin = /login|entrar|autentic|sign in/i;
    debug.loginHints = rxLogin.test(document.body?.innerText || "") || rxLogin.test(document.title || "");

    for (const link of links) {
      const href = link.getAttribute("href") || "";
      const id = docIdFromText(href);
      if (!id) continue;
      debug.matchedDocLinks += 1;
      const hrefAbs = toAbs(href.includes("/edit") ? href : `/rus/purchases/documents/${id}/edit`);

      const rowLike =
        link.closest("tr") ||
        link.closest('[role="row"]') ||
        link.closest(".rdg-row") ||
        link.closest(".row") ||
        link.parentElement;
      if (!rowLike) continue;
      debug.rowLikeFound += 1;

      const rowText = (rowLike.textContent || "").replace(/\s+/g, " ").trim();
      const parts = rowText
        .split(/\s{2,}|\s\|\s| · /)
        .map((s) => s.trim())
        .filter(Boolean);

      const dateCell = parts.find((c) => /^\d{2}\/\d{2}\/\d{4}$/.test(c)) || "";
      const numberCell =
        parts.find((c) => /\b(FC|FT|FR|FAC|NC|ND)\b/i.test(c)) ||
        (link.textContent || "").trim() ||
        parts[0] ||
        "";
      const totalCell =
        parts.find((c) => /(\d+[.,]\d{2})/.test(c) && /€|eur/i.test(c)) ||
        parts.find((c) => /(\d+[.,]\d{2})/.test(c)) ||
        "";

      let supplierCell = "";
      for (const c of parts) {
        if (!c || c === dateCell || c === numberCell || c === totalCell) continue;
        if (/^(\d+[.,]\d{2}|€|eur)$/i.test(c)) continue;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(c)) continue;
        supplierCell = c;
        break;
      }

      out.push({
        id,
        href: hrefAbs,
        numero: numberCell,
        fornecedor: supplierCell,
        data: dateCell,
        total: totalCell,
        _raw: rowText,
      });
      if (dbg && debug.samples.length < 5) {
        debug.samples.push({
          id,
          href: hrefAbs,
          numero: numberCell,
          fornecedor: supplierCell,
          data: dateCell,
          total: totalCell,
        });
      }
    }

    // Fallback: elementos sem <a>, mas com doc id em atributos/onclick/router.
    const generic = Array.from(document.querySelectorAll("*"));
    for (const el of generic) {
      const attrs = [];
      for (const a of Array.from(el.attributes || [])) {
        if (
          /href|data-href|routerlink|onclick|ng-reflect-router-link|data-url|to/i.test(a.name) ||
          /documents/i.test(a.value)
        ) {
          attrs.push(`${a.name}=${a.value}`);
        }
      }
      if (!attrs.length) continue;
      const all = attrs.join(" | ");
      const id = docIdFromText(all);
      if (!id) continue;
      debug.matchedGeneric += 1;
      if (dbg && debug.genericSamples.length < 5) debug.genericSamples.push(all.slice(0, 180));
      const hrefAbs = `${base}/rus/purchases/documents/${id}/edit`;
      const rowLike =
        el.closest("tr") ||
        el.closest('[role="row"]') ||
        el.closest(".rdg-row") ||
        el.closest(".row") ||
        el.parentElement;
      if (!rowLike) continue;
      const rowText = (rowLike.textContent || "").replace(/\s+/g, " ").trim();
      const parts = rowText
        .split(/\s{2,}|\s\|\s| · /)
        .map((s) => s.trim())
        .filter(Boolean);
      const dateCell = parts.find((c) => /^\d{2}\/\d{2}\/\d{4}$/.test(c)) || "";
      const numberCell = parts.find((c) => /\b(FC|FT|FR|FAC|NC|ND)\b/i.test(c)) || parts[0] || "";
      const totalCell =
        parts.find((c) => /(\d+[.,]\d{2})/.test(c) && /€|eur/i.test(c)) ||
        parts.find((c) => /(\d+[.,]\d{2})/.test(c)) ||
        "";
      let supplierCell = "";
      for (const c of parts) {
        if (!c || c === dateCell || c === numberCell || c === totalCell) continue;
        if (/^(\d+[.,]\d{2}|€|eur)$/i.test(c)) continue;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(c)) continue;
        supplierCell = c;
        break;
      }
      out.push({
        id,
        href: hrefAbs,
        numero: numberCell,
        fornecedor: supplierCell,
        data: dateCell,
        total: totalCell,
        _raw: rowText,
      });
    }
    return { out, debug };
  }, debugList);

  const dedup = new Map();
  for (const r of rows.out) {
    if (!r.id || !r.href) continue;
    if (!dedup.has(r.id)) dedup.set(r.id, r);
  }

  // Fallback extra: quando SPA não monta DOM em headless, tenta extrair IDs do HTML bruto.
  if (dedup.size === 0) {
    try {
      const html = await page.content();
      const foundIds = new Set();
      for (const m of html.matchAll(/\/documents\/(\d+)(?:\/edit)?/gi)) foundIds.add(m[1]);
      for (const m of html.matchAll(/["']document_id["']\s*:\s*["']?(\d+)["']?/gi)) foundIds.add(m[1]);
      for (const id of foundIds) {
        dedup.set(String(id), {
          id: String(id),
          href: `https://app17.toconline.pt/rus/purchases/documents/${id}/edit`,
          numero: "",
          fornecedor: "",
          data: "",
          total: "",
          _raw: "fallback_html",
        });
      }
      if (debugList) {
        console.log(`[debug-list] fallback_html_ids=${foundIds.size} htmlLen=${html.length}`);
      }
    } catch {
      if (debugList) console.log("[debug-list] fallback_html_ids=0 html_read_error=true");
    }
  }

  // Fallback por respostas JSON da própria página (XHR/fetch).
  if (dedup.size === 0 && networkDocs.length) {
    for (const d of networkDocs) {
      if (!d.id || !d.href) continue;
      if (!dedup.has(d.id)) dedup.set(d.id, d);
    }
    if (debugList) {
      console.log(`[debug-list] fallback_network_docs=${networkDocs.length} dedupAfterNetwork=${dedup.size}`);
    }
  }

  const list = [...dedup.values()].map((r) => ({ ...r, dataIso: toDataIso(r.data) }));
  const valid = list.filter((r) => r.id && r.href);
  if (debugList) {
    console.log(
      `[debug-list] url=${rows.debug.url} title="${rows.debug.title}" bodyLen=${rows.debug.bodyLen} loginHints=${rows.debug.loginHints}`,
    );
    console.log(
      `[debug-list] links=${rows.debug.allLinks} matchedDocLinks=${rows.debug.matchedDocLinks} matchedGeneric=${rows.debug.matchedGeneric} rowLike=${rows.debug.rowLikeFound} dedupValid=${valid.length}`,
    );
    for (const s of rows.debug.samples) {
      console.log(
        `[debug-list] sample id=${s.id} numero="${s.numero || ""}" fornecedor="${s.fornecedor || ""}" data="${s.data || ""}" total="${s.total || ""}" href=${s.href}`,
      );
    }
    for (const gs of rows.debug.genericSamples || []) {
      console.log(`[debug-list] generic ${gs}`);
    }
  }
  return valid;
}

async function openAnexosTab(page) {
  const strategies = [
    async () => page.getByRole("tab", { name: /Anexos/i }).first().click({ timeout: 10_000 }),
    async () => page.getByRole("link", { name: /Anexos/i }).first().click({ timeout: 10_000 }),
    async () => page.getByRole("button", { name: /Anexos/i }).first().click({ timeout: 10_000 }),
    async () => page.getByText(/Anexos/i).first().click({ timeout: 10_000 }),
  ];
  for (const fn of strategies) {
    try {
      await fn();
      await delay(700);
      return true;
    } catch {
      // next
    }
  }
  return false;
}

async function collectAnexoItems(page) {
  const items = await page.evaluate(() => {
    const rx = /(via\s+email)|\.(jpg|jpeg|png|pdf)\b/i;
    const nodes = Array.from(document.querySelectorAll("a,button,li,div,span"));
    const found = [];
    for (const n of nodes) {
      const txt = (n.textContent || "").replace(/\s+/g, " ").trim();
      if (!txt) continue;
      if (!rx.test(txt)) continue;
      const r = n.getBoundingClientRect();
      if (r.width < 3 || r.height < 3) continue;
      found.push(txt);
    }
    const uniq = [];
    const seen = new Set();
    for (const t of found) {
      const key = t.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      uniq.push(t);
    }
    return uniq;
  });

  return items.filter((t) => /(via\s+email)|\.(jpg|jpeg|png|pdf)\b/i.test(t));
}

async function clickDownloadButton(page) {
  const tries = [
    async () => {
      const l = page.getByTitle(/Download ficheiro/i).first();
      await l.waitFor({ state: "visible", timeout: 10_000 });
      await l.click({ timeout: 10_000 });
    },
    async () => {
      const l = page.locator('[title*="Download ficheiro"]').first();
      await l.waitFor({ state: "visible", timeout: 10_000 });
      await l.click({ timeout: 10_000 });
    },
    async () => {
      const l = page.getByText(/Download ficheiro/i).first();
      await l.waitFor({ state: "visible", timeout: 10_000 });
      await l.click({ timeout: 10_000 });
    },
  ];

  for (const fn of tries) {
    try {
      await fn();
      return true;
    } catch {
      // next
    }
  }
  return false;
}

async function processDocument(page, doc, state, opts, summary, pos, totalDocs) {
  const docUrl = DOCUMENT_URL(doc.id);
  await page.goto(docUrl, { waitUntil: "load", timeout: 120_000 });
  await page.waitForLoadState("networkidle", { timeout: 45_000 }).catch(() => {});

  console.log(`[${pos}/${totalDocs}] doc ${doc.id} ...`);

  const anexosOk = await openAnexosTab(page);
  if (!anexosOk) {
    summary.errors += 1;
    await registerResult(
      state,
      {
        ...doc,
        anexoIndex: "",
        status: "erro",
        fileName: "",
        error: "tab_anexos_nao_encontrado",
      },
      "00",
    );
    return;
  }

  const items = await collectAnexoItems(page);
  if (!items.length) {
    summary.docsSemAnexo += 1;
    await registerResult(
      state,
      {
        ...doc,
        anexoIndex: "",
        status: "sem_anexo",
        fileName: "",
        error: "",
      },
      "00",
    );
    return;
  }

  let idx = 0;
  for (const itemText of items) {
    idx += 1;
    const idx2 = String(idx).padStart(2, "0");
    const key = stateKey(doc.id, idx2);
    const old = state.entries[key];

    if (opts.retryErrors) {
      if (!old || old.status !== "erro") continue;
    } else if (old && old.status === "ok") {
      continue;
    }

    try {
      const target = page.getByText(itemText, { exact: false }).first();
      await target.scrollIntoViewIfNeeded({ timeout: 10_000 }).catch(() => {});
      await target.click({ timeout: 12_000 });
      await delay(opts.anexoDelayMs);

      const dlPromise = page.waitForEvent("download", { timeout: 90_000 });
      const clicked = await clickDownloadButton(page);
      if (!clicked) {
        throw new Error("botao_download_nao_encontrado");
      }
      const download = await dlPromise;
      const suggested = download.suggestedFilename() || `anexo_${doc.id}_${idx2}.bin`;
      const ext = path.extname(suggested) || ".bin";

      const fileName = normalizeName(
        `${doc.dataIso || "sem-data"}_${doc.fornecedor || "sem-fornecedor"}_${doc.numero || "sem-numero"}_${doc.total || "sem-total"}_${doc.id}_${idx2}${ext}`,
      );

      const outPath = path.join(OUT_FILES, fileName);
      await download.saveAs(outPath);
      summary.totalAnexosDownloaded += 1;

      await registerResult(
        state,
        {
          ...doc,
          anexoIndex: idx2,
          status: "ok",
          fileName,
          error: "",
        },
        idx2,
      );
    } catch (e) {
      summary.errors += 1;
      await registerResult(
        state,
        {
          ...doc,
          anexoIndex: idx2,
          status: "erro",
          fileName: "",
          error: (e && e.message) || String(e),
        },
        idx2,
      );
    }

    await delay(opts.anexoDelayMs);
  }
}

async function registerResult(state, row, idxKey) {
  const processedAt = new Date().toISOString();
  const stateK = stateKey(row.id || row.docId, idxKey);

  const st = {
    docId: row.id || row.docId || "",
    numero: row.numero || "",
    fornecedor: row.fornecedor || "",
    data: row.data || "",
    total: row.total || "",
    anexoIndex: row.anexoIndex || "",
    status: row.status || "",
    fileName: row.fileName || "",
    error: row.error || "",
    processedAt,
  };

  state.entries[stateK] = st;
  saveState(state);
  appendCsvRow(st);
}

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  ensureDirs();
  ensureCsvHeader();

  const state = readState();
  const summary = {
    totalDocs: 0,
    totalAnexosDownloaded: 0,
    docsSemAnexo: 0,
    errors: 0,
  };

  const browser = await chromium.launch({ headless: opts.headless });
  const { context, page } = await createContextAndEnsureLogin(browser, opts);

  try {
    const docs = await collectVisibleRows(page, opts.listUrl, opts.debugList);
    const sliced = docs.slice(opts.start, opts.start + opts.limit);
    summary.totalDocs = sliced.length;

    const chunks = chunkArray(sliced, Math.max(1, opts.chunkSize));
    let processed = 0;

    for (const ch of chunks) {
      for (const doc of ch) {
        processed += 1;
        await processDocument(page, doc, state, opts, summary, processed, sliced.length);
        await delay(opts.docDelayMs);
      }
    }

    console.log("\n=== Resumo final ===");
    console.log(`total docs: ${summary.totalDocs}`);
    console.log(`total anexos descarregados: ${summary.totalAnexosDownloaded}`);
    console.log(`docs sem anexo: ${summary.docsSemAnexo}`);
    console.log(`erros: ${summary.errors}`);
    console.log(`state.json: ${STATE_FILE}`);
    console.log(`results.csv: ${CSV_FILE}`);
    console.log(`files: ${OUT_FILES}`);
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

main().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});

