#!/usr/bin/env node
/**
 * MVP RPA TOConline — Playwright
 *
 * Ordem de prioridade (recomendado):
 *   1) IDs manuais (TOCONLINE_RPA_DOC_IDS) — primeiro teste sem API
 *   2) Abrir documento → separador Anexos → download (sucesso mínimo)
 *   3) Obra / Contabilidade — best-effort; nunca bloqueia o download
 *
 * Template por defeito (se não definires TOCONLINE_RPA_DOCUMENT_URL_TEMPLATE):
 *   {TOCONLINE_APP_BASE_URL}/rus/purchases/documents/{id}/edit
 *
 * Ver: docs/toconline-rpa-mvp.md
 */

import { mkdirSync, appendFileSync, existsSync } from "fs";
import { join, dirname, resolve, extname, basename } from "path";
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
const SESSIONS = join(OUT, "sessions");

/** Timeouts por ação crítica (ms) — ajustar se a rede for lenta */
const TIMEOUTS = {
  loginGoto: 120_000,
  loginFieldVisible: 60_000,
  loginNetworkIdle: 120_000,
  gotoDocument: 120_000,
  postGotoSettle: 1500,
  documentNetworkIdle: 60_000,
  documentTabsVisible: 45_000,
  openAnexosTab: 20_000,
  openContabilidadeTab: 15_000,
  downloadClick: 20_000,
  /** PDFs / fila de impressão no TOConline podem demorar — 10–15s costuma ser curto */
  downloadEvent: 150_000,
  obraExtract: 12_000,
};

/** Espera extra após o documento carregar (SPA); ex.: 2000–5000 se os separadores aparecem tarde */
function postDocLoadExtraMs() {
  const raw = env("TOCONLINE_RPA_POST_DOC_LOAD_MS");
  if (raw) {
    const n = parseInt(raw, 10);
    if (n >= 0) return n;
  }
  return 0;
}

function downloadEventTimeoutMs() {
  const raw = env("TOCONLINE_RPA_DOWNLOAD_TIMEOUT_MS");
  if (raw) {
    const n = parseInt(raw, 10);
    if (n >= 5_000) return n;
  }
  return TIMEOUTS.downloadEvent;
}

const SEM_OBRA = "SEM_OBRA_IDENTIFICADA";
const UNKNOWN = "UNKNOWN";

// #region agent log (debug)
const DEBUG_ENDPOINT =
  "http://localhost:7639/ingest/d74f1ab2-593a-44ee-8d0a-f3ad684fc08f";
const DEBUG_SESSION_ID = "2bc5ca";

function debugIngest(payload) {
  return fetch(DEBUG_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": DEBUG_SESSION_ID,
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
// #endregion

function hintPlaywrightLaunchFailed(err) {
  const msg = String(err?.message || err || "");
  const likelyMissingLibs =
    /libnspr4|shared libraries|cannot open shared object|libnss3|libgbm|exitCode=127/i.test(msg);
  console.error(
    likelyMissingLibs
      ? `
[ERRO] Chromium não arrancou — faltam bibliotecas de sistema (típico em VM Debian/Ubuntu minimal).

  Na raiz do projeto (sudo precisa do teu PATH se usas nvm/fnm):
    sudo env "PATH=$PATH" npx playwright install-deps chromium
    npx playwright install chromium

  Se sudo disser «npx: command not found», usa:
    sudo "$(command -v npx)" playwright install-deps chromium

  Docs: scripts/toconline-rpa/README.md — «Linux / VM»
`
      : `
[ERRO] Falha ao lançar Chromium: ${msg.slice(0, 200)}

  VM Linux — dependências (com PATH para nvm/fnm):
    sudo env "PATH=$PATH" npx playwright install-deps chromium

  SSH sem ecrã: não uses HEADLESS=false (usa headless por defeito).
`,
  );
}

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
  console.warn(
    "[mvp] Aviso: a usar IDs da API. Para o primeiro teste recomenda-se TOCONLINE_RPA_DOC_IDS (ex.: 3059) sem API.\n",
  );
  return fetchDocumentIdsFromApi(maxDocs);
}

function defaultDocumentTemplate(appBase) {
  const b = appBase.replace(/\/$/, "");
  return `${b}/rus/purchases/documents/{id}/edit`;
}

function docUrl(template, id) {
  return template.replace(/\{id\}/g, String(id));
}

function sanitizePart(s, maxLen = 100) {
  if (s == null || !String(s).trim()) return UNKNOWN;
  return String(s)
    .trim()
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, maxLen);
}

