"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MainLayout } from "@/components/layout/MainLayout";
import { TopBar } from "@/components/layout/TopBar";
import {
  ImportCapituloSelector,
  capitulos,
  grandesCapitulos,
} from "@/orcamentos/ImportCapituloSelector";
import { extractPdfAsText } from "@/orcamentos/importExtract";
import { pasteToGrid } from "@/orcamentos/importExtract";
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

/** Converte texto colado (linhas com tab ou ;) em DraftBudgetItem[] */
function pastedTextToItems(text: string): DraftBudgetItem[] {
  const grid = pasteToGrid(text);
  if (grid.length === 0) return [];
  const firstCap = capitulos[0];
  const gcCode = firstCap?.grandeCapituloCode ?? "?";
  const capCode = firstCap?.code ?? "?";
  const parseNum = (s: string) => {
    const n = parseFloat(String(s).replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };
  const items: DraftBudgetItem[] = [];
  for (let i = 0; i < grid.length; i++) {
    const row = grid[i];
    if (!row || row.every((c) => !c.trim())) continue;
    const code = (row[0] ?? "").trim();
    const desc = (row[1] ?? "").trim();
    const qtd = row.length >= 3 ? parseNum(row[2]) : 0;
    const unit = (row[3] ?? "").trim() || "un";
    const price = row.length >= 5 ? parseNum(row[4]) : 0;
    if (!code && !desc && qtd === 0 && price === 0) continue;
    items.push({
      rowId: createRowId(),
      code,
      description: desc,
      unit,
      quantity: qtd,
      unitPrice: price,
      grandeCapituloCode: gcCode,
      capituloCode: capCode,
    });
  }
  return items;
}

/** Tenta extrair uma data do texto (YYYY-MM-DD ou DD/MM/YYYY) */
function tryExtractDate(text: string): string | null {
  const iso = /\b(20\d{2})-(\d{2})-(\d{2})\b/.exec(text);
  if (iso) return iso[0];
  const dmy = /\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/.exec(text);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  return null;
}

function ModelItemsTable({
  items,
  onRemove,
  onRowClick,
  grandesCapitulos,
  capitulos,
}: {
  items: DraftBudgetItem[];
  onRemove: (rowId: string) => void;
  onRowClick?: (item: DraftBudgetItem) => void;
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
          <td colSpan={6} className="bg-slate-100 px-3 py-2 text-[11px] font-semibold uppercase text-slate-700">
            {lastGC} — {gc?.description ?? ""}
          </td>
        </tr>,
      );
    }
    if (needsCap) {
      lastCap = it.capituloCode;
      const cap = capitulos.find((c) => c.code === it.capituloCode);
      rows.push(
        <tr key={`cap-${lastGC}-${lastCap}`}>
          <td colSpan={6} className="bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-700">
            {lastCap} — {cap?.description ?? ""}
          </td>
        </tr>,
      );
    }
    rows.push(
      <tr
        key={it.rowId}
        className="border-b border-slate-100 cursor-pointer hover:bg-slate-50"
        onClick={() => onRowClick?.(it)}
      >
        <td className="px-3 py-1.5 font-mono text-[11px]" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="mr-1 text-slate-300 hover:text-red-600" onClick={() => onRemove(it.rowId)}>×</button>
          {it.code || "—"}
        </td>
        <td className="max-w-xs px-3 py-1.5 text-[11px]">{it.description || "—"}</td>
        <td className="px-3 py-1.5 text-right tabular-nums text-[11px]">{it.quantity}</td>
        <td className="px-3 py-1.5 text-[11px]">{it.unit}</td>
        <td className="px-3 py-1.5 text-right tabular-nums text-[11px]">{it.unitPrice.toFixed(2)}</td>
        <td className="px-3 py-1.5 text-right tabular-nums text-[11px]">{(it.quantity * it.unitPrice).toFixed(2)} €</td>
      </tr>,
    );
  }

  return (
    <table className="min-w-full border-collapse text-left text-xs">
      <thead className="sticky top-0 bg-slate-50">
        <tr className="text-[11px] uppercase tracking-wide text-slate-500">
          <th className="border-b border-slate-200 px-3 py-2">Código</th>
          <th className="border-b border-slate-200 px-3 py-2">Descrição</th>
          <th className="border-b border-slate-200 px-3 py-2 text-right">Qtd.</th>
          <th className="border-b border-slate-200 px-3 py-2">Unid.</th>
          <th className="border-b border-slate-200 px-3 py-2 text-right">P.U.</th>
          <th className="border-b border-slate-200 px-3 py-2 text-right">Total</th>
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
  );
}

