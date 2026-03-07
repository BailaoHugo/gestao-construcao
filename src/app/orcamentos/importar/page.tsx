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
import {
  excelToGrid,
  extractPdfToGridAndBlocks,
  csvToGrid,
  pasteToGrid,
} from "@/orcamentos/importExtract";
import type {
  ColumnMapping,
  ColumnRole,
  RowType,
  RowTypeMapping,
  CellToMetaMapping,
  ImportDocument,
  TextBlock,
} from "@/orcamentos/importTypes";
import type {
  BudgetMeta,
  Capitulo,
  DraftBudgetItem,
  GrandeCapitulo,
} from "@/orcamentos/domain";

const COLUMN_ROLES: { value: ColumnRole; label: string }[] = [
  { value: "code", label: "Código" },
  { value: "description", label: "Descrição" },
  { value: "quantity", label: "Quantidade" },
  { value: "unit", label: "Unidade" },
  { value: "price", label: "Preço" },
  { value: "ignore", label: "Ignorar" },
];

const ROW_TYPES: { value: RowType; label: string }[] = [
  { value: "data", label: "Linha de dados" },
  { value: "header", label: "Cabeçalho" },
  { value: "total", label: "Total" },
  { value: "ignore", label: "Ignorar" },
];

const META_FIELDS: { key: keyof BudgetMeta; label: string }[] = [
  { key: "obraNome", label: "Nome da obra" },
  { key: "obraNumero", label: "Nº de obra" },
  { key: "dataProposta", label: "Data da proposta" },
  { key: "clienteNome", label: "Cliente" },
  { key: "clienteEntidade", label: "Entidade" },
  { key: "obraEndereco", label: "Endereço obra" },
  { key: "responsavelNome", label: "Responsável" },
];

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

