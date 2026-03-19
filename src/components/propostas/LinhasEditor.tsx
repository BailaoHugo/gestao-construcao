"use client";

import { useEffect, useRef, useState } from "react";
import type { PropostaLinha } from "@/propostas/domain";
import { formatCurrencyPt } from "@/propostas/format";
import { ImportarLinhasModal } from "@/components/propostas/ImportarLinhasModal";
import {
  parseImportedLines,
  type ParsedImportedLine,
} from "@/lib/propostas/parseImportedLines";
import {
  calcularDerivadosLinha,
  K_DEFAULT,
} from "@/lib/propostas/linhaDerivados";

export type CatalogoArtigo = {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string | null;
  grande_capitulo: string | null;
  capitulo: string | null;
  preco_custo_unitario: number | null;
  preco_venda_unitario: number | null;
  origem: string;
};

type LinhasEditorProps = {
  linhas: PropostaLinha[];
  onLinhasChange: (linhas: PropostaLinha[]) => void;
  podeEditar: boolean;
  fatorVenda: number;
  onAddLinhaLivre: () => void;
  onRemoveLinha: (id: string) => void;
  onInsertImportedLines: (linhas: ParsedImportedLine[]) => void;
  onSelectArtigoCatalogo: (artigo: CatalogoArtigo) => void;
};

function highlightMatch(text: string, query: string) {
  const q = query.trim();
  if (!q) return text;

  const index = text.toLowerCase().indexOf(q.toLowerCase());
  if (index === -1) return text;

  const before = text.slice(0, index);
  const match = text.slice(index, index + q.length);
  const after = text.slice(index + q.length);

  return (
    <>
      {before}
      <mark className="rounded bg-amber-100 px-0.5 text-amber-900">
        {match}
      </mark>
      {after}
    </>
  );
}

