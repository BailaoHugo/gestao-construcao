"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { TopBar } from "@/components/layout/TopBar";
import {
  ImportCapituloSelector,
  capitulos,
  grandesCapitulos,
} from "@/orcamentos/ImportCapituloSelector";
import type {
  BudgetMeta,
  Capitulo,
  DraftBudgetItem,
  GrandeCapitulo,
} from "@/orcamentos/domain";

function defaultMeta(): BudgetMeta {
  const today = new Date().toISOString().slice(0, 10);
  return {
    tituloProposta: "Proposta de orçamento",
    clienteNome: "",
    clienteEntidade: "",
    clienteContacto: "",
    obraNome: "",
    obraEndereco: "",
    obraNumero: "",
    obraReferencia: "",
    dataProposta: today,
    validadeDias: 30,
    responsavelNome: "",
    responsavelFuncao: "",
    responsavelEmail: "",
    responsavelTelefone: "",
    notasResumo: "",
    codigoInternoObra: "",
  };
}

function buildCodigoInterno(meta: BudgetMeta): string {
  const slug = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const datePart = (meta.dataProposta || "").replace(/-/g, "");
  const numero = meta.obraNumero?.trim() || "s-numero";
  const nome = slug(meta.obraNome || "sem-nome");
  const safeNumero = slug(numero) || "s-numero";
  return [datePart || "s-data", safeNumero, nome].join("-");
}

function createRowId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeHeader(h: string): string {
  return h
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_");
}

/** Encontra índice da coluna por vários nomes possíveis */
function findCol(
  headers: string[],
  normalized: Record<string, number>,
  ...names: string[]
): number {
  for (const n of names) {
    const idx = normalized[n] ?? headers.findIndex((h) => normalizeHeader(h) === n);
    if (idx >= 0) return idx;
  }
  return -1;
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const sep = lines[0].includes(";") ? ";" : ",";
  const rawHeaders = lines[0].split(sep).map((h) => h.trim().replace(/^"|"$/g, ""));
  const normalized: Record<string, number> = {};
  rawHeaders.forEach((h, i) => {
    normalized[normalizeHeader(h)] = i;
  });
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(sep).map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    rawHeaders.forEach((header, j) => {
      row[header] = values[j] ?? "";
    });
    rows.push(row);
  }
  return rows;
}

/** Extrai linhas de texto de um PDF (client-side). */
async function extractLinesFromPdf(arrayBuffer: ArrayBuffer): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist");
  if (typeof window !== "undefined") {
    (pdfjs as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc =
      "/pdf.worker.min.mjs";
  }
  const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const allLines: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const items = content.items as { str: string; transform: number[] }[];
    if (items.length === 0) continue;
    type Item = { str: string; y: number; x: number };
    const withPos: Item[] = items.map((it) => ({
      str: it.str,
      y: it.transform[5] ?? 0,
      x: it.transform[4] ?? 0,
    }));
    withPos.sort((a, b) => {
      const dy = b.y - a.y;
      if (Math.abs(dy) > 2) return dy;
      return a.x - b.x;
    });
    const lineThreshold = 3;
    let currentY = withPos[0]?.y ?? 0;
    let currentLine: string[] = [];
    for (const it of withPos) {
      if (Math.abs(it.y - currentY) > lineThreshold) {
        if (currentLine.length) {
          allLines.push(currentLine.join(" ").trim());
          currentLine = [];
        }
        currentY = it.y;
      }
      currentLine.push(it.str);
    }
    if (currentLine.length) allLines.push(currentLine.join(" ").trim());
  }
  return allLines.filter((l) => l.length > 0);
}

const PDF_ROW_KEYS = ["Código", "Descrição", "Quantidade", "Unidade", "Preço"] as const;