/**
 * @param {string} suggestedFilename — nome sugerido pelo browser
 */
function buildSavedFilename(docId, supplier, date, number, suggestedFilename) {
  const ext = extname(suggestedFilename || "") || ".bin";
  const base = `${sanitizePart(docId)}_${sanitizePart(supplier)}_${sanitizePart(date)}_${sanitizePart(number)}${ext}`;
  return base.replace(/_{2,}/g, "_");
}

function logLine(obj) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...obj }) + "\n";
  mkdirSync(LOGS, { recursive: true });
  const file = join(LOGS, `run-${new Date().toISOString().slice(0, 10)}.jsonl`);
  appendFileSync(file, line, "utf8");
  return file;
}

/** Deteta sessão suspensa / inatividade / pedido de novo login */
async function detectSessionIssue(page) {
  const url = page.url();
  if (/login|signin|auth|oauth/i.test(url) && !/edit/.test(url)) {
    return { type: "redirect_login", detail: url };
  }
  let bodyText = "";
  try {
    bodyText = (await page.locator("body").innerText({ timeout: 5_000 })).slice(0, 30_000);
  } catch {
    return { type: "unknown", detail: "" };
  }
  const patterns = [
    /sess[aã]o\s+(terminada|expirada|suspensa)/i,
    /inatividade/i,
    /inativo\s+por/i,
    /volt[aá]\s+a\s+fazer\s+login/i,
    /session\s+(expired|invalid)/i,
  ];
  for (const p of patterns) {
    if (p.test(bodyText)) return { type: "session_message", detail: bodyText.slice(0, 500) };
  }
  return null;
}

async function tryLogin(page, baseUrl, user, pass) {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: TIMEOUTS.loginGoto });
  await page.locator(SELECTORS.email).first().waitFor({ state: "visible", timeout: TIMEOUTS.loginFieldVisible });
  await page.locator(SELECTORS.email).first().fill(user);
  await page.locator(SELECTORS.password).first().fill(pass);
  await page.locator(SELECTORS.submit).first().click();
  await page.waitForLoadState("networkidle", { timeout: TIMEOUTS.loginNetworkIdle }).catch(() => {});
}

/**
 * SPA: esperar painel do documento (tabs ou texto no body / #app / main).
 * `domcontentloaded` no goto deixa frequentemente body vazio — o bundle ainda não correu.
 */
async function waitForDocumentReady(page) {
  await new Promise((r) => setTimeout(r, TIMEOUTS.postGotoSettle));
  const extra = postDocLoadExtraMs();
  if (extra > 0) await new Promise((r) => setTimeout(r, extra));

  await page.waitForLoadState("networkidle", { timeout: TIMEOUTS.documentNetworkIdle }).catch(() => {});

  const hydrated = await page
    .waitForFunction(
      () => {
        const tabs = document.querySelectorAll('[role="tab"]');
        if (tabs.length > 0) return true;
        const raw = document.body?.innerText || "";
        if (raw.length > 100) return true;
        const roots = document.querySelectorAll("main, [role='main'], #app, [id='app'], [data-reactroot]");
        for (const el of roots) {
          if ((el.textContent || "").trim().length > 60) return true;
        }
        return /Comercial|Anexos|Contabilidade|Attachments|Compras|fornecedor|documento/i.test(raw);
      },
      { timeout: 90_000 },
    )
    .then(() => true)
    .catch(() => false);

  if (!hydrated) {
    console.warn(
      "[mvp] Aviso: após 90s o body ainda parece vazio (SPA não hidratou?). Confirma URL, HEADLESS, ou corre com xvfb-run.",
    );
  }

  await page
    .getByRole("tab", { name: /Comercial|Anexos|Contabilidade|Attachments/i })
    .first()
    .waitFor({ state: "visible", timeout: TIMEOUTS.documentTabsVisible })
    .catch(() => {});
}

/**
 * Playwright: locators do `page` **não** atravessam iframes. Muitas SPAs (ex. TOConline)
 * desenham o documento dentro de um iframe — é preciso usar `Frame`.
 *
 * @param {import("playwright").Frame} frame
 */