const META_FIELDS: { key: keyof BudgetMeta; label: string; type?: string }[] = [
  { key: "tituloProposta", label: "Título da proposta" },
  { key: "clienteNome", label: "Nome do cliente" },
  { key: "clienteEntidade", label: "Entidade / empresa" },
  { key: "clienteContacto", label: "Contacto do cliente" },
  { key: "obraNome", label: "Nome da obra *" },
  { key: "obraEndereco", label: "Morada / localização" },
  { key: "obraNumero", label: "Nº de obra *" },
  { key: "obraReferencia", label: "Referência da obra" },
  { key: "dataProposta", label: "Data da proposta *", type: "date" },
  { key: "responsavelNome", label: "Responsável (nome)" },
  { key: "responsavelFuncao", label: "Função" },
  { key: "responsavelEmail", label: "Email" },
  { key: "responsavelTelefone", label: "Telefone" },
  { key: "notasResumo", label: "Notas" },
];

export default function ImportarOrcamentoPage() {
  const router = useRouter();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [meta, setMeta] = useState<BudgetMeta>(() => defaultMeta());
  const [pastedLines, setPastedLines] = useState("");
  const [items, setItems] = useState<DraftBudgetItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DraftBudgetItem | null>(null);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const loadPdf = useCallback(async (file: File) => {
    setError(null);
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    setPdfFileName(null);
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Selecione um ficheiro PDF.");
      return;
    }
    const url = URL.createObjectURL(file);
    setPdfUrl(url);
    setPdfFileName(file.name);
    setLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const text = await extractPdfAsText(buf);
      if (text.trim()) {
        setPastedLines((prev) => (prev.trim() ? prev : text));
        const date = tryExtractDate(text);
        if (date) setMeta((m) => ({ ...m, dataProposta: date }));
      }
    } catch {
      // ignore: user can still view PDF and copy manually
    } finally {
      setLoading(false);
    }
  }, [pdfUrl]);

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (file) loadPdf(file);
    },
    [loadPdf],
  );

  const applyPastedLines = useCallback(() => {
    const next = pastedTextToItems(pastedLines);
    setItems(next);
    setError(null);
  }, [pastedLines]);

  const metaWithCodigo = useCallback((): BudgetMeta => {
    const codigo = buildCodigoInterno(meta);
    return { ...meta, codigoInternoObra: codigo };
  }, [meta]);

  const updateItemChapter = useCallback(
    (rowId: string, grandeCapituloCode: string, capituloCode: string) => {
      setItems((prev) =>
        prev.map((it) =>
          it.rowId === rowId ? { ...it, grandeCapituloCode, capituloCode } : it,
        ),
      );
      setSelectedItem(null);
    },
    [],
  );

  const removeItem = useCallback((rowId: string) => {
    setItems((prev) => prev.filter((it) => it.rowId !== rowId));
  }, []);

  const saveToDatabase = useCallback(async () => {
    if (items.length === 0) {
      setError("Adicione linhas ao orçamento (cole texto e clique em Aplicar).");
      return;
    }
    if (!meta.obraNome.trim() || !meta.obraNumero.trim() || !meta.dataProposta.trim()) {
      setError("Preencha Nome da obra, Nº de obra e Data da proposta.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/orcamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, meta: metaWithCodigo() }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "Erro ao gravar.");
        return;
      }
      const { id } = (await res.json()) as { id: string };
      router.push(`/orcamentos/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, [items, meta, metaWithCodigo, router]);

  const useInProposal = useCallback(() => {
    if (items.length === 0) {
      setError("Adicione linhas ao orçamento primeiro.");
      return;
    }
    try {
      sessionStorage.setItem("orcamento-import-draft", JSON.stringify({ items }));
      window.location.href = "/orcamentos/novo?fromImport=1";
    } catch {
      setError("Não foi possível guardar.");
    }
  }, [items]);

  return (
    <MainLayout>
      <TopBar title="Importar orçamento" />

      <main className="rounded-2xl bg-white/80 p-8 shadow-sm ring-1 ring-slate-100">
        <header className="mb-6 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Importar orçamento
          </h1>
          <p className="max-w-2xl text-sm text-slate-500">
            À esquerda: abra o PDF e selecione texto para copiar. À direita: preencha os campos do nosso modelo (pode colar por cima). Pode tentar preencher automaticamente a partir do PDF; altere o que não fizer sentido.
          </p>
        </header>

        {error && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Esquerda: PDF */}
          <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-800">Documento PDF</h2>
              <label className="cursor-pointer">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50">
                  Carregar PDF
                </span>
                <input
                  type="file"
                  accept=".pdf"
                  className="sr-only"
                  onChange={handleFile}
                  disabled={loading}
                />
              </label>
            </div>
            <div className="min-h-[28rem] flex-1 overflow-auto p-2">
              {pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  title={pdfFileName ?? "PDF"}
                  className="h-full min-h-[26rem] w-full rounded border-0 bg-white"
                />
              ) : (
                <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 text-sm text-slate-500">
                  Carregue um PDF para ver e selecionar texto para copiar.
                </div>
              )}
            </div>
            {pdfFileName && (
              <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
                {pdfFileName}
                {loading && " — a extrair texto para sugestões…"}
              </p>
            )}
          </div>

          {/* Direita: campos do modelo */}
          <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-800">Folha de rosto e orçamento</h2>

            <div className="space-y-3">
              {META_FIELDS.map(({ key, label, type }) => (
                <label key={key} className="block text-xs text-slate-700">
                  {label}
                  <input
                    type={type ?? "text"}
                    value={String((meta as unknown as Record<string, unknown>)[key] ?? "")}
                    onChange={(e) =>
                      setMeta((m) => ({ ...m, [key]: e.target.value }))
                    }
                    className="mt-1 w-full rounded border border-slate-200 px-3 py-1.5 text-sm"
                    placeholder={`${label}…`}
                  />
                </label>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-4">
              <label className="block text-xs font-medium text-slate-700">
                Linhas do orçamento (cole aqui; separar colunas por tab ou ;)
              </label>
              <textarea
                value={pastedLines}
                onChange={(e) => setPastedLines(e.target.value)}
                placeholder="Código	Descrição	Quantidade	Unidade	Preço"
                rows={6}
                className="mt-1 w-full rounded border border-slate-200 px-3 py-2 font-mono text-xs"
              />
              <button
                type="button"
                onClick={applyPastedLines}
                className="mt-2 rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Aplicar linhas
              </button>
            </div>

            {items.length > 0 && (
              <div className="border-t border-slate-100 pt-4">
                <p className="mb-2 text-xs text-slate-600">
                  {items.length} itens. Clique numa linha para alterar o capítulo.
                </p>
                <div className="max-h-64 overflow-auto rounded border border-slate-200">
                  <ModelItemsTable
                    items={items}
                    onRemove={removeItem}
                    onRowClick={setSelectedItem}
                    grandesCapitulos={grandesCapitulos}
                    capitulos={capitulos}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={saveToDatabase}
                disabled={saving || items.length === 0}
                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                {saving ? "A gravar…" : "Gravar orçamento"}
              </button>
              <button
                type="button"
                onClick={useInProposal}
                disabled={items.length === 0}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Abrir em Novo orçamento
              </button>
            </div>
          </div>
        </div>

        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="max-w-sm">
              <ImportCapituloSelector
                item={selectedItem}
                onConfirm={(gc, cap) =>
                  updateItemChapter(selectedItem.rowId, gc, cap)
                }
                onCancel={() => setSelectedItem(null)}
              />
            </div>
          </div>
        )}

        <p className="mt-8 text-sm text-slate-500">
          <Link href="/orcamentos" className="underline hover:no-underline">
            ← Voltar a Orçamentos
          </Link>
        </p>
      </main>
    </MainLayout>
  );
}