/** Converte linhas de texto (ex.: extraídas de PDF) em linhas com colunas para o importador. */
function pdfLinesToRows(lines: string[]): Record<string, string>[] {
  return lines.map((line) => {
    const trimmed = line.trim();
    const parts = trimmed.split(/\s{2,}|\t/).filter(Boolean);
    if (parts.length >= 4) {
      const qtd = parts[parts.length - 3] ?? "0";
      const unit = parts[parts.length - 2] ?? "un";
      const price = (parts[parts.length - 1] ?? "0").replace(/\s/g, "").replace(",", ".");
      const code = parts[0] ?? "";
      const desc = parts.slice(1, -3).join(" ").trim();
      return {
        [PDF_ROW_KEYS[0]]: code,
        [PDF_ROW_KEYS[1]]: desc,
        [PDF_ROW_KEYS[2]]: qtd,
        [PDF_ROW_KEYS[3]]: unit,
        [PDF_ROW_KEYS[4]]: price,
      };
    }
    return {
      [PDF_ROW_KEYS[0]]: "",
      [PDF_ROW_KEYS[1]]: trimmed,
      [PDF_ROW_KEYS[2]]: "0",
      [PDF_ROW_KEYS[3]]: "un",
      [PDF_ROW_KEYS[4]]: "0",
    };
  });
}

function mapRowToItem(
  row: Record<string, string>,
  codeIdx: number,
  descIdx: number,
  qtdIdx: number,
  unitIdx: number,
  priceIdx: number,
  headers: string[],
): DraftBudgetItem {
  const get = (idx: number) =>
    idx >= 0 && headers[idx] ? String(row[headers[idx]] ?? "").trim() : "";
  const code = codeIdx >= 0 ? get(codeIdx) : "";
  const desc = descIdx >= 0 ? get(descIdx) : "";
  const qtd = qtdIdx >= 0 ? parseFloat(String(row[headers[qtdIdx]] ?? "0").replace(",", ".")) : 0;
  const unit = unitIdx >= 0 ? get(unitIdx) || "un" : "un";
  const pu = priceIdx >= 0 ? parseFloat(String(row[headers[priceIdx]] ?? "0").replace(",", ".")) : 0;
  return {
    rowId: createRowId(),
    code,
    description: desc,
    unit,
    quantity: Number.isFinite(qtd) ? qtd : 0,
    unitPrice: Number.isFinite(pu) ? pu : 0,
    grandeCapituloCode: "?",
    capituloCode: "?",
  };
}

function parseFileToItems(
  rows: Record<string, string>[],
): DraftBudgetItem[] {
  if (rows.length === 0) return [];
  const headers = Object.keys(rows[0]);
  const normalized: Record<string, number> = {};
  headers.forEach((h, i) => {
    normalized[normalizeHeader(h)] = i;
  });
  const codeIdx = findCol(
    headers,
    normalized,
    "codigo",
    "código",
    "code",
    "ref",
    "referencia",
  );
  const descIdx = findCol(
    headers,
    normalized,
    "descricao",
    "descrição",
    "description",
    "designacao",
    "designação",
  );
  const qtdIdx = findCol(
    headers,
    normalized,
    "quantidade",
    "qtd",
    "quantity",
    "qty",
  );
  const unitIdx = findCol(
    headers,
    normalized,
    "unidade",
    "unit",
    "unid",
    "un",
  );
  const priceIdx = findCol(
    headers,
    normalized,
    "preco",
    "preço",
    "pu",
    "unit_price",
    "preco_unitario",
    "preço_unitário",
    "valor_unitario",
    "valor_unitário",
  );
  return rows
    .map((row) =>
      mapRowToItem(row, codeIdx, descIdx, qtdIdx, unitIdx, priceIdx, headers),
    )
    .filter((it) => it.code || it.description || it.quantity > 0 || it.unitPrice > 0);
}