async function tryClickAnexosInFrame(frame) {
  const namePatterns = [/^Anexos$/i, /Anexos/i, /^Attachments$/i, /Attachments/i];
  /** @type {Array<() => import("playwright").Locator>} */
  const strategies = [];

  strategies.push(
    () => frame.locator('[role="tab"]').filter({ hasText: /Anexos/i }),
    () => frame.locator('[role="tab"]').filter({ hasText: /Attachments/i }),
  );

  for (const name of namePatterns) {
    strategies.push(
      () => frame.getByRole("tab", { name }),
      () => frame.getByRole("link", { name }),
      () => frame.getByRole("button", { name }),
    );
  }
  strategies.push(
    () => frame.locator(SELECTORS.anexosTab),
    () => frame.locator("a, button, [role=\"tab\"], span, div").filter({ hasText: /^Anexos$/ }),
    () => frame.getByText("Anexos", { exact: true }),
    () => frame.getByText(/Anexos/i),
    () => frame.locator("a, button, [role=\"tab\"]").filter({ hasText: /^Attachments$/ }),
    () => frame.locator('xpath=.//*[normalize-space()="Anexos"]'),
    () => frame.locator('xpath=.//*[normalize-space()="Attachments"]'),
  );

  for (const getLoc of strategies) {
    try {
      const loc = getLoc().first();
      if ((await loc.count()) === 0) continue;
      await loc.waitFor({ state: "visible", timeout: 8_000 });
      await loc.scrollIntoViewIfNeeded({ timeout: TIMEOUTS.downloadClick });
      await loc.click({ timeout: TIMEOUTS.openAnexosTab });
      await new Promise((r) => setTimeout(r, 800));
      return true;
    } catch {
      /* clique forçado se overlay / pointer-events */
    }
    try {
      const loc = getLoc().first();
      if ((await loc.count()) === 0) continue;
      await loc.click({ timeout: TIMEOUTS.openAnexosTab, force: true });
      await new Promise((r) => setTimeout(r, 800));
      return true;
    } catch {
      /* seguinte estratégia */
    }
  }
  return false;
}

/**
 * Percorre **todos** os frames (inclui o principal).
 * @param {import("playwright").Page} page
 * @returns {Promise<import("playwright").Frame | null>} frame onde clicou, ou null
 */
async function openAnexos(page) {
  for (const frame of page.frames()) {
    try {
      await frame.waitForLoadState("domcontentloaded", { timeout: 5_000 }).catch(() => {});
    } catch {
      /* */
    }
    if (await tryClickAnexosInFrame(frame)) return frame;
  }
  return null;
}

async function logAnexosDiagnostics(page, docId) {
  const frames = page.frames();
  const bits = [`url=${page.url()}`, `frames=${frames.length}`];

  let bodyLen = 0;
  let bodyKw = "";
  let domSnap = "";
  try {
    const body = (await page.locator("body").innerText()).slice(0, 20_000);
    bodyLen = body.length;
    const keys = [
      "Comercial",
      "Anexos",
      "Contabilidade",
      "Compras",
      "Entrar",
      "Login",
      "erro",
      "permiss",
      "403",
      "404",
      "não encontr",
    ];
    bodyKw = keys.filter((k) => body.toLowerCase().includes(k.toLowerCase())).join("+") || "(nenhum)";
  } catch {
    bodyKw = "?";
  }
  try {
    const ev = await page.evaluate(() => ({
      innerLen: (document.body?.innerText || "").length,
      bodyKids: document.body?.children?.length ?? 0,
      topTags: [...document.querySelectorAll("body > *")]
        .slice(0, 10)
        .map((n) => n.tagName)
        .join(","),
      tabCount: document.querySelectorAll('[role="tab"]').length,
    }));
    domSnap = `innerLen=${ev.innerLen} bodyKids=${ev.bodyKids} topTags=${ev.topTags} tabs=${ev.tabCount}`;
  } catch {
    domSnap = "dom_eval=fail";
  }
  bits.push(`body_len=${bodyLen} body_kw=${bodyKw} ${domSnap}`);

  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    let fu = "";
    try {
      fu = f.url() || "";
    } catch {
      fu = "?";
    }
    let nExact = 0;
    let nLoose = 0;
    let nTabs = 0;
    try {
      nExact = await f.getByText("Anexos", { exact: true }).count();
    } catch {
      nExact = -1;
    }
    try {
      nLoose = await f.getByText(/Anexos/i).count();
    } catch {
      nLoose = -1;
    }
    try {
      nTabs = await f.locator('[role="tab"]').count();
    } catch {
      nTabs = -1;
    }
    bits.push(`f${i}:${fu.slice(0, 55)} Anexos_ex=${nExact} Anexos_re=${nLoose} tabs=${nTabs}`);
  }
  console.warn(`[debug ${docId}] ${bits.join(" | ")}`);
}

