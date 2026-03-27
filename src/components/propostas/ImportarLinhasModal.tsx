"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildImportDrafts,
  getImportLinhaEstado,
  IMPORT_COLUMN_ROLE_OPTIONS,
  parseImportTable,
  suggestColumnMapping,
  todasLinhasImportValidas,
  validateImportLinhaErrors,
  type ImportColumnRole,
  type ImportLinhaDraft,
  type ParseImportTableResult,
} from "@/lib/propostas/parseImportedLines";

type Props = {
  open: boolean;
  onClose: () => void;
  onInsert: (linhas: ImportLinhaDraft[]) => void;
};

const PANEL_MIN_W = 320;
const PANEL_MIN_H = 260;

export function ImportarLinhasModal({ open, onClose, onInsert }: Props) {
  const [rawText, setRawText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [table, setTable] = useState<
    Extract<ParseImportTableResult, { ok: true }> | null
  >(null);
  const [columnMapping, setColumnMapping] = useState<ImportColumnRole[]>([]);
  const [hasPreview, setHasPreview] = useState(false);

  const [panelSize, setPanelSize] = useState<{
    w: number;
    h: number;
  } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const resizeDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  const rows = useMemo(() => {
    if (!table) return [];
    return buildImportDrafts(table, columnMapping);
  }, [table, columnMapping]);

  const podeInserir = useMemo(
    () =>
      hasPreview &&
      !parseError &&
      table !== null &&
      todasLinhasImportValidas(rows),
    [hasPreview, parseError, table, rows],
  );

  const handlePreview = () => {
    const r = parseImportTable(rawText);
    setHasPreview(true);
    if (!r.ok) {
      setParseError(r.error);
      setTable(null);
      setColumnMapping([]);
      return;
    }
    setParseError(null);
    setTable(r);
    setColumnMapping(suggestColumnMapping(r.rawHeaderCells));
  };

  const setMappingAt = (index: number, role: ImportColumnRole) => {
    setColumnMapping((prev) => {
      const next = [...prev];
      if (index >= 0 && index < next.length) next[index] = role;
      return next;
    });
  };

  const handleInsert = () => {
    if (!podeInserir) return;
    onInsert(rows);
    setRawText("");
    setParseError(null);
    setTable(null);
    setColumnMapping([]);
    setHasPreview(false);
    onClose();
  };

  const estadoRowClass = (estado: ReturnType<typeof getImportLinhaEstado>) => {
    if (estado === "erro") return "bg-red-50/90";
    if (estado === "aviso") return "bg-amber-50/80";
    return "bg-emerald-50/50";
  };

  const endResizeDrag = useCallback(() => {
    resizeDragRef.current = null;
    document.body.style.removeProperty("cursor");
    document.body.style.removeProperty("user-select");
  }, []);

  const onResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const panel = panelRef.current;
      if (!panel) return;
      const rect = panel.getBoundingClientRect();
      resizeDragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startW: rect.width,
        startH: rect.height,
      };
      document.body.style.cursor = "se-resize";
      document.body.style.userSelect = "none";
    },
    [],
  );

  useEffect(() => {
    const maxW = () => Math.max(PANEL_MIN_W, window.innerWidth - 16);
    const maxH = () => Math.max(PANEL_MIN_H, window.innerHeight - 16);

    const onMove = (e: PointerEvent) => {
      const d = resizeDragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      const nw = d.startW + (e.clientX - d.startX);
      const nh = d.startH + (e.clientY - d.startY);
      setPanelSize({
        w: Math.min(maxW(), Math.max(PANEL_MIN_W, nw)),
        h: Math.min(maxH(), Math.max(PANEL_MIN_H, nh)),
      });
    };

    const onUp = (e: PointerEvent) => {
      const d = resizeDragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      endResizeDrag();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      endResizeDrag();
    };
  }, [endResizeDrag]);

  useEffect(() => {
    if (!open) endResizeDrag();
  }, [open, endResizeDrag]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-2">
      <div
        ref={panelRef}
        className={`relative flex max-h-[calc(100vh-1rem)] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 ${
          panelSize ? "" : "max-h-[92vh] max-w-6xl"
        }`}
        style={
          panelSize
            ? {
                width: panelSize.w,
                height: panelSize.h,
                maxWidth: "calc(100vw - 1rem)",
                maxHeight: "calc(100vh - 1rem)",
              }
            : undefined
        }
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Importar linhas
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] text-slate-500 hover:text-slate-700"
          >
            Fechar
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden px-4 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <div className="flex min-h-0 flex-col gap-2 text-xs text-slate-700">
            <label className="block text-[11px] font-medium text-slate-700">
              Colar tabela (TAB, ; ou |) com cabeçalho reconhecível
            </label>
            <textarea
              className="min-h-[12rem] w-full flex-1 resize-y rounded border border-slate-200 p-2 text-[11px] text-slate-800 outline-none focus:border-slate-400"
              placeholder={`LISTAGEM DE TRABALHOS\tUN.\tQTD.\tUNITÁRIO CUSTO\nObra exemplo\tvg\t1\t1250,00`}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            />
            <button
              type="button"
              onClick={handlePreview}
              className="shrink-0 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-slate-800"
            >
              Pré-visualizar
            </button>
            <p className="text-[10px] leading-relaxed text-slate-500">
              Colunas aceites: LISTAGEM DE TRABALHOS / DESCRIÇÃO, UN. / UNIDADE,
              QTD. / QUANTIDADE, UNITÁRIO CUSTO, TOTAL CUSTO, UNITÁRIO VENDA,
              TOTAL VENDA (com sinónimos). Sem texto livre fora da tabela.
            </p>
          </div>

          <div className="flex min-h-0 flex-col gap-2 text-xs text-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-slate-700">
                Pré-visualização
              </span>
              <button
                type="button"
                onClick={handleInsert}
                disabled={!podeInserir}
                className={`rounded-full px-3 py-1.5 text-[11px] font-medium ${
                  !podeInserir
                    ? "cursor-not-allowed bg-slate-200 text-slate-400"
                    : "bg-emerald-600 text-white hover:bg-emerald-500"
                }`}
              >
                Inserir linhas
              </button>
            </div>

            {parseError ? (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-800">
                {parseError}
              </div>
            ) : null}

            <div className="min-h-0 flex-1 space-y-3 overflow-auto">
              {!hasPreview ? (
                <div className="rounded border border-slate-200 px-3 py-4 text-[11px] text-slate-400">
                  Cole a tabela e clique em &quot;Pré-visualizar&quot;.
                </div>
              ) : table ? (
                <>
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Mapeamento de colunas
                    </p>
                    <div className="overflow-x-auto rounded border border-slate-200">
                      <table className="min-w-full border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-50 text-left text-[10px] text-slate-600">
                            {table.rawHeaderCells.map((h, i) => (
                              <th
                                key={`h-${i}`}
                                className="border-b border-slate-100 px-2 py-1.5 font-medium"
                              >
                                {h || `—`}
                              </th>
                            ))}
                          </tr>
                          <tr className="bg-white">
                            {table.rawHeaderCells.map((_, i) => (
                              <td key={`m-${i}`} className="border-b border-slate-100 px-1 py-1 align-top">
                                <select
                                  className="max-w-[11rem] rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] outline-none focus:border-slate-400"
                                  value={columnMapping[i] ?? "ignore"}
                                  onChange={(e) =>
                                    setMappingAt(
                                      i,
                                      e.target.value as ImportColumnRole,
                                    )
                                  }
                                >
                                  {IMPORT_COLUMN_ROLE_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            ))}
                          </tr>
                        </thead>
                      </table>
                    </div>
                  </div>

                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Linhas importadas
                    </p>
                    <div className="overflow-x-auto rounded border border-slate-200">
                      <table className="min-w-full border-collapse text-[11px]">
                        <thead className="sticky top-0 z-10 bg-slate-50">
                          <tr className="text-[10px] uppercase tracking-wide text-slate-500">
                            <th className="px-2 py-1.5 text-left">#</th>
                            <th className="min-w-[10rem] px-2 py-1.5 text-left">
                              LISTAGEM DE TRABALHOS
                            </th>
                            <th className="px-2 py-1.5 text-left">UN.</th>
                            <th className="px-2 py-1.5 text-right">QTD.</th>
                            <th className="px-2 py-1.5 text-right">
                              UNITÁRIO CUSTO
                            </th>
                            <th className="px-2 py-1.5 text-right">
                              TOTAL CUSTO
                            </th>
                            <th className="px-2 py-1.5 text-right">
                              UNITÁRIO VENDA
                            </th>
                            <th className="px-2 py-1.5 text-right">
                              TOTAL VENDA
                            </th>
                            <th className="min-w-[7rem] px-2 py-1.5 text-left">
                              Estado
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row, idx) => {
                            const estado = getImportLinhaEstado(row);
                            const errs = validateImportLinhaErrors(row);
                            return (
                              <tr
                                key={row.id}
                                className={`border-t border-slate-100 ${estadoRowClass(estado)}`}
                              >
                                <td className="px-2 py-1 align-top text-slate-500">
                                  {idx + 1}
                                </td>
                                <td className="max-w-xs px-2 py-1 align-top text-slate-800">
                                  <span className="line-clamp-3 whitespace-pre-wrap break-words">
                                    {row.descricao}
                                  </span>
                                </td>
                                <td className="whitespace-nowrap px-2 py-1 align-top">
                                  {row.unidade}
                                </td>
                                <td className="whitespace-nowrap px-2 py-1 text-right align-top">
                                  {row.quantidade}
                                </td>
                                <td className="whitespace-nowrap px-2 py-1 text-right align-top">
                                  {row.precoCustoUnitario != null
                                    ? row.precoCustoUnitario.toFixed(2)
                                    : "—"}
                                </td>
                                <td className="whitespace-nowrap px-2 py-1 text-right align-top">
                                  {row.totalCustoLinha != null
                                    ? row.totalCustoLinha.toFixed(2)
                                    : "—"}
                                </td>
                                <td className="whitespace-nowrap px-2 py-1 text-right align-top">
                                  {row.precoVendaUnitario != null
                                    ? row.precoVendaUnitario.toFixed(2)
                                    : "—"}
                                </td>
                                <td className="whitespace-nowrap px-2 py-1 text-right align-top">
                                  {row.totalVendaLinha != null
                                    ? row.totalVendaLinha.toFixed(2)
                                    : "—"}
                                </td>
                                <td className="px-2 py-1 align-top">
                                  {estado === "erro" ? (
                                    <ul className="list-inside list-disc space-y-0.5 text-[10px] text-red-700">
                                      {errs.map((x) => (
                                        <li key={x}>{x}</li>
                                      ))}
                                    </ul>
                                  ) : estado === "aviso" ? (
                                    <ul className="list-inside list-disc space-y-0.5 text-[10px] text-amber-800">
                                      {row.avisos.map((x) => (
                                        <li key={x}>{x}</li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <span className="text-[10px] font-medium text-emerald-800">
                                      OK
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded border border-slate-200 px-3 py-4 text-[11px] text-slate-400">
                  Corrija o texto ou o cabeçalho e volte a pré-visualizar.
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          aria-label="Redimensionar janela"
          title="Arrastar para redimensionar"
          onPointerDown={onResizePointerDown}
          className="absolute bottom-0 right-0 z-10 h-5 w-5 cursor-se-resize touch-none rounded-tl border border-transparent bg-transparent text-slate-400 hover:bg-slate-100/80 hover:text-slate-600"
        >
          <span
            className="pointer-events-none absolute bottom-1 right-1 block h-2.5 w-2.5 border-b-2 border-r-2 border-current"
            aria-hidden
          />
        </button>
      </div>
    </div>
  );
}