function ModelItemsTable({
  items,
  onRemove,
  grandesCapitulos,
  capitulos,
}: {
  items: DraftBudgetItem[];
  onRemove: (rowId: string) => void;
  grandesCapitulos: GrandeCapitulo[];
  capitulos: Capitulo[];
}) {
  const sorted = [...items].sort((a, b) =>
    `${a.grandeCapituloCode}-${a.capituloCode}-${a.code}`.localeCompare(
      `${b.grandeCapituloCode}-${b.capituloCode}-${b.code}`,
    ),
  );
  let lastGC = "";
  let lastCap = "";
  const rows: React.ReactNode[] = [];

  for (const it of sorted) {
    const needsGC = it.grandeCapituloCode !== lastGC;
    const needsCap = needsGC || it.capituloCode !== lastCap;

    if (needsGC) {
      lastGC = it.grandeCapituloCode;
      const gc = grandesCapitulos.find((g) => g.code === it.grandeCapituloCode);
      rows.push(
        <tr key={`gc-${lastGC}`}>
          <td
            colSpan={6}
            className="bg-slate-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-700"
          >
            {lastGC} — {gc?.description ?? "Grande capítulo"}
          </td>
        </tr>,
      );
    }

    if (needsCap) {
      lastCap = it.capituloCode;
      const cap = capitulos.find((c) => c.code === it.capituloCode);
      rows.push(
        <tr key={`cap-${lastGC}-${lastCap}`}>
          <td
            colSpan={6}
            className="bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-700"
          >
            {lastCap} — {cap?.description ?? "Capítulo"}
          </td>
        </tr>,
      );
    }

    rows.push(
      <tr
        key={it.rowId}
        className="border-b border-slate-100 last:border-0"
      >
        <td className="px-3 py-1.5 font-mono text-[11px] text-slate-800">
          <button
            type="button"
            className="mr-1 text-slate-300 hover:text-red-600"
            aria-label="Remover artigo"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(it.rowId);
            }}
          >
            ×
          </button>
          {it.code || "—"}
        </td>
        <td className="max-w-xs px-3 py-1.5 text-[11px] text-slate-800">
          {it.description || "—"}
        </td>
        <td className="px-3 py-1.5 text-right tabular-nums text-[11px] text-slate-800">
          {it.quantity}
        </td>
        <td className="px-3 py-1.5 text-[11px] text-slate-600">
          {it.unit}
        </td>
        <td className="px-3 py-1.5 text-right tabular-nums text-[11px] text-slate-800">
          {it.unitPrice.toFixed(2)}
        </td>
        <td className="px-3 py-1.5 text-right tabular-nums text-[11px] text-slate-800">
          {(it.quantity * it.unitPrice).toFixed(2)} €
        </td>
      </tr>,
    );
  }

  return (
    <table className="min-w-full border-collapse text-left text-xs">
      <thead className="sticky top-0 bg-slate-50">
        <tr className="text-[11px] uppercase tracking-wide text-slate-500">
          <th className="border-b border-slate-200 px-3 py-2">Código</th>
          <th className="border-b border-slate-200 px-3 py-2">Descrição</th>
          <th className="border-b border-slate-200 px-3 py-2 text-right">
            Qtd.
          </th>
          <th className="border-b border-slate-200 px-3 py-2">Unid.</th>
          <th className="border-b border-slate-200 px-3 py-2 text-right">
            P.U.
          </th>
          <th className="border-b border-slate-200 px-3 py-2 text-right">
            Total
          </th>
        </tr>
      </thead>
      <tbody>
        {items.length === 0 ? (
          <tr>
            <td
              colSpan={6}
              className="px-3 py-6 text-center text-[11px] text-slate-400"
            >
              Clique nas linhas à esquerda para adicionar ao modelo.
            </td>
          </tr>
        ) : (
          rows
        )}
      </tbody>
    </table>
  );
}