/** Aplica mapeamento à grelha e produz items + meta */
function applyMapping(
  grid: string[][],
  columnMapping: ColumnMapping,
  rowTypeMapping: RowTypeMapping,
  cellToMeta: CellToMetaMapping,
  blockToMeta: Record<number, keyof BudgetMeta>,
  textBlocksPage1: TextBlock[],
  firstRowIsHeader: boolean,
  baseMeta: BudgetMeta,
): { items: DraftBudgetItem[]; meta: BudgetMeta } {
  const meta = { ...baseMeta };
  const getCell = (row: number, col: number) =>
    (grid[row]?.[col] ?? "").trim();
  const parseNum = (s: string) => {
    const n = parseFloat(String(s).replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };

  const metaMutable = meta as unknown as Record<string, string | number>;
  for (const key of Object.keys(cellToMeta)) {
    const [r, c] = key.split(",").map(Number);
    const field = cellToMeta[key];
    if (field && grid[r]?.[c] !== undefined)
      metaMutable[field] = getCell(r, c);
  }
  textBlocksPage1.forEach((block, idx) => {
    const field = blockToMeta[idx];
    if (field && block.text) metaMutable[field] = block.text.trim();
  });

  const firstCap = capitulos[0];
  const gcCode = firstCap?.grandeCapituloCode ?? "?";
  const capCode = firstCap?.code ?? "?";
  const items: DraftBudgetItem[] = [];
  const startRow = firstRowIsHeader ? 1 : 0;

  for (let i = startRow; i < grid.length; i++) {
    const rowType = rowTypeMapping[i];
    if (rowType === "header" || rowType === "total" || rowType === "ignore")
      continue;
    if (rowType !== "data" && rowType !== undefined) continue;

    const row = grid[i];
    if (!row) continue;

    let code = "";
    let description = "";
    let quantity = 0;
    let unit = "un";
    let unitPrice = 0;

    for (let j = 0; j < row.length; j++) {
      const role = columnMapping[j];
      if (!role || role === "ignore") continue;
      const val = getCell(i, j);
      switch (role) {
        case "code":
          code = val;
          break;
        case "description":
          description = val;
          break;
        case "quantity":
          quantity = parseNum(val);
          break;
        case "unit":
          unit = val || "un";
          break;
        case "price":
          unitPrice = parseNum(val);
          break;
      }
    }

    if (!code && !description && quantity === 0 && unitPrice === 0) continue;
    items.push({
      rowId: createRowId(),
      code,
      description,
      unit,
      quantity,
      unitPrice,
      grandeCapituloCode: gcCode,
      capituloCode: capCode,
    });
  }

  return { items, meta };
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
        className="border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50"
        onClick={() => onRowClick?.(it)}
      >
        <td
          className="px-3 py-1.5 font-mono text-[11px] text-slate-800"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="mr-1 text-slate-300 hover:text-red-600"
            aria-label="Remover artigo"
            onClick={() => onRemove(it.rowId)}
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
              Aplique o mapeamento no documento à esquerda para ver os itens aqui.
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
  const [document, setDocument] = useState<ImportDocument | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [rowTypeMapping, setRowTypeMapping] = useState<RowTypeMapping>({});
  const [cellToMeta, setCellToMeta] = useState<CellToMetaMapping>({});
  const [blockToMeta, setBlockToMeta] = useState<Record<number, keyof BudgetMeta>>({});
  const [firstRowIsHeader, setFirstRowIsHeader] = useState(true);
  const [meta, setMeta] = useState<BudgetMeta>(() => defaultMeta());
  const [modelItems, setModelItems] = useState<DraftBudgetItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [selectedImportItem, setSelectedImportItem] =
    useState<DraftBudgetItem | null>(null);

  const loadFile = useCallback(async (file: File) => {
    setError(null);
    setDocument(null);
    setColumnMapping({});
    setRowTypeMapping({});
    setCellToMeta({});
    setBlockToMeta({});
    setModelItems([]);
    setLoading(true);
    try {
      const name = file.name.toLowerCase();
      if (name.endsWith(".pdf")) {
        const buf = await file.arrayBuffer();
        const { grid, textBlocksPage1 } = await extractPdfToGridAndBlocks(buf);
        setDocument({
          source: "pdf",
          fileName: file.name,
          grid,
          textBlocksPage1,
        });
      } else if (name.endsWith(".csv")) {
        const text = await file.text();
        const grid = csvToGrid(text);
        setDocument({
          source: "csv",
          fileName: file.name,
          grid,
          textBlocksPage1: [],
        });
      } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        const grid = await excelToGrid(file);
        setDocument({
          source: "excel",
          fileName: file.name,
          grid,
          textBlocksPage1: [],
        });
      } else {
        setError("Formato não suportado. Use .csv, .xlsx, .xls ou .pdf");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (file) loadFile(file);
    },
    [loadFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) loadFile(file);
    },
    [loadFile],
  );

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text");
    if (!text.trim()) return;
    setError(null);
    setDocument(null);
    setColumnMapping({});
    setRowTypeMapping({});
    setCellToMeta({});
    setModelItems([]);
    const grid = pasteToGrid(text);
    setDocument({
      source: "paste",
      fileName: null,
      grid,
      textBlocksPage1: [],
    });
  }, []);

  const handleApplyMapping = useCallback(() => {
    if (!document) return;
    const { items, meta: nextMeta } = applyMapping(
      document.grid,
      columnMapping,
      rowTypeMapping,
      cellToMeta,
      blockToMeta,
      document.textBlocksPage1,
      firstRowIsHeader,
      meta,
    );
    setModelItems(items);
    setMeta(nextMeta);
    setError(null);
  }, [
    document,
    columnMapping,
    rowTypeMapping,
    cellToMeta,
    blockToMeta,
    firstRowIsHeader,
    meta,
  ]);

  const metaWithCodigo = useCallback((): BudgetMeta => {
    const codigo = buildCodigoInterno(meta);
    return { ...meta, codigoInternoObra: codigo };
  }, [meta]);

  const setColumnRole = useCallback((col: number, role: ColumnRole | undefined) => {
    setColumnMapping((prev) => {
      if (role == null) {
        const next = { ...prev };
        delete next[col];
        return next;
      }
      return { ...prev, [col]: role };
    });
  }, []);

  const setRowType = useCallback((row: number, type: RowType | undefined) => {
    setRowTypeMapping((prev) => {
      if (type == null) {
        const next = { ...prev };
        delete next[row];
        return next;
      }
      return { ...prev, [row]: type };
    });
  }, []);

  const setCellMeta = useCallback((row: number, col: number, field: keyof BudgetMeta | "") => {
    setCellToMeta((prev) => {
      const key = `${row},${col}`;
      if (!field) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: field };
    });
  }, []);

  const setBlockMeta = useCallback((blockIndex: number, field: keyof BudgetMeta | "") => {
    setBlockToMeta((prev) => {
      if (!field) {
        const next = { ...prev };
        delete next[blockIndex];
        return next;
      }
      return { ...prev, [blockIndex]: field };
    });
  }, []);

  const removeFromModel = useCallback((rowId: string) => {
    setModelItems((prev) => prev.filter((it) => it.rowId !== rowId));
  }, []);

  const updateItemChapter = useCallback(
    (rowId: string, grandeCapituloCode: string, capituloCode: string) => {
      setModelItems((prev) =>
        prev.map((it) =>
          it.rowId === rowId
            ? { ...it, grandeCapituloCode, capituloCode }
            : it,
        ),
      );
      setSelectedImportItem(null);
    },
    [],
  );

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
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "Erro ao gravar. Tente novamente.");
        return;
      }
      const { id } = (await res.json()) as { id: string };
      router.push(`/orcamentos/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, [modelItems, meta, metaWithCodigo, router]);

  const useInProposal = useCallback(() => {
    if (modelItems.length === 0) return;
    try {
      sessionStorage.setItem(
        "orcamento-import-draft",
        JSON.stringify({ items: modelItems }),
      );
      window.location.href = "/orcamentos/novo?fromImport=1";
    } catch {
      setError("Não foi possível guardar os dados. Tente novamente.");
    }
  }, [modelItems]);

  const grid = document?.grid ?? [];
  const maxCols = useMemo(
    () => Math.max(0, ...grid.map((r) => r.length)),
    [grid],
  );

  return (
    <MainLayout>
      <TopBar title="Importar orçamento" />

      <main className="rounded-2xl bg-white/80 p-8 shadow-sm ring-1 ring-slate-100">
        <header className="mb-8 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Importar orçamento
          </h1>
          <p className="max-w-2xl text-sm text-slate-500">
            Abra o documento (PDF, Excel ou CSV) ou cole uma tabela. Clique nas
            células para indicar o que é cada coluna, cada linha e os campos da
            folha de rosto. Depois aplique o mapeamento e grave.
          </p>
        </header>

        <section className="space-y-6">
          <div
            className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-6"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onPaste={handlePaste}
          >
            <div className="flex flex-wrap items-center gap-4">
              <label className="cursor-pointer">
                <span className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50">
                  Escolher ficheiro (PDF / Excel / CSV)
                </span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,.pdf"
                  className="sr-only"
                  onChange={handleFileInput}
                  disabled={loading}
                />
              </label>
              <span className="text-sm text-slate-500">
                ou arraste um ficheiro para aqui
              </span>
              <span className="text-sm text-slate-500">ou</span>
              <span className="text-sm text-slate-500">
                cole uma tabela (Excel/CSV) nesta página
              </span>
            </div>
            {document?.fileName && (
              <p className="mt-2 text-sm text-slate-600">
                Ficheiro: <strong>{document.fileName}</strong> —{" "}
                {document.grid.length} linhas
              </p>
            )}
            {loading && (
              <p className="mt-2 text-sm text-slate-500">A processar…</p>
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

          {document && grid.length > 0 && (
            <>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={firstRowIsHeader}
                      onChange={(e) => setFirstRowIsHeader(e.target.checked)}
                    />
                    Primeira linha é cabeçalho
                  </label>
                  <p className="text-xs text-slate-500">
                    Clique numa célula do documento para mapear a coluna, a linha
                    e a folha de rosto.
                  </p>
                </div>

                <div className="max-h-[22rem] overflow-auto">
                  <table className="min-w-full border-collapse text-left text-xs">
                    <thead className="sticky top-0 bg-slate-100">
                      <tr>
                        <th className="border border-slate-200 px-2 py-1 text-[10px] text-slate-500">
                          #
                        </th>
                        {Array.from({ length: maxCols }, (_, j) => (
                          <th
                            key={j}
                            className="border border-slate-200 px-2 py-1 text-[10px] text-slate-500"
                          >
                            {columnMapping[j]
                              ? COLUMN_ROLES.find((r) => r.value === columnMapping[j])
                                  ?.label ?? ""
                              : `Col ${j + 1}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {grid.map((row, i) => (
                        <tr key={i}>
                          <td className="border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-500">
                            {rowTypeMapping[i]
                              ? ROW_TYPES.find((r) => r.value === rowTypeMapping[i])
                                  ?.label?.replace("Linha de ", "") ?? ""
                              : i + 1}
                          </td>
                          {Array.from({ length: maxCols }, (_, j) => {
                            const cellKey = `${i},${j}`;
                            const metaField = cellToMeta[cellKey];
                            const isSelected =
                              selectedCell?.row === i && selectedCell?.col === j;
                            return (
                              <td
                                key={j}
                                className={`cursor-pointer border border-slate-200 px-2 py-1 text-[11px] ${
                                  isSelected
                                    ? "ring-2 ring-emerald-500 bg-emerald-50"
                                    : "hover:bg-slate-50"
                                } ${metaField ? "bg-amber-50/80" : ""}`}
                                onClick={() =>
                                  setSelectedCell(
                                    selectedCell?.row === i && selectedCell?.col === j
                                      ? null
                                      : { row: i, col: j },
                                  )
                                }
                              >
                                {row[j] ?? ""}
                                {metaField && (
                                  <span className="ml-1 text-[9px] text-amber-600">
                                    →{META_FIELDS.find((f) => f.key === metaField)?.label}
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {selectedCell !== null && (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="mb-3 text-xs font-medium text-slate-700">
                      Célula linha {selectedCell.row + 1}, coluna{" "}
                      {selectedCell.col + 1}
                    </p>
                    <div className="flex flex-wrap gap-6">
                      <div>
                        <label className="block text-[10px] text-slate-500">
                          Esta coluna é
                        </label>
                        <select
                          value={columnMapping[selectedCell.col] ?? ""}
                          onChange={(e) =>
                            setColumnRole(
                              selectedCell.col,
                              (e.target.value || undefined) as ColumnRole | undefined,
                            )
                          }
                          className="mt-1 rounded border border-slate-200 px-2 py-1 text-xs"
                        >
                          <option value="">—</option>
                          {COLUMN_ROLES.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500">
                          Esta linha é
                        </label>
                        <select
                          value={rowTypeMapping[selectedCell.row] ?? ""}
                          onChange={(e) =>
                            setRowType(
                              selectedCell.row,
                              (e.target.value || undefined) as RowType | undefined,
                            )
                          }
                          className="mt-1 rounded border border-slate-200 px-2 py-1 text-xs"
                        >
                          <option value="">—</option>
                          {ROW_TYPES.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500">
                          Célula para folha de rosto
                        </label>
                        <select
                          value={
                            cellToMeta[`${selectedCell.row},${selectedCell.col}`] ?? ""
                          }
                          onChange={(e) =>
                            setCellMeta(
                              selectedCell.row,
                              selectedCell.col,
                              (e.target.value || "") as keyof BudgetMeta | "",
                            )
                          }
                          className="mt-1 rounded border border-slate-200 px-2 py-1 text-xs"
                        >
                          <option value="">— Não usar</option>
                          {META_FIELDS.map((f) => (
                            <option key={f.key} value={f.key}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {document.textBlocksPage1.length > 0 && (
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="mb-2 text-xs font-medium text-slate-700">
                      Texto da primeira página (PDF) — use para folha de rosto
                    </p>
                    <div className="space-y-1">
                      {document.textBlocksPage1.map((block, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-xs"
                        >
                          <span className="max-w-xs truncate text-slate-600">
                            {block.text}
                          </span>
                          <select
                            value={blockToMeta[idx] ?? ""}
                            onChange={(e) =>
                              setBlockMeta(
                                idx,
                                (e.target.value || "") as keyof BudgetMeta | "",
                              )
                            }
                            className="rounded border border-slate-200 px-2 py-0.5"
                          >
                            <option value="">—</option>
                            {META_FIELDS.map((f) => (
                              <option key={f.key} value={f.key}>
                                {f.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleApplyMapping}
                    className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500"
                  >
                    Aplicar mapeamento
                  </button>
                </div>
              </div>

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
                  <strong>{modelItems.length}</strong> itens no modelo. Ajuste
                  capítulos clicando num item à direita (se precisar). Preencha
                  obra e data para gravar.
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
                        selectedImportItem &&
                        updateItemChapter(
                          selectedImportItem.rowId,
                          grandeCapituloCode,
                          capituloCode,
                        )
                      }
                      onCancel={() => setSelectedImportItem(null)}
                    />
                  </div>
                </div>
              )}

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50/50">
                  <h3 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800">
                    Documento (mapeamento aplicado)
                  </h3>
                  <p className="px-4 py-2 text-xs text-slate-500">
                    O documento está acima. Os itens gerados aparecem à direita.
                  </p>
                </div>

                <div className="flex flex-col rounded-xl border border-slate-200 bg-white">
                  <h3 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800">
                    Orçamento no nosso modelo
                  </h3>
                  <div className="max-h-[28rem] flex-1 overflow-auto">
                    <ModelItemsTable
                      items={modelItems}
                      onRemove={removeFromModel}
                      onRowClick={setSelectedImportItem}
                      grandesCapitulos={grandesCapitulos}
                      capitulos={capitulos}
                    />
                  </div>
                  {modelItems.length > 0 && (
                    <p className="border-t border-slate-100 px-4 py-2 text-[10px] text-slate-500">
                      Clique numa linha para alterar o capítulo.
                    </p>
                  )}
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
