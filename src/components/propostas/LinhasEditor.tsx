"use client";

import { useEffect, useRef, useState } from "react";
import type { PropostaLinha } from "@/propostas/domain";
import { formatCurrencyPt } from "@/propostas/format";
import { ImportarLinhasModal } from "@/components/propostas/ImportarLinhasModal";
import {
  parseImportedLines,
  type ParsedImportedLine,
} from "@/lib/propostas/parseImportedLines";

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
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [iaModalOpen, setIaModalOpen] = useState(false);
  const [iaDescricao, setIaDescricao] = useState("");
  const [iaLoading, setIaLoading] = useState(false);
  const [iaError, setIaError] = useState<string | null>(null);
  const catalogoDebounceRef = useRef<number | null>(null);

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
      } catch {
        setCatalogoResultados([]);
        setCatalogoDropdownVisivel(false);
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
      const quantidade = Number.isFinite(next.quantidade) ? next.quantidade : 0;
      const precoCusto = Number.isFinite(next.precoCustoUnitario)
        ? next.precoCustoUnitario
        : 0;
      const precoVenda = Number.isFinite(next.precoVendaUnitario)
        ? next.precoVendaUnitario
        : 0;
      next.totalCustoLinha = quantidade * precoCusto;
      next.totalVendaLinha = quantidade * precoVenda;
      return next;
    });
    onLinhasChange(nextLinhas);
  };

  const handleSelectArtigo = (artigo: CatalogoArtigo) => {
    onSelectArtigoCatalogo(artigo);
    setCatalogoQuery(`${artigo.codigo} — ${artigo.descricao}`);
    setCatalogoDropdownVisivel(false);
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
                placeholder="Pesquisar artigo no catálogo"
                className="w-64 rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-700 placeholder:text-slate-400 outline-none focus:border-slate-400"
                value={catalogoQuery}
                onChange={(e) => setCatalogoQuery(e.target.value)}
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
                    {catalogoResultados.map((artigo) => (
                      <li
                        key={artigo.id}
                        className="cursor-pointer border-b border-slate-100 px-3 py-2 last:border-0 hover:bg-slate-50"
                        onClick={() => handleSelectArtigo(artigo)}
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
                          {artigo.descricao}
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-slate-600">
                          <span>
                            {artigo.unidade ?? "—"} · Custo:{" "}
                            {artigo.preco_custo_unitario ?? "—"} · Venda:{" "}
                            {artigo.preco_venda_unitario ?? "—"}
                          </span>
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
            <button
              type="button"
              onClick={() => setIaModalOpen(true)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
            >
              Gerar com IA
            </button>
          </div>
        )}
      </div>

      <div className="max-h-[28rem] overflow-auto rounded-lg border border-slate-100">
        <table className="min-w-full border-collapse text-left text-xs">
          <thead className="bg-slate-50">
            <tr className="text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2">Descrição</th>
              <th className="px-3 py-2 text-right">Qtd.</th>
              <th className="px-3 py-2">Unid.</th>
              <th className="px-3 py-2">Capítulo</th>
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
                  colSpan={podeEditar ? 10 : 9}
                  className="px-3 py-6 text-center text-[11px] text-slate-400"
                >
                  Ainda não adicionou linhas. Use &quot;Adicionar linha
                  livre&quot; para começar.
                </td>
              </tr>
            ) : (
              linhas.map((linha) => (
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
                      linha.descricao
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
                  <td className="whitespace-nowrap px-3 py-2 text-[11px] text-slate-800">
                    {podeEditar ? (
                      <div className="flex flex-col gap-1">
                        <input
                          type="text"
                          className="w-14 rounded border border-slate-200 bg-white px-1 py-0.5 text-center text-[10px] outline-none focus:border-slate-400"
                          value={linha.grandeCapitulo ?? ""}
                          onChange={(e) =>
                            handleLinhaChange(linha.id, {
                              grandeCapitulo: e.target.value,
                            })
                          }
                          placeholder="GC"
                        />
                        <input
                          type="text"
                          className="w-20 rounded border border-slate-200 bg-white px-1 py-0.5 text-center text-[10px] outline-none focus:border-slate-400"
                          value={linha.capitulo ?? ""}
                          onChange={(e) =>
                            handleLinhaChange(linha.id, {
                              capitulo: e.target.value,
                            })
                          }
                          placeholder="Cap."
                        />
                      </div>
                    ) : (
                      linha.capitulo && linha.capitulo.trim().length > 0
                        ? linha.capitulo
                        : "—"
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
                    {formatCurrencyPt(linha.totalCustoLinha)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] text-slate-800">
                    {podeEditar ? (
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="w-24 rounded border border-slate-200 bg-white px-1 py-0.5 text-right text-[11px] outline-none focus:border-slate-400"
                        value={linha.precoVendaUnitario}
                        onChange={(e) =>
                          handleLinhaChange(linha.id, {
                            precoVendaUnitario: Number(e.target.value) || 0,
                          })
                        }
                      />
                    ) : (
                      formatCurrencyPt(linha.precoVendaUnitario)
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] text-slate-800">
                    {formatCurrencyPt(linha.totalVendaLinha)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] text-slate-800">
                    {(() => {
                      const margemValor =
                        linha.totalVendaLinha - linha.totalCustoLinha;
                      if (!Number.isFinite(margemValor)) return "—";
                      const hasVenda = linha.totalVendaLinha > 0;
                      const pct = hasVenda
                        ? (margemValor / linha.totalVendaLinha) * 100
                        : null;
                      return pct !== null
                        ? `${formatCurrencyPt(margemValor)} (${pct.toFixed(1)}%)`
                        : formatCurrencyPt(margemValor);
                    })()}
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
              ))
            )}
          </tbody>
        </table>
      </div>

      <ImportarLinhasModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onInsert={onInsertImportedLines}
      />

      {iaModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="max-h-[90vh] w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Gerar linhas com IA
              </h2>
              <button
                type="button"
                onClick={() => {
                  if (iaLoading) return;
                  setIaModalOpen(false);
                  setIaError(null);
                }}
                className="text-[11px] text-slate-500 hover:text-slate-700"
              >
                Fechar
              </button>
            </div>
            <div className="space-y-3 px-4 py-4 text-xs text-slate-700">
              <p className="text-[11px] text-slate-500">
                Nesta versão ainda não estamos a ligar à IA. Descreve os
                trabalhos abaixo; em breve este texto será usado para sugerir
                linhas de orçamento automaticamente.
              </p>
              <textarea
                className="h-40 w-full resize-none rounded border border-slate-200 p-2 text-[11px] text-slate-800 outline-none focus:border-slate-400"
                placeholder="Descreve os trabalhos que queres transformar em linhas de orçamento (ex.: demolições, pinturas, pavimentos, instalações elétricas, etc.)"
                value={iaDescricao}
                onChange={(e) => setIaDescricao(e.target.value)}
              />
              {iaError && (
                <p className="text-[11px] text-red-600">{iaError}</p>
              )}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (iaLoading) return;
                    setIaModalOpen(false);
                    setIaError(null);
                  }}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  disabled={iaLoading || !iaDescricao.trim()}
                  onClick={async () => {
                    const texto = iaDescricao.trim();
                    if (!texto || iaLoading) return;
                    try {
                      setIaLoading(true);
                      setIaError(null);
                      const res = await fetch("/api/ia/orcamento", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ descricao: texto }),
                      });
                      if (!res.ok) {
                        const data = (await res.json().catch(() => null)) as
                          | { error?: string }
                          | null;
                        throw new Error(
                          data?.error ||
                            "Falha ao gerar linhas com IA (mock).",
                        );
                      }
                      const data = (await res.json()) as {
                        linhas?: string[];
                      };
                      const rawText = (data.linhas ?? []).join("\n");
                      const parsed = parseImportedLines(rawText);
                      const valid = parsed.filter((l) => l.isValid);
                      if (valid.length === 0) {
                        setIaError(
                          "Não foi possível gerar linhas válidas a partir do texto.",
                        );
                        return;
                      }
                      onInsertImportedLines(valid);
                      setIaDescricao("");
                      setIaError(null);
                      setIaModalOpen(false);
                    } catch (err) {
                      const message =
                        err instanceof Error ? err.message : String(err);
                      setIaError(message);
                    } finally {
                      setIaLoading(false);
                    }
                  }}
                  className="rounded-full bg-slate-900 px-4 py-1.5 text-[11px] font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {iaLoading ? "A gerar…" : "Gerar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
