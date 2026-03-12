"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PropostaFolhaRosto, PropostaLinha } from "@/propostas/domain";
import { formatCurrencyPt } from "@/propostas/format";
import { ImportarLinhasModal } from "@/components/propostas/ImportarLinhasModal";
import type { ParsedImportedLine } from "@/lib/propostas/parseImportedLines";

function createEmptyFolhaRosto(): PropostaFolhaRosto {
  const today = new Date().toISOString().slice(0, 10);
  return {
    clienteNome: "",
    clienteContacto: "",
    clienteEmail: "",
    obraNome: "",
    obraMorada: "",
    dataProposta: today,
    validadeDias: 30,
    referenciaInterna: "",
    notas: "",
  };
}

function createEmptyLinha(): PropostaLinha {
  return {
    id: crypto.randomUUID(),
    artigoId: null,
    origem: "LIVRE",
    descricao: "",
    unidade: "",
    quantidade: 1,
    precoCustoUnitario: 0,
    totalCustoLinha: 0,
    precoVendaUnitario: 0,
    totalVendaLinha: 0,
  };
}

export default function NovaPropostaPage() {
  const router = useRouter();
  const [folhaRosto, setFolhaRosto] = useState<PropostaFolhaRosto>(
    createEmptyFolhaRosto,
  );
  const [linhas, setLinhas] = useState<PropostaLinha[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fatorVenda, setFatorVenda] = useState(1.3);
  const [importModalOpen, setImportModalOpen] = useState(false);

  type CatalogoArtigo = {
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

  const [catalogoQuery, setCatalogoQuery] = useState("");
  const [catalogoResultados, setCatalogoResultados] = useState<CatalogoArtigo[]>(
    [],
  );
  const [catalogoLoading, setCatalogoLoading] = useState(false);
  const [catalogoDropdownVisivel, setCatalogoDropdownVisivel] = useState(false);
  const catalogoDebounceRef = useRef<number | null>(null);

  const totais = useMemo(() => {
    const totalCusto = linhas.reduce(
      (sum, l) => sum + l.totalCustoLinha,
      0,
    );
    const totalVenda = linhas.reduce(
      (sum, l) => sum + l.totalVendaLinha,
      0,
    );
    const margemValor = totalVenda - totalCusto;
    const margemPercentagem =
      totalVenda > 0 ? (margemValor / totalVenda) * 100 : 0;
    return { totalCusto, totalVenda, margemValor, margemPercentagem };
  }, [linhas]);

  const handleAddLinhaLivre = () => {
    setLinhas((prev) => [...prev, createEmptyLinha()]);
  };

  const handleLinhaChange = (id: string, patch: Partial<PropostaLinha>) => {
    setLinhas((prev) =>
      prev.map((linha) => {
        if (linha.id !== id) return linha;
        const next: PropostaLinha = { ...linha, ...patch };
        const quantidade = Number.isFinite(next.quantidade)
          ? next.quantidade
          : 0;
        const precoCusto = Number.isFinite(next.precoCustoUnitario)
          ? next.precoCustoUnitario
          : 0;
        const precoVenda = Number.isFinite(next.precoVendaUnitario)
          ? next.precoVendaUnitario
          : 0;
        next.totalCustoLinha = quantidade * precoCusto;
        next.totalVendaLinha = quantidade * precoVenda;
        return next;
      }),
    );
  };

  const handleRemoverLinha = (id: string) => {
    setLinhas((prev) => prev.filter((l) => l.id !== id));
  };

  const handleInsertImportedLines = (linhasImportadas: ParsedImportedLine[]) => {
    const novas: PropostaLinha[] = linhasImportadas.map((l) => {
      const quantidade = l.quantidade ?? 0;
      const precoVendaUnitario = l.preco_venda_unitario ?? 0;
      const precoCustoUnitario = l.preco_custo_unitario ?? 0;
      return {
        id: crypto.randomUUID(),
        artigoId: null,
        origem: "IMPORTADA",
        descricao: l.descricao,
        unidade: l.unidade ?? "",
        grandeCapitulo: "",
        capitulo: l.capitulo ?? "",
        quantidade,
        precoCustoUnitario,
        totalCustoLinha:
          l.total_custo_linha ?? quantidade * precoCustoUnitario,
        precoVendaUnitario,
        totalVendaLinha:
          l.total_venda_linha ?? quantidade * precoVendaUnitario,
      };
    });
    setLinhas((prev) => [...prev, ...novas]);
  };

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
        if (!res.ok) {
          throw new Error("Falha ao pesquisar catálogo");
        }
        const data = (await res.json()) as CatalogoArtigo[];
        setCatalogoResultados(data);
        setCatalogoDropdownVisivel(true);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
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

  const handleSelectArtigo = (artigo: CatalogoArtigo) => {
    // Criar nova linha de proposta pré-preenchida a partir do catálogo.
    const quantidade = 1;
    const precoCusto =
      artigo.preco_custo_unitario !== null
        ? artigo.preco_custo_unitario
        : 0;
    const precoVenda =
      artigo.preco_venda_unitario !== null
        ? artigo.preco_venda_unitario
        : precoCusto * fatorVenda;

    const novaLinha: PropostaLinha = {
      id: crypto.randomUUID(),
      artigoId: artigo.id,
      codigoArtigo: artigo.codigo,
      origem: "CATALOGO",
      descricao: artigo.descricao,
      unidade: artigo.unidade ?? "",
      grandeCapitulo: artigo.grande_capitulo ?? "",
      capitulo: artigo.capitulo ?? "",
      quantidade,
      precoCustoUnitario: precoCusto,
      totalCustoLinha: quantidade * precoCusto,
      precoVendaUnitario: precoVenda,
      totalVendaLinha: quantidade * precoVenda,
    };

    setLinhas((prev) => [...prev, novaLinha]);

    // Manter comportamento atual do campo de pesquisa.
    setCatalogoQuery(`${artigo.codigo} — ${artigo.descricao}`);
    setCatalogoDropdownVisivel(false);
    // eslint-disable-next-line no-console
    console.log("[propostas/nova] Artigo selecionado:", artigo);
  };

  const handleGuardar = async () => {
    if (!folhaRosto.clienteNome) {
      setError("Indique o nome do cliente.");
      return;
    }
    if (linhas.length === 0) {
      setError("Adicione pelo menos uma linha à proposta.");
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      const res = await fetch("/api/propostas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folhaRosto, linhas }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error || "Falha ao gravar proposta");
      }
      const data = (await res.json()) as { id: string };
      router.push(`/propostas/${data.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Nova proposta
          </h1>
          <p className="max-w-2xl text-sm text-slate-500">
            Preencha a folha de rosto e as linhas da proposta. Ao gravar, os
            dados são guardados na base de dados (Supabase).
          </p>
        </div>
        <span className="rounded-full bg-slate-900 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-white">
          Rascunho
        </span>
      </header>

      {/* Folha de rosto */}
      <section className="space-y-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Folha de rosto</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-700">
                Cliente
              </label>
              <input
                type="text"
                className="w-full rounded border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-400"
                value={folhaRosto.clienteNome}
                onChange={(e) =>
                  setFolhaRosto((prev) => ({
                    ...prev,
                    clienteNome: e.target.value,
                  }))
                }
                placeholder="Nome do cliente"
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-700">
                  Contacto
                </label>
                <input
                  type="text"
                  className="w-full rounded border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-400"
                  value={folhaRosto.clienteContacto ?? ""}
                  onChange={(e) =>
                    setFolhaRosto((prev) => ({
                      ...prev,
                      clienteContacto: e.target.value,
                    }))
                  }
                  placeholder="Telefone ou telemóvel"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full rounded border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-400"
                  value={folhaRosto.clienteEmail ?? ""}
                  onChange={(e) =>
                    setFolhaRosto((prev) => ({
                      ...prev,
                      clienteEmail: e.target.value,
                    }))
                  }
                  placeholder="email@cliente.pt"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-700">
                Obra (opcional)
              </label>
              <input
                type="text"
                className="w-full rounded border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-400"
                value={folhaRosto.obraNome ?? ""}
                onChange={(e) =>
                  setFolhaRosto((prev) => ({
                    ...prev,
                    obraNome: e.target.value,
                  }))
                }
                placeholder="Nome ou referência da obra"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-700">
                Morada da obra (opcional)
              </label>
              <input
                type="text"
                className="w-full rounded border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-400"
                value={folhaRosto.obraMorada ?? ""}
                onChange={(e) =>
                  setFolhaRosto((prev) => ({
                    ...prev,
                    obraMorada: e.target.value,
                  }))
                }
                placeholder="Rua, nº, localidade"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-700">
              Data da proposta
            </label>
            <input
              type="date"
              className="w-full rounded border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-400"
              value={folhaRosto.dataProposta}
              onChange={(e) =>
                setFolhaRosto((prev) => ({
                  ...prev,
                  dataProposta: e.target.value,
                }))
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-700">
              Validade (dias)
            </label>
            <input
              type="number"
              min={0}
              className="w-full rounded border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-400"
              value={folhaRosto.validadeDias}
              onChange={(e) =>
                setFolhaRosto((prev) => ({
                  ...prev,
                  validadeDias: Number(e.target.value) || 0,
                }))
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-700">
              Referência interna
            </label>
            <input
              type="text"
              className="w-full rounded border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-400"
              value={folhaRosto.referenciaInterna ?? ""}
              onChange={(e) =>
                setFolhaRosto((prev) => ({
                  ...prev,
                  referenciaInterna: e.target.value,
                }))
              }
              placeholder="Ex.: PROJ-2026-01"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-slate-700">
              Notas internas (opcional)
            </label>
            <input
              type="text"
              className="w-full rounded border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-400"
              value={folhaRosto.notas ?? ""}
              onChange={(e) =>
                setFolhaRosto((prev) => ({
                  ...prev,
                  notas: e.target.value,
                }))
              }
              placeholder="Notas internas sobre a proposta"
            />
          </div>
        </div>
      </section>

      {/* Linhas da proposta */}
      <section className="space-y-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Linhas da proposta
          </h2>
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
              onClick={handleAddLinhaLivre}
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
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {linhas.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
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
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] text-slate-800">
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
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-[11px] text-slate-800">
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
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-[11px] text-slate-800">
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
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] text-slate-800">
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
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] text-slate-800">
                      {formatCurrencyPt(linha.totalCustoLinha)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] text-slate-800">
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
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] text-slate-800">
                      {formatCurrencyPt(linha.totalVendaLinha)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] text-slate-800">
                      {(() => {
                        const margemValor =
                          linha.totalVendaLinha - linha.totalCustoLinha;
                        if (!Number.isFinite(margemValor)) {
                          return "—";
                        }
                        const hasVenda = linha.totalVendaLinha > 0;
                        const pct = hasVenda
                          ? (margemValor / linha.totalVendaLinha) * 100
                          : null;
                        return pct !== null
                          ? `${formatCurrencyPt(margemValor)} (${pct.toFixed(1)}%)`
                          : formatCurrencyPt(margemValor);
                      })()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right">
                      <button
                        type="button"
                        className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] text-slate-500 hover:bg-slate-50"
                        onClick={() => handleRemoverLinha(linha.id)}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Totais e ações */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="space-y-1 text-xs text-slate-600">
          <div>
            <span className="font-medium text-slate-700">
              Total custo:{" "}
            </span>
            <span className="text-sm font-semibold text-slate-900">
              {formatCurrencyPt(totais.totalCusto)}
            </span>
          </div>
          <div>
            <span className="font-medium text-slate-700">
              Total venda:{" "}
            </span>
            <span className="text-sm font-semibold text-slate-900">
              {formatCurrencyPt(totais.totalVenda)}
            </span>
          </div>
          <div>
            <span className="font-medium text-slate-700">Margem: </span>
            <span className="text-sm font-semibold text-slate-900">
              {formatCurrencyPt(totais.margemValor)}{" "}
              <span className="text-[11px] text-slate-500">
                ({totais.margemPercentagem.toFixed(1)}%)
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-700">Fator venda:</span>
            <input
              type="number"
              min={0}
              step="0.01"
              className="w-20 rounded border border-slate-200 px-2 py-1 text-right text-[11px] text-slate-800 outline-none focus:border-slate-400"
              value={fatorVenda}
              onChange={(e) => {
                const v = Number(e.target.value);
                setFatorVenda(Number.isFinite(v) && v > 0 ? v : 1.3);
              }}
            />
          </div>
          <p className="text-[11px] text-slate-500">
            Os totais de custo e venda são calculados automaticamente a partir
            das linhas; a margem é apenas informativa neste MVP.
          </p>
          {error && (
            <p className="text-[11px] text-red-600">
              {error}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleGuardar}
            disabled={isSaving}
            className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-500"
          >
            {isSaving ? "A gravar…" : "Guardar"}
          </button>
        </div>
      </section>
      <ImportarLinhasModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onInsert={handleInsertImportedLines}
      />
    </div>
  );
}

