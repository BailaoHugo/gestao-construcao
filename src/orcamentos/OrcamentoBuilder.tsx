"use client";

import { useMemo, useRef, useState } from "react";
import type {
  ArtigoMaster,
  BudgetMeta,
  Capitulo,
  GrandeCapitulo,
} from "./domain";
import { useBudgetDraft } from "./BudgetDraftContext";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const artigos: ArtigoMaster[] = require("../../data/orcamentos/processed/artigos_master.json");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const grandesCapitulos: GrandeCapitulo[] = require("../../data/orcamentos/processed/grandes_capitulos.json");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const capitulos: Capitulo[] = require("../../data/orcamentos/processed/capitulos.json");

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function createRowId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

interface BudgetItem {
  code: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  grandeCapituloCode: string;
  capituloCode: string;
}

export function OrcamentoBuilder() {
  const [status, setStatus] = useState<string | null>(
    'Use comandos como "adicionar A1.0001 q=2" ou pesquise por texto.',
  );
  const [input, setInput] = useState("");
  const { items, setItems, meta } = useBudgetDraft();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [visibleColumns, setVisibleColumns] = useState({
    code: true,
    description: true,
    qty: true,
    kAplicado: true,
    unit: true,
    unitPrice: true,
    total: true,
    custoUnitario: false,
    precoVendaUnitario: false,
    margemPercent: false,
  });
  const inputRef = useRef<HTMLInputElement | null>(null);

  const arvore = useMemo(() => {
    const artsByCapitulo: Record<string, ArtigoMaster[]> = {};
    for (const a of artigos) {
      if (!a.ativo) continue;
      if (!artsByCapitulo[a.capituloCode]) {
        artsByCapitulo[a.capituloCode] = [];
      }
      artsByCapitulo[a.capituloCode]!.push(a);
    }

    const capsByGC: Record<string, Capitulo[]> = {};
    for (const c of capitulos) {
      if (!capsByGC[c.grandeCapituloCode]) {
        capsByGC[c.grandeCapituloCode] = [];
      }
      capsByGC[c.grandeCapituloCode]!.push(c);
    }

    return grandesCapitulos.map((gc) => ({
      gc,
      capitulos: (capsByGC[gc.code] ?? []).map((cap) => ({
        cap,
        artigos: (artsByCapitulo[cap.code] ?? []).slice(0, 50),
      })),
    }));
  }, []);

  const total = useMemo(
    () => items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0),
    [items],
  );

  const suggestions = useMemo(() => {
    const q = input.trim();

    // Sem texto: mostra lista rápida inicial
    if (q.length === 0) {
      return artigos;
    }

    const normQ = normalizeText(q);

    return artigos
      .filter(
        (a) =>
          normalizeText(a.code).includes(normQ) ||
          normalizeText(a.description).includes(normQ),
      )
      .slice(0, 10);
  }, [input]);

  function addArticleByCode(code: string, qty: number) {
    const artigo = artigos.find((a) => a.code === code);
    if (!artigo) {
      setStatus(`Não encontrei o artigo com código ${code}.`);
      return;
    }

    const existing = items.find((it) => it.code === code);
    if (existing) {
      const proceed =
        typeof window !== "undefined"
          ? window.confirm(
              `O artigo ${code} já existe no orçamento com quantidade atual ${existing.quantity}. Deseja adicionar outra linha mesmo assim?`,
            )
          : false;

      if (!proceed) {
        setStatus(
          `Artigo ${code} já existe no orçamento (não foi adicionada nova linha).`,
        );
        return;
      }
    }

    const capitulo = capitulos.find((c) => c.code === artigo.capituloCode);
    const kDefault = capitulo?.kFactor ?? 1;
    const custoUnitario = artigo.puCusto ?? 0;
    const precoVendaUnitario = custoUnitario * kDefault;
    const unitPrice = precoVendaUnitario;
    setItems((prev) => [
      ...prev,
      {
        rowId: createRowId(),
        code: artigo.code,
        description: artigo.description,
        unit: artigo.unit,
        quantity: qty,
        unitPrice,
        kAplicado: kDefault,
        custoUnitario,
        precoVendaUnitario,
        grandeCapituloCode: artigo.grandeCapituloCode,
        capituloCode: artigo.capituloCode,
      },
    ]);
    setStatus(`Adicionado artigo ${artigo.code} x ${qty}.`);
  }

  function removeItem(rowId: string) {
    setItems((prev) => prev.filter((it) => it.rowId !== rowId));
    setStatus("Artigo removido.");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    setInput("");
    setShowSuggestions(false);

    const lower = text.toLowerCase();
    if (lower.startsWith("adicionar") || lower.startsWith("add")) {
      const parts = text.split(/\s+/);
      const codePart = parts.find((p) => /[A-Z]\d+\.\d+/.test(p)) ?? "";
      const qPart =
        parts.find((p) => p.toLowerCase().startsWith("q=")) ?? "q=1";
      const qty = Number(qPart.split("=")[1] ?? "1") || 1;

      addArticleByCode(codePart, qty);
    } else if (lower.startsWith("atualizar")) {
      const parts = text.split(/\s+/);
      const codePart = parts.find((p) => /[A-Z]\d+\.\d+/.test(p)) ?? "";
      if (!codePart) {
        setStatus("Não consegui identificar o código do artigo a atualizar.");
        return;
      }

      const qToken = parts.find((p) => /^q=/i.test(p));
      const kToken = parts.find((p) => /^k=/i.test(p));

      let newQty: number | undefined;
      let newK: number | undefined;

      if (qToken) {
        const raw = qToken.split("=")[1] ?? "";
        const parsed = Number(raw.replace(",", "."));
        if (!Number.isNaN(parsed) && parsed >= 0) {
          newQty = parsed;
        }
      }

      if (kToken) {
        const raw = kToken.split("=")[1] ?? "";
        const parsed = Number(raw.replace(",", "."));
        if (!Number.isNaN(parsed) && parsed >= 0) {
          newK = parsed;
        }
      }

      if (newQty === undefined && newK === undefined) {
        setStatus(
          'Para atualizar use por exemplo: "atualizar A1.0001 q=5 k=1.15".',
        );
        return;
      }

      let found = false;
      setItems((prev) =>
        prev.map((row) => {
          if (row.code !== codePart) return row;
          found = true;
          let updated = { ...row };
          if (newQty !== undefined) {
            updated.quantity = newQty;
          }
          if (newK !== undefined) {
            const custo = updated.custoUnitario ?? 0;
            const precoVendaUnitario =
              custo > 0 ? custo * newK : updated.unitPrice;
            updated = {
              ...updated,
              kAplicado: newK,
              precoVendaUnitario,
              unitPrice: precoVendaUnitario,
            };
          }
          return updated;
        }),
      );

      if (!found) {
        setStatus(`Não encontrei nenhuma linha com o código ${codePart}.`);
        return;
      }

      const partesStatus: string[] = [];
      if (newQty !== undefined) {
        partesStatus.push(`q=${newQty}`);
      }
      if (newK !== undefined) {
        partesStatus.push(`K=${newK}`);
      }
      setStatus(`Atualizado ${codePart}: ${partesStatus.join(", ")}.`);
    } else if (lower.startsWith("limpar")) {
      setItems([]);
      setStatus("Orçamento limpo.");
    } else {
      setStatus(
        'Comando não reconhecido. Use por exemplo: "adicionar A1.0001 q=2" ou "limpar".',
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Chat de comandos (topo, largura total) */}
      <section className="flex h-full flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">
          Comandos de criação
        </h2>
        <p className="mb-3 text-xs text-slate-500">
          Exemplos:{" "}
          <span className="font-mono">
            adicionar A1.0001 q=2
          </span>{" "}
          · <span className="font-mono">limpar</span>
        </p>

        <div className="mt-3 relative">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              className="flex-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm outline-none ring-0 placeholder:text-slate-400 focus:border-slate-400"
              placeholder='Ex.: adicionar A1.0001 q=2 ou procure por texto'
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setShowSuggestions(true);
                setHighlightedIndex(null);
              }}
              onFocus={() => {
                setShowSuggestions(true);
                setHighlightedIndex(0);
              }}
              onKeyDown={(e) => {
                if (!showSuggestions && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
                  setShowSuggestions(true);
                }

                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setHighlightedIndex((prev) => {
                    if (suggestions.length === 0) return null;
                    if (prev == null) return 0;
                    return Math.min(prev + 1, suggestions.length - 1);
                  });
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setHighlightedIndex((prev) => {
                    if (suggestions.length === 0) return null;
                    if (prev == null) return suggestions.length - 1;
                    return Math.max(prev - 1, 0);
                  });
                } else if (e.key === "Enter" && highlightedIndex != null && suggestions[highlightedIndex]) {
                  e.preventDefault();
                  const a = suggestions[highlightedIndex];
                  setInput(`adicionar ${a.code} q=1`);
                  setShowSuggestions(false);
                  setHighlightedIndex(null);
                  // Deixar o utilizador carregar Enter novamente para efetivar o comando
                } else if (e.key === "Escape") {
                  setShowSuggestions(false);
                  setHighlightedIndex(null);
                }
              }}
            />
            <button
              type="submit"
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-slate-800"
            >
              Enviar
            </button>
          </form>

          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-72 overflow-auto rounded-2xl border border-slate-200 bg-white py-1 text-xs shadow-lg">
              {suggestions.map((a, idx) => {
                const isActive = idx === highlightedIndex;
                return (
                  <button
                    key={a.code}
                    type="button"
                    className={`flex w-full items-start gap-2 px-3 py-2 text-left ${
                      isActive ? "bg-slate-100" : "hover:bg-slate-50"
                    }`}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => {
                      setInput(`adicionar ${a.code} q=1`);
                      setShowSuggestions(false);
                      setHighlightedIndex(null);
                      inputRef.current?.focus();
                    }}
                  >
                    <span className="font-mono text-[11px] text-slate-900">
                      {a.code}
                    </span>
                    <span className="flex-1 text-[11px] text-slate-700">
                      {a.description}
                    </span>
                    <span className="whitespace-nowrap text-[11px] text-slate-500">
                      {a.unit}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {status ? (
          <p className="mt-2 text-[11px] text-slate-500">{status}</p>
        ) : null}
      </section>

      {/* Catálogo + preview lado a lado */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Árvore de catálogo */}
        <section className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">
            Catálogo hierárquico
          </h2>
          <p className="text-xs text-slate-500">
            Grande Capítulo → Capítulo → primeiros artigos (exemplo). No futuro
            vamos permitir seleção direta daqui.
          </p>
          <div className="max-h-[28rem] space-y-3 overflow-auto pr-1 text-xs">
            {arvore.map(({ gc, capitulos }) => (
              <div key={gc.code} className="space-y-1">
                <div className="font-semibold text-slate-800">
                  {gc.code} — {gc.description}
                </div>
                <div className="space-y-1 pl-3">
                  {capitulos.map(({ cap, artigos: arts }) => (
                    <div key={cap.code} className="space-y-0.5">
                      <div className="font-medium text-slate-700">
                        {cap.code} — {cap.description}
                      </div>
                      <ul className="space-y-0.5 pl-3 text-slate-600">
                        {arts.slice(0, 5).map((a) => (
                          <li key={a.code}>
                            <button
                              type="button"
                              className="inline-flex max-w-full items-baseline gap-1 rounded-full px-2 py-1 text-left hover:bg-slate-100"
                              onClick={() => addArticleByCode(a.code, 1)}
                            >
                              <span className="font-mono text-[11px] text-slate-900">
                                {a.code}
                              </span>
                              <span className="truncate text-[11px] text-slate-700">
                                {" — "}
                                {a.description}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Preview do orçamento */}
        <section className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">
              Preview do orçamento
            </h2>
            <p className="text-xs text-slate-500">
              Total:{" "}
              <span className="font-semibold text-slate-900">
                {total.toLocaleString("pt-PT", {
                  style: "currency",
                  currency: "EUR",
                  minimumFractionDigits: 2,
                })}
              </span>
            </p>
          </div>

          <FolhaRostoResumo meta={meta} />

          <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500">
            <span className="font-medium text-slate-600">
              Colunas visíveis:
            </span>
            {(
              [
                ["code", "Código"],
                ["description", "Descrição"],
                ["qty", "Qtd."],
                ["kAplicado", "K"],
                ["unit", "Unid."],
                ["unitPrice", "PU"],
                ["total", "Total"],
                ["custoUnitario", "Custo"],
                ["precoVendaUnitario", "Preço venda"],
                ["margemPercent", "Margem %"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  className="h-3 w-3 rounded border-slate-300 text-slate-900"
                  checked={visibleColumns[key]}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setVisibleColumns((prev) => ({
                      ...prev,
                      [key]: checked,
                    }));
                  }}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>

          <div className="max-h-[28rem] overflow-auto rounded-lg border border-slate-100">
            <table className="min-w-full border-collapse text-left text-xs">
              <thead className="bg-slate-50">
                <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                  {visibleColumns.code && (
                    <th className="px-3 py-2">Código</th>
                  )}
                  {visibleColumns.description && (
                    <th className="px-3 py-2">Descrição</th>
                  )}
                  {visibleColumns.qty && (
                    <th className="px-3 py-2 text-right">Qtd.</th>
                  )}
                  {visibleColumns.kAplicado && (
                    <th className="px-3 py-2 text-right">K</th>
                  )}
                  {visibleColumns.unit && (
                    <th className="px-3 py-2">Unid.</th>
                  )}
                  {visibleColumns.unitPrice && (
                    <th className="px-3 py-2 text-right">PU</th>
                  )}
                  {visibleColumns.total && (
                    <th className="px-3 py-2 text-right">Total</th>
                  )}
                  {visibleColumns.custoUnitario && (
                    <th className="px-3 py-2 text-right">Custo</th>
                  )}
                  {visibleColumns.precoVendaUnitario && (
                    <th className="px-3 py-2 text-right">Preço venda</th>
                  )}
                  {visibleColumns.margemPercent && (
                    <th className="px-3 py-2 text-right">Margem %</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={
                        Object.values(visibleColumns).filter(Boolean).length || 1
                      }
                      className="px-3 py-6 text-center text-[11px] text-slate-400"
                    >
                      Ainda não adicionou artigos. Use o campo de comandos para
                      começar.
                    </td>
                  </tr>
                ) : (
                  (() => {
                    const sorted = [...items].sort((a, b) =>
                      `${a.grandeCapituloCode}-${a.capituloCode}-${a.code}`.localeCompare(
                        `${b.grandeCapituloCode}-${b.capituloCode}-${b.code}`,
                      ),
                    );

                    let lastGC = "";
                    let lastCap = "";

                    const rows: React.ReactElement[] = [];

                    for (const it of sorted) {
                      const needsGC = it.grandeCapituloCode !== lastGC;
                      const needsCap =
                        needsGC || it.capituloCode !== lastCap;

                      if (needsGC) {
                        lastGC = it.grandeCapituloCode;
                        const gc = grandesCapitulos.find(
                          (g) => g.code === it.grandeCapituloCode,
                        );
                        rows.push(
                          <tr key={`gc-${lastGC}`}>
                            <td
                              colSpan={
                                Object.values(visibleColumns).filter(
                                  Boolean,
                                ).length || 1
                              }
                              className="bg-slate-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-700"
                            >
                              {lastGC} — {gc?.description ?? "Grande capítulo"}
                            </td>
                          </tr>,
                        );
                      }

                      if (needsCap) {
                        lastCap = it.capituloCode;
                        const cap = capitulos.find(
                          (c) => c.code === it.capituloCode,
                        );
                        rows.push(
                          <tr key={`cap-${lastGC}-${lastCap}`}>
                            <td
                              colSpan={
                                Object.values(visibleColumns).filter(
                                  Boolean,
                                ).length || 1
                              }
                              className="bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-700"
                            >
                              {lastCap} — {cap?.description ?? "Capítulo"}
                            </td>
                          </tr>,
                        );
                      }

                      rows.push(
                        <tr
                          key={it.rowId ?? `${it.code}-${rows.length}`}
                          className="border-b border-slate-100 last:border-0"
                        >
                          {visibleColumns.code && (
                            <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-slate-800">
                              <button
                                type="button"
                                className="mr-1 text-slate-300 hover:text-red-600"
                                aria-label="Remover artigo"
                                onClick={() => removeItem(it.rowId)}
                              >
                                ×
                              </button>
                              {it.code}
                            </td>
                          )}
                          {visibleColumns.description && (
                            <td className="max-w-xs px-3 py-2 text-[11px] text-slate-800">
                              {it.description}
                            </td>
                          )}
                          {visibleColumns.qty && (
                            <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] text-slate-800">
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                className="w-20 rounded border border-slate-200 bg-white px-1 py-0.5 text-right text-[11px] outline-none focus:border-slate-400"
                                value={it.quantity}
                                onChange={(e) => {
                                  const value = e.target.value.replace(",", ".");
                                  const q = Number(value);
                                  if (Number.isNaN(q) || q < 0) return;
                                  setItems((prev) =>
                                    prev.map((row) =>
                                      row.rowId === it.rowId
                                        ? { ...row, quantity: q }
                                        : row,
                                    ),
                                  );
                                }}
                              />
                            </td>
                          )}
                          {visibleColumns.kAplicado && (
                            <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] text-slate-800">
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                className="w-16 rounded border border-slate-200 bg-white px-1 py-0.5 text-right text-[11px] outline-none focus:border-slate-400"
                                value={it.kAplicado ?? ""}
                                onChange={(e) => {
                                  const value = e.target.value.replace(",", ".");
                                  const k = Number(value);
                                  if (Number.isNaN(k) || k < 0) return;
                                  setItems((prev) =>
                                    prev.map((row) => {
                                      if (row.rowId !== it.rowId) return row;
                                      const custo = row.custoUnitario ?? 0;
                                      const precoVendaUnitario =
                                        custo > 0 ? custo * k : row.unitPrice;
                                      return {
                                        ...row,
                                        kAplicado: k,
                                        precoVendaUnitario,
                                        unitPrice: precoVendaUnitario,
                                      };
                                    }),
                                  );
                                }}
                              />
                            </td>
                          )}
                          {visibleColumns.unit && (
                            <td className="whitespace-nowrap px-3 py-2 text-[11px] text-slate-700">
                              {it.unit}
                            </td>
                          )}
                          {visibleColumns.unitPrice && (
                            <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] text-slate-800">
                              {it.unitPrice.toLocaleString("pt-PT", {
                                style: "currency",
                                currency: "EUR",
                                minimumFractionDigits: 2,
                              })}
                            </td>
                          )}
                          {visibleColumns.total && (
                            <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] text-slate-800">
                              {(it.quantity * it.unitPrice).toLocaleString(
                                "pt-PT",
                                {
                                  style: "currency",
                                  currency: "EUR",
                                  minimumFractionDigits: 2,
                                },
                              )}
                            </td>
                          )}
                          {visibleColumns.custoUnitario && (
                            <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] text-slate-800">
                              {(it.custoUnitario ?? 0).toLocaleString(
                                "pt-PT",
                                {
                                  style: "currency",
                                  currency: "EUR",
                                  minimumFractionDigits: 2,
                                },
                              )}
                            </td>
                          )}
                          {visibleColumns.precoVendaUnitario && (
                            <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] text-slate-800">
                              {(it.precoVendaUnitario ?? it.unitPrice).toLocaleString(
                                "pt-PT",
                                {
                                  style: "currency",
                                  currency: "EUR",
                                  minimumFractionDigits: 2,
                                },
                              )}
                            </td>
                          )}
                          {visibleColumns.margemPercent && (
                            <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] text-slate-800">
                              {it.custoUnitario && it.custoUnitario > 0
                                ? `${(
                                    ((it.precoVendaUnitario ?? it.unitPrice) -
                                      it.custoUnitario) /
                                    it.custoUnitario *
                                    100
                                  ).toLocaleString("pt-PT", {
                                    maximumFractionDigits: 1,
                                  })} %`
                                : "—"}
                            </td>
                          )}
                        </tr>,
                      );
                    }

                    return rows;
                  })()
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function FolhaRostoResumo({ meta }: { meta: BudgetMeta }) {
  const temClienteOuObra =
    meta.clienteNome.trim().length > 0 || meta.obraNome.trim().length > 0;

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 text-[11px] text-slate-700">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="space-y-0.5">
          <div className="font-semibold text-slate-900">
            {meta.tituloProposta || "Proposta de orçamento"}
          </div>
          {temClienteOuObra ? (
            <div className="space-y-0.5">
              {meta.clienteNome && (
                <div>
                  <span className="font-medium text-slate-800">Cliente: </span>
                  <span>{meta.clienteNome}</span>
                  {meta.clienteEntidade && ` · ${meta.clienteEntidade}`}
                </div>
              )}
              {meta.obraNome && (
                <div>
                  <span className="font-medium text-slate-800">Obra: </span>
                  <span>{meta.obraNome}</span>
                  {meta.obraEndereco && ` · ${meta.obraEndereco}`}
                </div>
              )}
            </div>
          ) : (
            <div className="text-slate-400">
              Preencha os dados de cliente e obra na folha de rosto.
            </div>
          )}
        </div>
        <div className="text-right text-[10px] text-slate-600">
          <div>
            <span className="font-medium">Data proposta: </span>
            <span>{meta.dataProposta}</span>
          </div>
          <div>
            <span className="font-medium">Validade: </span>
            <span>
              {meta.validadeDias > 0 ? `${meta.validadeDias} dias` : "—"}
            </span>
          </div>
        </div>
      </div>
      {meta.notasResumo && (
        <p className="mt-2 text-[10px] text-slate-600">{meta.notasResumo}</p>
      )}
    </div>
  );
}


