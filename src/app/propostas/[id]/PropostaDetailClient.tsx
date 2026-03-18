"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Proposta, PropostaLinha } from "@/propostas/domain";
import {
  formatCurrencyPt,
  formatEstadoLabel,
} from "@/propostas/format";
import LinhasEditor, {
  type CatalogoArtigo,
} from "@/components/propostas/LinhasEditor";
import type { ParsedImportedLine } from "@/lib/propostas/parseImportedLines";
import { MariaPanel } from "@/components/propostas/MariaPanel";

function computeTotal(linhas: PropostaLinha[]): number {
  return linhas.reduce((sum, l) => sum + l.totalVendaLinha, 0);
}

function computeTotalCusto(linhas: PropostaLinha[]): number {
  return linhas.reduce((sum, l) => sum + l.totalCustoLinha, 0);
}

function createEmptyLinha(): PropostaLinha {
  return {
    id: crypto.randomUUID(),
    artigoId: null,
    origem: "LIVRE",
    descricao: "",
    unidade: "",
    quantidade: 1,
    k: 1.3,
    precoCustoUnitario: 0,
    totalCustoLinha: 0,
    precoVendaUnitario: 0,
    totalVendaLinha: 0,
  };
}

export function PropostaDetailClient({ initial }: { initial: Proposta }) {
  const [proposta, setProposta] = useState<Proposta>(initial);
  const [revisaoAtivaId, setRevisaoAtivaId] = useState<string>(
    initial.revisaoAtual.id,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const revisaoAtiva = useMemo(() => {
    return (
      proposta.todasRevisoes.find((r) => r.id === revisaoAtivaId) ??
      proposta.revisaoAtual
    );
  }, [proposta, revisaoAtivaId]);

  const podeEditar = revisaoAtiva.estado === "RASCUNHO";

  const handleFolhaRostoChange = (
    patch: Partial<Proposta["revisaoAtual"]["folhaRosto"]>,
  ) => {
    if (!podeEditar) return;
    setProposta((prev) => {
      const revisoesAtualizadas = prev.todasRevisoes.map((rev) => {
        if (rev.id !== revisaoAtiva.id) return rev;
        return {
          ...rev,
          folhaRosto: {
            ...rev.folhaRosto,
            ...patch,
          },
        };
      });
      const revisaoAtualizada =
        revisoesAtualizadas.find((r) => r.id === prev.revisaoAtual.id) ??
        prev.revisaoAtual;
      return {
        ...prev,
        revisaoAtual: revisaoAtualizada,
        todasRevisoes: revisoesAtualizadas,
      };
    });
  };

  const handleLinhasChange = (novasLinhas: PropostaLinha[]) => {
    if (!podeEditar) return;
    setProposta((prev) => {
      const revisoesAtualizadas = prev.todasRevisoes.map((rev) => {
        if (rev.id !== revisaoAtiva.id) return rev;
        const totalVenda = computeTotal(novasLinhas);
        const totalCusto = computeTotalCusto(novasLinhas);
        const margemValor = totalVenda - totalCusto;
        const margemPercentagem =
          totalVenda > 0 ? (margemValor / totalVenda) * 100 : 0;
        return {
          ...rev,
          linhas: novasLinhas,
          totalCusto,
          totalVenda,
          margemValor,
          margemPercentagem,
        };
      });
      const revisaoAtualizada =
        revisoesAtualizadas.find((r) => r.id === prev.revisaoAtual.id) ??
        prev.revisaoAtual;
      return {
        ...prev,
        revisaoAtual: revisaoAtualizada,
        todasRevisoes: revisoesAtualizadas,
      };
    });
  };

  const handleAddLinhaLivre = () => {
    if (!podeEditar) return;
    handleLinhasChange([...revisaoAtiva.linhas, createEmptyLinha()]);
  };

  const handleRemoverLinha = (id: string) => {
    if (!podeEditar) return;
    handleLinhasChange(revisaoAtiva.linhas.filter((l) => l.id !== id));
  };

  const handleInsertImportedLines = (linhasImportadas: ParsedImportedLine[]) => {
    if (!podeEditar) return;
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
        k: 1.3,
        precoCustoUnitario,
        totalCustoLinha:
          l.total_custo_linha ?? quantidade * precoCustoUnitario,
        precoVendaUnitario,
        totalVendaLinha:
          l.total_venda_linha ?? quantidade * precoVendaUnitario,
      };
    });
    handleLinhasChange([...revisaoAtiva.linhas, ...novas]);
  };

  const handleAddLinhaFromCatalogo = (
    artigo: {
      id?: string | null;
      codigo: string;
      descricao: string;
      unidade: string | null;
      grande_capitulo?: string | null;
      capitulo: string | null;
      preco_custo_unitario: number | null;
      preco_venda_unitario: number | null;
    },
    quantidadeParam = 1,
  ) => {
    if (!podeEditar) return;
    const quantidade = Number.isFinite(quantidadeParam)
      ? quantidadeParam
      : 1;
    const precoCusto =
      artigo.preco_custo_unitario !== null
        ? artigo.preco_custo_unitario
        : 0;
    const precoVenda =
      artigo.preco_venda_unitario !== null
        ? artigo.preco_venda_unitario
        : 0;

    const novaLinha: PropostaLinha = {
      id: crypto.randomUUID(),
      artigoId: artigo.id ?? null,
      codigoArtigo: artigo.codigo,
      origem: "CATALOGO",
      descricao: artigo.descricao,
      unidade: artigo.unidade ?? "",
      grandeCapitulo: artigo.grande_capitulo ?? "",
      capitulo: artigo.capitulo ?? "",
      quantidade,
      k: 1.3,
      precoCustoUnitario: precoCusto,
      totalCustoLinha: quantidade * precoCusto,
      precoVendaUnitario: precoVenda,
      totalVendaLinha: quantidade * precoVenda,
    };

    handleLinhasChange([...revisaoAtiva.linhas, novaLinha]);
  };

  const handleSelectArtigo = (artigo: CatalogoArtigo) => {
    handleAddLinhaFromCatalogo(artigo, 1);
  };

  const handleCriarNovaRevisao = () => {
    // Futuro: criar nova revisão em Supabase
    // eslint-disable-next-line no-console
    console.log("Criar nova revisão (ainda não suportado nesta versão).");
  };

  const handleGuardarAlteracoes = async () => {
    if (!podeEditar) return;
    try {
      setIsSaving(true);
      setError(null);
      const res = await fetch(`/api/propostas/${proposta.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folhaRosto: revisaoAtiva.folhaRosto,
          linhas: revisaoAtiva.linhas,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(
          data?.error || "Falha ao atualizar proposta. Tente novamente.",
        );
      }
      const updated = (await res.json()) as Proposta;
      setProposta(updated);
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
            Proposta {proposta.codigo}
          </h1>
          <p className="text-sm text-slate-500">
            Revisão R{revisaoAtiva.numeroRevisao} ·{" "}
            <span className="font-medium">
              {formatEstadoLabel(revisaoAtiva.estado)}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/propostas/${proposta.id}/print`}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Imprimir / PDF
          </Link>
          <span
            className={`rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-white ${
              revisaoAtiva.estado === "EMITIDA"
                ? "bg-emerald-700"
                : "bg-slate-900"
            }`}
          >
            {formatEstadoLabel(revisaoAtiva.estado)}
          </span>
          {revisaoAtiva.estado === "EMITIDA" && (
            <button
              type="button"
              onClick={handleCriarNovaRevisao}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Criar nova revisão
            </button>
          )}
        </div>
      </header>

      {/* Selector de revisões */}
      <section className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-white p-3 shadow-sm text-[11px]">
        <span className="font-medium text-slate-700">Revisões:</span>
        {proposta.todasRevisoes.map((rev) => {
          const ativo = rev.id === revisaoAtiva.id;
          return (
            <button
              key={rev.id}
              type="button"
              onClick={() => setRevisaoAtivaId(rev.id)}
              className={`rounded-full border px-3 py-1 text-[11px] ${
                ativo
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              R{rev.numeroRevisao} · {formatEstadoLabel(rev.estado)}
            </button>
          );
        })}
      </section>

      {/* Folha de rosto */}
      <section className="space-y-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Folha de rosto</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 text-xs text-slate-700">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-700">
                Cliente
              </label>
              <input
                type="text"
                className="w-full rounded border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-400"
                value={revisaoAtiva.folhaRosto.clienteNome}
                onChange={(e) =>
                  handleFolhaRostoChange({ clienteNome: e.target.value })
                }
                disabled={!podeEditar}
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
                  value={revisaoAtiva.folhaRosto.clienteContacto ?? ""}
                  onChange={(e) =>
                    handleFolhaRostoChange({
                      clienteContacto: e.target.value,
                    })
                  }
                  disabled={!podeEditar}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full rounded border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-400"
                  value={revisaoAtiva.folhaRosto.clienteEmail ?? ""}
                  onChange={(e) =>
                    handleFolhaRostoChange({
                      clienteEmail: e.target.value,
                    })
                  }
                  disabled={!podeEditar}
                />
              </div>
            </div>
          </div>
          <div className="space-y-3 text-xs text-slate-700">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-700">
                Obra (opcional)
              </label>
              <input
                type="text"
                className="w-full rounded border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-400"
                value={revisaoAtiva.folhaRosto.obraNome ?? ""}
                onChange={(e) =>
                  handleFolhaRostoChange({
                    obraNome: e.target.value,
                  })
                }
                disabled={!podeEditar}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-700">
                Morada da obra (opcional)
              </label>
              <input
                type="text"
                className="w-full rounded border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-400"
                value={revisaoAtiva.folhaRosto.obraMorada ?? ""}
                onChange={(e) =>
                  handleFolhaRostoChange({
                    obraMorada: e.target.value,
                  })
                }
                disabled={!podeEditar}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-700">
                  Data proposta
                </label>
                <input
                  type="date"
                  className="w-full rounded border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-400"
                  value={revisaoAtiva.folhaRosto.dataProposta}
                  onChange={(e) =>
                    handleFolhaRostoChange({
                      dataProposta: e.target.value,
                    })
                  }
                  disabled={!podeEditar}
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
                  value={revisaoAtiva.folhaRosto.validadeDias ?? 0}
                  onChange={(e) =>
                    handleFolhaRostoChange({
                      validadeDias: Number(e.target.value) || 0,
                    })
                  }
                  disabled={!podeEditar}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Maria v1 — entre folha de rosto e linhas */}
      <MariaPanel
        podeEditar={podeEditar}
        onInsertArtigo={(artigo, quantidade) =>
          handleAddLinhaFromCatalogo(artigo, quantidade)
        }
      />

      {/* Linhas da proposta — mesmo editor que /propostas/nova */}
      <LinhasEditor
        linhas={revisaoAtiva.linhas}
        onLinhasChange={handleLinhasChange}
        podeEditar={podeEditar}
        fatorVenda={1.3}
        onAddLinhaLivre={handleAddLinhaLivre}
        onRemoveLinha={handleRemoverLinha}
        onInsertImportedLines={handleInsertImportedLines}
        onSelectArtigoCatalogo={handleSelectArtigo}
      />

      {/* Totais */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="space-y-1 text-xs text-slate-600">
          <div>
            <span className="font-medium text-slate-700">
              Total custo:{" "}
            </span>
            <span className="text-sm font-semibold text-slate-900">
              {formatCurrencyPt(revisaoAtiva.totalCusto)}
            </span>
          </div>
          <div>
            <span className="font-medium text-slate-700">
              Total venda:{" "}
            </span>
            <span className="text-sm font-semibold text-slate-900">
              {formatCurrencyPt(revisaoAtiva.totalVenda)}
            </span>
          </div>
          <div>
            <span className="font-medium text-slate-700">Margem: </span>
            <span className="text-sm font-semibold text-slate-900">
              {formatCurrencyPt(revisaoAtiva.margemValor)}{" "}
              <span className="text-[11px] text-slate-500">
                ({revisaoAtiva.margemPercentagem.toFixed(1)}%)
              </span>
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Estes valores são calculados a partir das linhas da revisão ativa.
          </p>
          {error && (
            <p className="text-[11px] text-red-600">
              {error}
            </p>
          )}
        </div>
        {podeEditar && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleGuardarAlteracoes}
              disabled={isSaving}
              className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-500"
            >
              {isSaving ? "A gravar alterações…" : "Guardar alterações"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