/**
 * @param {import("playwright").Frame} ctx
 */
async function openContabilidade(ctx) {
  try {
    await ctx.getByRole("tab", { name: /Contabilidade/i }).first().click({ timeout: TIMEOUTS.openContabilidadeTab });
    return true;
  } catch {
    try {
      await ctx.locator(SELECTORS.contabilidadeTab).first().click({ timeout: TIMEOUTS.openContabilidadeTab });
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * @param {import("playwright").Frame} ctx
 */
async function extractObraText(ctx) {
  try {
    const loc = ctx.locator(SELECTORS.obraOrCentro).first();
    await loc.waitFor({ state: "visible", timeout: TIMEOUTS.obraExtract });
    const t = await loc.innerText();
    if ((t || "").trim()) return (t || "").trim().slice(0, 500);
  } catch {
    /* continue */
  }
  try {
    const byText = ctx.getByText(/Centro de custo|Obra/i).first();
    await byText.waitFor({ state: "visible", timeout: 8_000 });
    const t = await byText.innerText();
    return (t || "").trim().slice(0, 500) || null;
  } catch {
    return null;
  }
}

/**
 * Heurísticas leves — afinar seletores em selectors.example.mjs para melhor naming.
 * @returns {{ supplier: string, date: string, number: string }}
 */
async function extractDocumentMetadata(page) {
  let supplier = "";
  let date = "";
  let number = "";

  if (SELECTORS.supplierField) {
    try {
      supplier = (await page.locator(SELECTORS.supplierField).first().innerText()).trim();
    } catch {
      /* */
    }
  }
  if (SELECTORS.numberField) {
    try {
      number = (await page.locator(SELECTORS.numberField).first().innerText()).trim();
    } catch {
      /* */
    }
  }

  let bodySample = "";
  try {
    bodySample = (await page.locator("body").innerText()).slice(0, 80_000);
  } catch {
    return { supplier: supplier || "", date: "", number: number || "" };
  }

  if (!date) {
    const m = bodySample.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
    if (m) date = m[1];
  }
  if (!number) {
    const m2 = bodySample.match(/\bFT\s+[\w./-]+\b/i);
    if (m2) number = m2[0].trim();
  }
  if (!supplier) {
    const lda = bodySample.match(/\b[\w\s&.,'-]+(?:LDA|SA|S\.A\.)\b/i);
    if (lda) supplier = lda[0].trim().slice(0, 120);
  }

  return {
    supplier: supplier || "",
    date: date || "",
    number: number || "",
  };
}

/**
 * Botão de download nos Anexos — rótulos variam (ficheiro vs JPEG, etc.).
 * @param {import("playwright").Frame} frame
 * @returns {Promise<import("playwright").Locator>}
 */
async function resolveDownloadButton(frame) {
  const byFicheiro = frame.getByText(/Download ficheiro/i);
  if ((await byFicheiro.count()) > 0) {
    return byFicheiro.first();
  }
  const byJpeg = frame.locator("text=Download ficheiro JPEG");
  if ((await byJpeg.count()) > 0) {
    return byJpeg.first();
  }
  return frame.locator(SELECTORS.downloadAttachment).first();
}

/**
 * @param {import("playwright").Page} page
 * @param {import("playwright").Frame} frame — contexto do iframe (ou mainFrame)
 */
async function tryDownloadAttachment(page, frame, docId, meta) {
  mkdirSync(DOWNLOADS, { recursive: true });
  const dlTimeout = downloadEventTimeoutMs();
  try {
    const downloadButton = await resolveDownloadButton(frame);
    await downloadButton.scrollIntoViewIfNeeded({ timeout: TIMEOUTS.downloadClick });
    await downloadButton.waitFor({ state: "visible", timeout: TIMEOUTS.downloadClick });
    const dlPromise = page.waitForEvent("download", { timeout: dlTimeout });
    await downloadButton.click({ timeout: TIMEOUTS.downloadClick });
    const download = await dlPromise;
    const suggested = download.suggestedFilename() || `file-${docId}.bin`;
    const finalName = buildSavedFilename(docId, meta.supplier, meta.date, meta.number, suggested);
    const safeName = finalName.replace(/[\\/:*?"<>|]/g, "_").trim();
    const path = join(DOWNLOADS, safeName);
    await download.saveAs(path);
    return path;
  } catch {
    return null;
  }
}

async function processOneDocument(page, template, docId) {
  const url = docUrl(template, docId);
  /** @type {Record<string, unknown>} */
  const row = {
    step: "document",
    docId: String(docId),
    url,
    supplier: "",
    date: "",
    number: "",
    obraText: null,
    resolvedWork: SEM_OBRA,
    downloadStatus: "failed",
    savedPath: null,
    error: null,
    screenshotPath: null,
  };

  try {
    await page.goto(url, { waitUntil: "load", timeout: TIMEOUTS.gotoDocument });
    await waitForDocumentReady(page);

    // #region agent log (afterWaitForDocumentReady)
    const snap1 = await page.evaluate(() => {
      const bodyText = document.body?.innerText || "";
      return {
        readyState: document.readyState,
        title: document.title,
        pathname: location.pathname,
        bodyLen: bodyText.length,
        tabCount: document.querySelectorAll('[role="tab"]').length,
        iframeCount: document.querySelectorAll("iframe").length,
      };
    }).catch(() => null);

    debugIngest({
      sessionId: DEBUG_SESSION_ID,
      runId: "debug-3059",
      hypothesisId: "H1_hydration_or_blank_dom",
      location: "scripts/toconline-rpa/mvp.mjs:afterWaitForDocumentReady",
      message: "DOM snapshot after waitForDocumentReady",
      data: {
        docId: String(docId),
        pageUrl: page.url(),
        snap: snap1,
      },
      timestamp: Date.now(),
    });
    // #endregion

    const sessionIssue = await detectSessionIssue(page);
    if (sessionIssue) {
      const shot = join(SCREENSHOTS, `session-${docId}-${Date.now()}.png`);
      await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
      row.error = `SESSION: ${sessionIssue.type} ${sessionIssue.detail?.slice?.(0, 200) || ""}`;
      row.screenshotPath = shot;
      row.downloadStatus = "failed";
      logLine(row);
      console.error(`[FAIL] doc ${docId} — ${row.error}`);
      console.error(`Screenshot: ${shot}`);
      return row;
    }

    const meta = await extractDocumentMetadata(page);
    row.supplier = meta.supplier;
    row.date = meta.date;
    row.number = meta.number;

    const anexosFrame = await openAnexos(page);
    const workFrame = anexosFrame ?? page.mainFrame();

    if (!anexosFrame) {
      console.warn(
        `[doc ${docId}] Aviso: separador Anexos não abriu em nenhum frame — a tentar download em todos os iframes.`,
      );
      await logAnexosDiagnostics(page, docId);
    }

    // #region agent log (beforeDownloadSnapshot)
    const snap2 = await page.evaluate(() => {
      const bodyText = document.body?.innerText || "";
      return {
        bodyLen: bodyText.length,
        containsAnexos: /Anexos/i.test(bodyText),
        containsAttachments: /Attachments/i.test(bodyText),
        containsDownloads: /download|descarregar|ficheiro/i.test(bodyText),
        tabCount: document.querySelectorAll('[role="tab"]').length,
      };
    }).catch(() => null);

    debugIngest({
      sessionId: DEBUG_SESSION_ID,
      runId: "debug-3059",
      hypothesisId: "H3_label_or_ui_not_mounted",
      location: "scripts/toconline-rpa/mvp.mjs:beforeDownload",
      message: "DOM snapshot before trying download",
      data: {
        docId: String(docId),
        anexosFrame: Boolean(anexosFrame),
        pageUrl: page.url(),
        snap: snap2,
      },
      timestamp: Date.now(),
    });
    // #endregion

    let savedPath = null;
    if (anexosFrame) {
      savedPath = await tryDownloadAttachment(page, anexosFrame, docId, meta);
    } else {
      for (const f of page.frames()) {
        savedPath = await tryDownloadAttachment(page, f, docId, meta);
        if (savedPath) break;
      }
    }
    row.savedPath = savedPath;
    row.downloadStatus = savedPath ? "downloaded" : "failed";

    /** Obra: best-effort na Contabilidade — não bloqueia download */
    let obraText = null;
    const contabOpened = await openContabilidade(workFrame);
    if (contabOpened) {
      obraText = await extractObraText(workFrame);
    }
    row.obraText = obraText;
    row.resolvedWork = obraText && String(obraText).trim() ? String(obraText).trim().slice(0, 500) : SEM_OBRA;

    if (!savedPath) {
      const shot = join(SCREENSHOTS, `download-fail-${docId}-${Date.now()}.png`);
      await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
      row.screenshotPath = shot;
      row.error = row.error || "downloadTimeout ou clique sem evento download";
      console.error(`[FAIL] doc ${docId} — download falhou. Screenshot: ${shot}`);
    }

    logLine(row);
    console.log(
      `[doc ${docId}] download=${row.downloadStatus} saved=${savedPath ? basename(savedPath) : "—"} obra=${row.resolvedWork === SEM_OBRA ? "SEM_OBRA" : "ok"}`,
    );
    return row;
  } catch (e) {
    const shot = join(SCREENSHOTS, `doc-${docId}-${Date.now()}.png`);
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
    row.error = String(e?.message || e);
    row.screenshotPath = shot;
    row.downloadStatus = "failed";
    logLine(row);
    console.error(`[FAIL] doc ${docId}:`, e);
    console.error(`Screenshot: ${shot}`);
    return row;
  }
}

async function main() {
  loadPostmanEnvOptional();
  const maxDocs = parseMaxDocs();
  const baseUrl = env("TOCONLINE_APP_BASE_URL", true);
  const user = env("TOCONLINE_WEB_USER", true);
  const pass = env("TOCONLINE_WEB_PASSWORD", true);

  let template = env("TOCONLINE_RPA_DOCUMENT_URL_TEMPLATE");
  if (!template || !template.includes("{id}")) {
    template = defaultDocumentTemplate(baseUrl);
    console.log(`[mvp] TOCONLINE_RPA_DOCUMENT_URL_TEMPLATE não definido — a usar por defeito:\n      ${template}`);
  }

  mkdirSync(OUT, { recursive: true });
  mkdirSync(DOWNLOADS, { recursive: true });
  mkdirSync(LOGS, { recursive: true });
  mkdirSync(SCREENSHOTS, { recursive: true });
  mkdirSync(SESSIONS, { recursive: true });

  const docIds = await resolveDocIds(maxDocs);
  if (!docIds.length) {
    console.error(
      "Sem IDs de documentos. Define uma de:\n" +
        "  TOCONLINE_RPA_DOC_IDS=\"3059\" (recomendado para o 1.º teste)\n" +
        "  ou TOCONLINE_ACCESS_TOKEN + TOCONLINE_API_URL (lista via API, até MAX_DOCS)\n",
    );
    process.exit(1);
  }

  const headless = env("HEADLESS") !== "false";
  console.log(`[mvp] maxDocs=${maxDocs} headless=${headless} ids=${docIds.join(",")}`);

  let browser;
  try {
    browser = await chromium.launch({ headless });
  } catch (e) {
    hintPlaywrightLaunchFailed(e);
    throw e;
  }
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  try {
    await tryLogin(page, baseUrl, user, pass);
    logLine({
      step: "login",
      docId: "",
      url: page.url(),
      supplier: "",
      date: "",
      number: "",
      obraText: null,
      resolvedWork: "",
      downloadStatus: "ok",
      savedPath: null,
      error: null,
      screenshotPath: null,
    });
    console.log("[OK] Login concluído.");
  } catch (e) {
    const shot = join(SCREENSHOTS, `login-error-${Date.now()}.png`);
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
    logLine({
      step: "login",
      docId: "",
      url: page.url(),
      supplier: "",
      date: "",
      number: "",
      obraText: null,
      resolvedWork: "",
      downloadStatus: "failed",
      savedPath: null,
      error: String(e?.message || e),
      screenshotPath: shot,
    });
    console.error("[FAIL] Login:", e);
    console.error(`Screenshot: ${shot}`);
    await browser.close();
    process.exit(1);
  }

  for (const docId of docIds) {
    await processOneDocument(page, template, docId);
  }

  await browser.close();
  console.log(`[mvp] Logs: ${LOGS}/`);
  console.log(`[mvp] Downloads: ${DOWNLOADS}/`);
  console.log(`[mvp] Screenshots (erros): ${SCREENSHOTS}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