export default function LinhasEditor({
  linhas,
  onLinhasChange,
  podeEditar,
  fatorVenda: _fatorVenda,
  onAddLinhaLivre,
  onRemoveLinha,
  onInsertImportedLines,
  onSelectArtigoCatalogo,
}: LinhasEditorProps) {
  const [catalogoQuery, setCatalogoQuery] = useState("");
  const [catalogoResultados, setCatalogoResultados] = useState<
    CatalogoArtigo[]
  >([]);
  const [catalogoLoading, setCatalogoLoading] = useState(false);
  const [catalogoDropdownVisivel, setCatalogoDropdownVisivel] = useState(false);
  const [catalogoHighlightedIndex, setCatalogoHighlightedIndex] =
    useState<number>(-1);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const catalogoDebounceRef = useRef<number | null>(null);
  const catalogoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (catalogoDebounceRef.current !== null) {
      window.clearTimeout(catalogoDebounceRef.current);
      catalogoDebounceRef.current = null;
    }

    const q = catalogoQuery.trim();

    if (q.length < 2) {
      setCatalogoResultados([]);
      setCatalogoDropdownVisivel(false);
      setCatalogoLoading(false);
      return;
    }

    catalogoDebounceRef.current = window.setTimeout(async () => {
      try {
        setCatalogoLoading(true);
        const res = await fetch(
          `/api/propostas/catalogo?q=${encodeURIComponent(q)}`,
        );
        if (!res.ok) throw new Error("Falha ao pesquisar catálogo");
        const data = (await res.json()) as CatalogoArtigo[];
        setCatalogoResultados(data);
        setCatalogoDropdownVisivel(true);
        setCatalogoHighlightedIndex(data.length > 0 ? 0 : -1);
      } catch {
        setCatalogoResultados([]);
        setCatalogoDropdownVisivel(false);
        setCatalogoHighlightedIndex(-1);
      } finally {
        setCatalogoLoading(false);
      }
    }, 250);

    return () => {
      if (catalogoDebounceRef.current !== null) {
        window.clearTimeout(catalogoDebounceRef.current);
        catalogoDebounceRef.current = null;
      }
    };
  }, [catalogoQuery]);

  const handleLinhaChange = (id: string, patch: Partial<PropostaLinha>) => {
    if (!podeEditar) return;
    const nextLinhas = linhas.map((linha) => {
      if (linha.id !== id) return linha;
      const next: PropostaLinha = { ...linha, ...patch };

      const derivados = calcularDerivadosLinha(next, K_DEFAULT);
      next.precoVendaUnitario = derivados.precoVendaUnitario;
      next.totalCustoLinha = derivados.totalCustoLinha;
      next.totalVendaLinha = derivados.totalVendaLinha;
      return next;
    });
    onLinhasChange(nextLinhas);
  };

  // Normaliza valores derivados quando uma proposta já existente é carregada.
  // Isto garante que (PU Venda, totais e margem) ficam consistentes mesmo se os campos
  // persistidos na BD estiverem incompletos/desatualizados.
  useEffect(() => {
    if (!podeEditar) return;

    const EPS = 1e-6;

    const normalizadas = linhas.map((linha) => {
      const derivados = calcularDerivadosLinha(linha, K_DEFAULT);
      return {
        ...linha,
        k: linha.k ?? derivados.kEffective,
        precoVendaUnitario: derivados.precoVendaUnitario,
        totalCustoLinha: derivados.totalCustoLinha,
        totalVendaLinha: derivados.totalVendaLinha,
      };
    });

    const mudou = normalizadas.some((n, idx) => {
      const o = linhas[idx];
      if (!o) return true;
      const kChanged = (o.k ?? K_DEFAULT) !== (n.k ?? K_DEFAULT);
      const totalCustoChanged =
        Math.abs((o.totalCustoLinha ?? 0) - (n.totalCustoLinha ?? 0)) >
        EPS;
      const totalVendaChanged =
        Math.abs((o.totalVendaLinha ?? 0) - (n.totalVendaLinha ?? 0)) >
        EPS;
      const precoVendaChanged =
        Math.abs(
          (o.precoVendaUnitario ?? 0) - (n.precoVendaUnitario ?? 0),
        ) > EPS;
      return kChanged || totalCustoChanged || totalVendaChanged || precoVendaChanged;
    });

    if (mudou) onLinhasChange(normalizadas);
  }, [linhas, podeEditar, onLinhasChange]);

  const handleSelectArtigo = (artigo: CatalogoArtigo) => {
    onSelectArtigoCatalogo(artigo);
    setCatalogoQuery("");
    setCatalogoResultados([]);
    setCatalogoDropdownVisivel(false);
    setCatalogoHighlightedIndex(-1);

    // restore focus to the catalog search input on the next frame
    window.requestAnimationFrame(() => {
      catalogoInputRef.current?.focus();
    });
  };

  return (
    <section className="space-y-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">
          Linhas da proposta
        </h2>
        {!podeEditar && (
          <p className="text-[11px] text-slate-500">
            Esta revisão está emitida e não pode ser editada diretamente.
          </p>
        )}
        {podeEditar && (
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <div className="relative">
              <input
                type="text"
                ref={catalogoInputRef}
                placeholder="Pesquisar artigo no catálogo"
                className="w-64 rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-700 placeholder:text-slate-400 outline-none focus:border-slate-400"
                value={catalogoQuery}
                onChange={(e) => setCatalogoQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    if (
                      catalogoDropdownVisivel &&
                      catalogoResultados.length > 0
                    ) {
                      e.preventDefault();
                      setCatalogoHighlightedIndex((prev) => {
                        const next = prev + 1;
                        return next >= catalogoResultados.length
                          ? catalogoResultados.length - 1
                          : next;
                      });
                    }
                    return;
                  }
                  if (e.key === "ArrowUp") {
                    if (
                      catalogoDropdownVisivel &&
                      catalogoResultados.length > 0
                    ) {
                      e.preventDefault();
                      setCatalogoHighlightedIndex((prev) => {
                        const next = prev - 1;
                        return next < 0 ? 0 : next;
                      });
                    }
                    return;
                  }
                  if (e.key === "Enter") {
                    if (
                      catalogoDropdownVisivel &&
                      !catalogoLoading &&
                      catalogoResultados.length > 0
                    ) {
                      e.preventDefault();
                      const indexToUse =
                        catalogoHighlightedIndex >= 0 &&
                        catalogoHighlightedIndex < catalogoResultados.length
                          ? catalogoHighlightedIndex
                          : 0;
                      handleSelectArtigo(catalogoResultados[indexToUse]);
                    }
                    return;
                  }
                  if (e.key === "Escape") {
                    if (catalogoDropdownVisivel) {
                      e.preventDefault();
                      setCatalogoDropdownVisivel(false);
                      setCatalogoHighlightedIndex(-1);
                    }
                  }
                }}
                onFocus={() => {
                  if (catalogoResultados.length > 0) {
                    setCatalogoDropdownVisivel(true);
                  }
                }}
              />
              {catalogoLoading && (
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[10px] text-slate-400">
                  A pesquisar…
                </div>
              )}
              {catalogoDropdownVisivel && catalogoResultados.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-64 w-80 overflow-auto rounded-lg border border-slate-200 bg-white text-[11px] shadow-lg">
                  <ul>
                    {catalogoResultados.map((artigo, index) => (
                      <li
                        key={artigo.id}
                        className={`cursor-pointer border-b border-slate-100 px-3 py-2 last:border-0 hover:bg-slate-50 ${
                          index === catalogoHighlightedIndex
                            ? "bg-slate-100"
                            : ""
                        }`}
                        onClick={() => handleSelectArtigo(artigo)}
                        onMouseEnter={() =>
                          setCatalogoHighlightedIndex(index)
                        }
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] text-emerald-700">
                            {artigo.codigo}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {artigo.capitulo ?? "—"}
                          </span>
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-800">
                          {highlightMatch(artigo.descricao, catalogoQuery)}
                        </div>
                        <div className="mt-1 space-y-0.5 text-[10px] text-slate-600">
                          <div className="font-medium text-slate-800">
                            {artigo.preco_venda_unitario != null
                              ? formatCurrencyPt(artigo.preco_venda_unitario)
                              : "—"}{" "}
                            <span className="text-[10px] text-slate-500">
                              / {artigo.unidade ?? "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Custo:</span>{" "}
                            {artigo.preco_custo_unitario != null
                              ? formatCurrencyPt(artigo.preco_custo_unitario)
                              : "—"}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onAddLinhaLivre}
              className="rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-slate-800"
            >
              Adicionar linha livre
            </button>
            <button
              type="button"
              onClick={() => setImportModalOpen(true)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
            >
              Importar linhas
            </button>
          </div>
        )}
      </div>

      <div className="max-h-[28rem] overflow-auto rounded-lg border border-slate-100">
        <table className="min-w-full border-collapse text-left text-xs">
          <thead className="bg-slate-50">
            <tr className="text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2">Descrição</th>
              <th className="w-0 px-2 py-2 text-center" title="Código artigo">
                <span className="text-[10px] font-normal text-slate-400">Cód.</span>
              </th>
              <th className="px-3 py-2 text-right">Qtd.</th>
              <th className="px-3 py-2">Unid.</th>
              <th className="px-3 py-2">Grande Cap.</th>
              <th className="px-3 py-2">Cap.</th>
              <th className="px-3 py-2 text-right">K</th>
              <th className="px-3 py-2 text-right">PU Custo</th>
              <th className="px-3 py-2 text-right">Total Custo</th>
              <th className="px-3 py-2 text-right">PU Venda</th>
              <th className="px-3 py-2 text-right">Total Venda</th>
              <th className="px-3 py-2 text-right">Margem</th>
              {podeEditar && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {linhas.length === 0 ? (
              <tr>
                <td
                  colSpan={podeEditar ? 13 : 12}
                  className="px-3 py-6 text-center text-[11px] text-slate-400"
                >
                  Ainda não adicionou linhas. Use &quot;Adicionar linha
                  livre&quot; para começar.
                </td>
              </tr>
            ) : (
              linhas.map((linha) => {
                const derivados = calcularDerivadosLinha(linha, K_DEFAULT);
                const margemValor = derivados.totalVendaLinha - derivados.totalCustoLinha;
                const hasVenda = derivados.totalVendaLinha > 0;
                const pct = hasVenda
                  ? (margemValor / derivados.totalVendaLinha) * 100
                  : null;

                return (
                  <tr
                    key={linha.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                  <td className="px-3 py-2 text-[11px] text-slate-800">
                    {podeEditar ? (
                      <input
                        type="text"
                        className="w-full rounded border border-slate-200 bg-white px-1 py-0.5 text-[11px] outline-none focus:border-slate-400"
                        value={linha.descricao}
                        onChange={(e) =>
                          handleLinhaChange(linha.id, {
                            descricao: e.target.value,
                          })
                        }
                        placeholder="Descrição da linha"
                      />
                    ) : (
                      <div>{linha.descricao}</div>
                    )}
                  </td>
                  <td className="w-0 max-w-[4rem] px-2 py-2 text-center font-mono text-[10px] text-slate-400">
                    {podeEditar ? (
                      <input
                        type="text"
                        className="w-full min-w-0 rounded border border-slate-200 bg-white px-1 py-0.5 text-center text-[10px] outline-none focus:border-slate-400"
                        value={linha.codigoArtigo ?? ""}
                        onChange={(e) =>
                          handleLinhaChange(linha.id, {
                            codigoArtigo: e.target.value.trim() || null,
                          })
                        }
                        placeholder="—"
                        title="Código artigo"
                      />
                    ) : (
                      linha.codigoArtigo ?? "—"
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] text-slate-800">
                    {podeEditar ? (
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="w-20 rounded border border-slate-200 bg-white px-1 py-0.5 text-right text-[11px] outline-none focus:border-slate-400"
                        value={linha.quantidade}
                        onChange={(e) =>
                          handleLinhaChange(linha.id, {
                            quantidade: Number(e.target.value) || 0,
                          })
                        }
                      />
                    ) : (
                      linha.quantidade
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-[11px] text-slate-800">
                    {podeEditar ? (
                      <input
                        type="text"
                        className="w-16 rounded border border-slate-200 bg-white px-1 py-0.5 text-[11px] outline-none focus:border-slate-400"
                        value={linha.unidade}
                        onChange={(e) =>
                          handleLinhaChange(linha.id, {
                            unidade: e.target.value,
                          })
                        }
                        placeholder="m², un, vg..."
                      />
                    ) : (
                      linha.unidade
                    )}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-[11px] text-slate-800">
                    {podeEditar ? (
                      <input
                        type="text"
                        className="w-14 rounded border border-slate-200 bg-white px-1 py-0.5 text-center text-[10px] outline-none focus:border-slate-400"
                        value={linha.grandeCapitulo ?? ""}
                        onChange={(e) =>
                          handleLinhaChange(linha.id, {
                            grandeCapitulo: e.target.value.trim() || null,
                          })
                        }
                        placeholder="—"
                        title="Grande capítulo"
                      />
                    ) : (
                      (linha.grandeCapitulo && linha.grandeCapitulo.trim()) ? linha.grandeCapitulo : "—"
                    )}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-[11px] text-slate-800">
                    {podeEditar ? (
                      <input
                        type="text"
                        className="w-20 rounded border border-slate-200 bg-white px-1 py-0.5 text-center text-[10px] outline-none focus:border-slate-400"
                        value={linha.capitulo ?? ""}
                        onChange={(e) =>
                          handleLinhaChange(linha.id, {
                            capitulo: e.target.value.trim() || null,
                          })
                        }
                        placeholder="—"
                        title="Capítulo"
                      />
                    ) : (
                      (linha.capitulo && linha.capitulo.trim().length > 0) ? linha.capitulo : "—"
                    )}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-right text-[11px] text-slate-800">
                    {podeEditar ? (
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="w-14 rounded border border-slate-200 bg-white px-1 py-0.5 text-right text-[11px] outline-none focus:border-slate-400"
                        value={linha.k ?? K_DEFAULT}
                        onChange={(e) => {
                          const v = e.target.value;
                          const num = v === "" ? null : Number(v);
                          handleLinhaChange(linha.id, {
                            k: num === null || !Number.isFinite(num) ? undefined : num,
                          });
                        }}
                        placeholder="1.30"
                        title="Coeficiente K (pu_venda = pu_custo × K)"
                      />
                    ) : (
                      (linha.k != null && Number.isFinite(linha.k))
                        ? Number(linha.k).toFixed(2)
                        : "1.30"
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] text-slate-800">
                    {podeEditar ? (
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="w-24 rounded border border-slate-200 bg-white px-1 py-0.5 text-right text-[11px] outline-none focus:border-slate-400"
                        value={linha.precoCustoUnitario}
                        onChange={(e) =>
                          handleLinhaChange(linha.id, {
                            precoCustoUnitario: Number(e.target.value) || 0,
                          })
                        }
                      />
                    ) : (
                      formatCurrencyPt(linha.precoCustoUnitario)
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] text-slate-800">
                    {formatCurrencyPt(derivados.totalCustoLinha)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] text-slate-800">
                    {formatCurrencyPt(derivados.precoVendaUnitario)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] text-slate-800">
                    {formatCurrencyPt(derivados.totalVendaLinha)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] text-slate-800">
                    {pct !== null
                      ? `${formatCurrencyPt(margemValor)} (${pct.toFixed(1)}%)`
                      : formatCurrencyPt(margemValor)}
                  </td>
                  {podeEditar && (
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <button
                        type="button"
                        className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] text-slate-500 hover:bg-slate-50"
                        onClick={() => onRemoveLinha(linha.id)}
                      >
                        Remover
                      </button>
                    </td>
                  )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ImportarLinhasModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onInsert={onInsertImportedLines}
      />
    </section>
  );
}