export default function ImportarOrcamentoPage() {
  const router = useRouter();
  const [items, setItems] = useState<DraftBudgetItem[]>([]);
  const [modelItems, setModelItems] = useState<DraftBudgetItem[]>([]);
  const [selectedImportItem, setSelectedImportItem] =
    useState<DraftBudgetItem | null>(null);
  const [meta, setMeta] = useState<BudgetMeta>(() => defaultMeta());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      setError(null);
      setItems([]);
      setModelItems([]);
      setSelectedImportItem(null);
      setFileName(null);
      if (!file) return;
      setLoading(true);
      try {
        const name = file.name.toLowerCase();
        if (name.endsWith(".csv")) {
          const text = await file.text();
          const rows = parseCsv(text);
          const parsed = parseFileToItems(rows);
          setItems(parsed);
          setFileName(file.name);
          if (parsed.length === 0) setError("Nenhuma linha válida encontrada. Verifique o separador (; ou ,) e os cabeçalhos.");
        } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
          const XLSX = await import("xlsx");
          const buf = await file.arrayBuffer();
          const wb = XLSX.read(buf, { type: "array" });
          const first = wb.SheetNames[0];
          const sheet = wb.Sheets[first];
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
            defval: "",
            raw: false,
          }) as Record<string, string>[];
          const normalizedRows = rows.map((r) => {
            const out: Record<string, string> = {};
            for (const [k, v] of Object.entries(r)) {
              out[String(k).trim()] = v == null ? "" : String(v);
            }
            return out;
          });
          const parsed = parseFileToItems(normalizedRows);
          setItems(parsed);
          setFileName(file.name);
          if (parsed.length === 0) setError("Nenhuma linha válida. Colunas esperadas: código, descrição, quantidade, unidade, preço.");
        } else if (name.endsWith(".pdf")) {
          const buf = await file.arrayBuffer();
          const lines = await extractLinesFromPdf(buf);
          const rows = pdfLinesToRows(lines);
          const parsed = parseFileToItems(rows);
          setItems(parsed);
          setFileName(file.name);
          if (parsed.length === 0) setError("Nenhum texto extraído do PDF ou linhas não reconhecidas. PDFs digitalizados (imagem) não são suportados.");
        } else {
          setError("Formato não suportado. Use .csv, .xlsx, .xls ou .pdf");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError("Erro ao ler ficheiro: " + msg);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const metaWithCodigo = useCallback((): BudgetMeta => {
    const codigo = buildCodigoInterno(meta);
    return { ...meta, codigoInternoObra: codigo };
  }, [meta]);

  const addedRowIds = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) {
      const match = modelItems.some(
        (m) =>
          m.code === it.code &&
          m.description === it.description &&
          m.quantity === it.quantity &&
          m.unitPrice === it.unitPrice,
      );
      if (match) set.add(it.rowId);
    }
    return set;
  }, [items, modelItems]);

  const addToModel = useCallback(
    (importItem: DraftBudgetItem, grandeCapituloCode: string, capituloCode: string) => {
      const newItem: DraftBudgetItem = {
        ...importItem,
        rowId: createRowId(),
        grandeCapituloCode,
        capituloCode,
      };
      setModelItems((prev) => [...prev, newItem]);
      setSelectedImportItem(null);
    },
    [],
  );

  const removeFromModel = useCallback((rowId: string) => {
    setModelItems((prev) => prev.filter((it) => it.rowId !== rowId));
  }, []);

  const addAllToModel = useCallback(() => {
    const firstCap = capitulos[0];
    if (!firstCap) return;
    const gcCode = firstCap.grandeCapituloCode;
    const capCode = firstCap.code;
    const newItems: DraftBudgetItem[] = items.map((it) => ({
      ...it,
      rowId: createRowId(),
      grandeCapituloCode: gcCode,
      capituloCode: capCode,
    }));
    setModelItems((prev) => [...prev, ...newItems]);
  }, [items]);

  const saveToDatabase = useCallback(async () => {
    if (modelItems.length === 0) return;
    if (!meta.obraNome.trim() || !meta.obraNumero.trim() || !meta.dataProposta.trim()) {
      setError("Preencha Nome da obra, Nº de obra e Data da proposta para gravar.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/orcamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: modelItems, meta: metaWithCodigo() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error || "Erro ao gravar. Tente novamente.");
        return;
      }
      const { id } = (await res.json()) as { id: string };
      router.push(`/orcamentos/${id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError("Erro de rede: " + msg);
    } finally {
      setSaving(false);
    }
  }, [modelItems, meta, metaWithCodigo, router]);

  const useInProposal = useCallback(() => {
    if (modelItems.length === 0) return;
    try {
      sessionStorage.setItem("orcamento-import-draft", JSON.stringify({ items: modelItems }));
      window.location.href = "/orcamentos/novo?fromImport=1";
    } catch {
      setError("Não foi possível guardar os dados. Tente novamente.");
    }
  }, [modelItems]);

  return (
    <MainLayout>
      <TopBar title="Importar orçamento" />

      <main className="rounded-2xl bg-white/80 p-8 shadow-sm ring-1 ring-slate-100">
        <header className="mb-8 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Importar orçamento
          </h1>
          <p className="max-w-2xl text-sm text-slate-500">
            Importe um orçamento em Excel, CSV ou PDF. Os dados são
            transformados no nosso modelo e gravados em &quot;Orçamentos
            guardados&quot;, ficando compatíveis com o resto da app (editar,
            imprimir, alterar estado). PDFs com texto seleccionável são suportados; digitalizações (imagem) não.
          </p>
        </header>

        <section className="space-y-6">
          <div className="flex flex-wrap items-center gap-4">
            <label className="cursor-pointer">
              <span className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50">
                Escolher ficheiro (Excel / CSV / PDF)
              </span>
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.pdf"
                className="sr-only"
                onChange={handleFile}
                disabled={loading}
              />
            </label>
            {fileName && (
              <span className="text-sm text-slate-500">{fileName}</span>
            )}
            {loading && (
              <span className="text-sm text-slate-500">A processar…</span>
            )}
          </div>

          {error && (
            <div
              className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
              role="alert"
            >
              {error}
            </div>
          )}

          {items.length > 0 && (
            <>
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">
                  Dados da proposta (obrigatórios para gravar)
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="block text-xs text-slate-600">
                    Nome da obra
                    <input
                      type="text"
                      value={meta.obraNome}
                      onChange={(e) =>
                        setMeta((m) => ({ ...m, obraNome: e.target.value }))
                      }
                      className="mt-1 w-full rounded border border-slate-200 px-3 py-1.5 text-sm"
                      placeholder="Ex.: Obra teste"
                    />
                  </label>
                  <label className="block text-xs text-slate-600">
                    Nº de obra
                    <input
                      type="text"
                      value={meta.obraNumero}
                      onChange={(e) =>
                        setMeta((m) => ({ ...m, obraNumero: e.target.value }))
                      }
                      className="mt-1 w-full rounded border border-slate-200 px-3 py-1.5 text-sm"
                      placeholder="Ex.: 001"
                    />
                  </label>
                  <label className="block text-xs text-slate-600">
                    Data da proposta
                    <input
                      type="date"
                      value={meta.dataProposta}
                      onChange={(e) =>
                        setMeta((m) => ({ ...m, dataProposta: e.target.value }))
                      }
                      className="mt-1 w-full rounded border border-slate-200 px-3 py-1.5 text-sm"
                    />
                  </label>
                  <label className="block text-xs text-slate-600">
                    Cliente (opcional)
                    <input
                      type="text"
                      value={meta.clienteNome}
                      onChange={(e) =>
                        setMeta((m) => ({ ...m, clienteNome: e.target.value }))
                      }
                      className="mt-1 w-full rounded border border-slate-200 px-3 py-1.5 text-sm"
                      placeholder="Nome do cliente"
                    />
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm text-slate-600">
                  <strong>{items.length}</strong> linhas importadas →{" "}
                  <strong>{modelItems.length}</strong> no modelo. Clique numa
                  linha à esquerda para adicionar ao orçamento à direita.
                  Preencha obra e data acima para gravar.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={saveToDatabase}
                    disabled={saving || modelItems.length === 0}
                    className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-60"
                  >
                    {saving ? "A gravar…" : "Gravar orçamento"}
                  </button>
                  <button
                    type="button"
                    onClick={useInProposal}
                    disabled={modelItems.length === 0}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    Abrir em Novo orçamento
                  </button>
                </div>
              </div>

              {selectedImportItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
                  <div className="max-w-sm">
                    <ImportCapituloSelector
                      item={selectedImportItem}
                      onConfirm={(grandeCapituloCode, capituloCode) =>
                        addToModel(selectedImportItem, grandeCapituloCode, capituloCode)
                      }
                      onCancel={() => setSelectedImportItem(null)}
                    />
                  </div>
                </div>
              )}

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <h3 className="text-sm font-semibold text-slate-800">
                      Orçamento importado
                    </h3>
                    <button
                      type="button"
                      onClick={addAllToModel}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                    >
                      Adicionar tudo
                    </button>
                  </div>
                  <div className="max-h-[28rem] flex-1 overflow-auto">
                    <table className="min-w-full border-collapse text-left text-xs">
                      <thead className="sticky top-0 bg-slate-100">
                        <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                          <th className="border-b border-slate-200 px-3 py-2">
                            Código
                          </th>
                          <th className="border-b border-slate-200 px-3 py-2">
                            Descrição
                          </th>
                          <th className="border-b border-slate-200 px-3 py-2 text-right">
                            Qtd.
                          </th>
                          <th className="border-b border-slate-200 px-3 py-2">
                            Unid.
                          </th>
                          <th className="border-b border-slate-200 px-3 py-2 text-right">
                            P.U.
                          </th>
                          <th className="border-b border-slate-200 px-3 py-2 text-right">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it) => {
                          const added = addedRowIds.has(it.rowId);
                          return (
                            <tr
                              key={it.rowId}
                              onClick={() => !added && setSelectedImportItem(it)}
                              className={`border-b border-slate-100 last:border-0 ${
                                added
                                  ? "bg-slate-100/80 text-slate-400"
                                  : "cursor-pointer hover:bg-slate-100"
                              }`}
                            >
                              <td className="px-3 py-1.5 font-mono text-slate-800">
                                {added && "✓ "}
                                {it.code || "—"}
                              </td>
                              <td className="max-w-xs px-3 py-1.5 text-slate-700">
                                {it.description || "—"}
                              </td>
                              <td className="px-3 py-1.5 text-right tabular-nums">
                                {it.quantity}
                              </td>
                              <td className="px-3 py-1.5 text-slate-600">
                                {it.unit}
                              </td>
                              <td className="px-3 py-1.5 text-right tabular-nums">
                                {it.unitPrice.toFixed(2)}
                              </td>
                              <td className="px-3 py-1.5 text-right tabular-nums">
                                {(it.quantity * it.unitPrice).toFixed(2)} €
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex flex-col rounded-xl border border-slate-200 bg-white">
                  <h3 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800">
                    Orçamento no nosso modelo
                  </h3>
                  <div className="max-h-[28rem] flex-1 overflow-auto">
                    <ModelItemsTable
                      items={modelItems}
                      onRemove={removeFromModel}
                      grandesCapitulos={grandesCapitulos}
                      capitulos={capitulos}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        <p className="mt-8 text-sm text-slate-500">
          <Link href="/orcamentos" className="underline hover:no-underline">
            ← Voltar a Orçamentos
          </Link>
        </p>
      </main>
    </MainLayout>
  );
}
