"use client";
import { useMemo, useState } from "react";
import type { Proposta, PropostaLinha } from "@/propostas/domain";
import {
  formatCurrencyPt,
  formatEstadoLabel,
} from "@/propostas/format";
import LinhasEditor, {
  type CatalogoArtigo,
} from "@/components/propostas/LinhasEditor";
import type { ImportLinhaDraft } from "@/lib/propostas/parseImportedLines";
import { importDraftToPropostaLinha } from "@/lib/propostas/importedLineToPropostaLinha";
import { MariaPanel } from "@/components/propostas/MariaPanel";
import { CatalogoLateralPanel } from "@/components/propostas/CatalogoLateralPanel";
import { CollapsibleSection } from "@/components/propostas/CollapsibleSection";
import { ResumoCapitulosPanel } from "@/components/propostas/ResumoCapitulosPanel";

function computeTotal(linhas: PropostaLinha[]): number {
  return linhas.reduce((sum, l) => sum + l.totalVendaLinha, 0);
}
function computeTotalCusto(linhas: PropostaLinha[]): number {
  return linhas.reduce((sum, l) => sum + l.totalCustoLinha, 0);
}
type CatalogoLinhasLayout = "split" | "catalogoFull" | "linhasFull";

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
  const [fatorVenda, setFatorVenda] = useState(1.3);
  const [catalogoLinhasLayout, setCatalogoLinhasLayout] =
    useState<CatalogoLinhasLayout>("split");

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

  const handleInsertImportedLines = (linhasImportadas: ImportLinhaDraft[]) => {
    if (!podeEditar) return;
    const novas = linhasImportadas.map(importDraftToPropostaLinha);
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
    const quantidade = Number.isFinite(quantidadeParam) ? quantidadeParam : 1;
    const precoCusto =
      artigo.preco_custo_unitario !== null ? artigo.preco_custo_unitario : 0;
    const precoVenda =
      artigo.preco_venda_unitario !== null ? artigo.preco_venda_unitario : 0;
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

  const handleGerarContrato = async () => {
    try {
      setIsSaving(true);
      setError(null);
      const res = await fetch("/api/contratos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propostaId: proposta.id, revisaoId: revisaoAtivaId }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Falha ao criar contrato");
      window.location.href = `/contratos/${data.id}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmitirProposta = async () => {
    try {
      setIsSaving(true);
      setError(null);
      const res = await fetch(`/api/propostas/${proposta.id}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "EMITIDA" }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Falha ao emitir proposta.");
      }
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleAprovarProposta = async () => {
    try {
      setIsSaving(true);
      setError(null);
      const res = await fetch(`/api/propostas/${proposta.id}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "APROVADA" }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Falha ao aprovar proposta.");
      }
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
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
        {podeEditar ? (
          <>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                Nova proposta
              </h1>
              <p className="max-w-2xl text-sm text-slate-500">
                Preencha a folha de rosto e as linhas da proposta. Ao gravar, os dados são guardados na base de dados (Supabase).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleEmitirProposta()}
                disabled={isSaving}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-900 shadow-sm transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "A guardar…" : "Emitir proposta"}
              </button>
              <a
                href={`/api/propostas/${proposta.id}/pdf?revisaoId=${revisaoAtivaId}`}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Exportar PDF
              </a>
              <span className="rounded-full bg-slate-900 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-white">
                Rascunho
              </span>
            </div>
          </>
        ) : (
          <>
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
              <a
                href={`/api/propostas/${proposta.id}/pdf?revisaoId=${revisaoAtivaId}`}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Exportar PDF
              </a>
              {revisaoAtiva.estado === "EMITIDA" && (
                <button
                  type="button"
                  onClick={() => void handleAprovarProposta()}
                  disabled={isSaving}
                  className="rounded-full bg-amber-500 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-amber-400 disabled:opacity-60"
                >
                  Marcar Aprovada
                </button>
              )}
              {(revisaoAtiva.estado === "EMITIDA" ||
                revisaoAtiva.estado === "APROVADA") && (
                <button
                  type="button"
                  onClick={() => void handleGerarContrato()}
                  disabled={isSaving}
                  className="rounded-full bg-sky-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-sky-500 disabled:opacity-60"
                >
                  Gerar Contrato
                </button>
              )}
              <span
                className={`rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-white ${
                  revisaoAtiva.estado === "APROVADA"
                    ? "bg-sky-700"
                    : revisaoAtiva.estado === "EMITIDA"
                    ? "bg-emerald-700"
                    : "bg-slate-900"
                }`}
              >
                {formatEstadoLabel(revisaoAtiva.estado)}
              </span>
              {(revisaoAtiva.estado === "EMITIDA" ||
                revisaoAtiva.estado === "APROVADA") && (
                <button
                  type="button"
                  onClick={handleCriarNovaRevisao}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Criar nova revisão
                </button>
              )}
            </div>
          </>
        )}
      </header>

      {/* Selector de revisões */}
      {!podeEditar && (
        <section className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-white p-3 shadow-sm text-[11px]">
          <span className="font-medium text-slate-700">Revisões:</span>
          {(() => {
            const ultimaNaoRascunho = proposta.todasRevisoes
              .filter((r) => r.estado !== "RASCUNHO")
              .sort((a, b) => b.numeroRevisao - a.numeroRevisao)[0];
            return proposta.todasRevisoes.map((rev) => {
              const ativo = rev.id === revisaoAtiva.id;
              const ehAtiva = ultimaNaoRascunho
                ? rev.id === ultimaNaoRascunho.id
                : false;
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
                  {ehAtiva ? " ✓" : ""}
                </button>
              );
            });
          })()}
        </section>
      )}

      <CollapsibleSection title="Folha de rosto">
        <div className="space-y-3">
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
                    handleFolhaRostoChange({ obraNome: e.target.value })
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
                    handleFolhaRostoChange({ obraMorada: e.target.value })
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
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Maria Orcamentista (em formação)"
        subtitle="Assistente local para pesquisar e inserir linhas do catálogo."
      >
        <MariaPanel
          embed
          podeEditar={podeEditar}
          onInsertArtigo={(artigo, quantidade) =>
            handleAddLinhaFromCatalogo(artigo, quantidade)
          }
        />
      </CollapsibleSection>

      <div
        className={
          catalogoLinhasLayout === "split"
            ? "flex flex-col gap-6 md:flex-row md:items-start"
            : "flex flex-col gap-6"
        }
      >
        <div
          className={
            catalogoLinhasLayout === "split"
              ? "w-full shrink-0 md:w-[min(380px,100%)] md:max-w-[380px]"
              : catalogoLinhasLayout === "linhasFull"
              ? "order-2 w-full"
              : "order-1 w-full"
          }
        >
          <CollapsibleSection
            title="Catálogo"
            headerActions={
              <button
                type="button"
                onClick={() =>
                  setCatalogoLinhasLayout((prev) =>
                    prev === "catalogoFull" ? "split" : "catalogoFull",
                  )
                }
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                {catalogoLinhasLayout === "catalogoFull"
                  ? "Vista dividida"
                  : "Largura total"}
              </button>
            }
          >
            <CatalogoLateralPanel
              embed
              podeEditar={podeEditar}
              onSelectArtigo={handleSelectArtigo}
            />
          </CollapsibleSection>
        </div>
        <div
          className={
            catalogoLinhasLayout === "split"
              ? "min-w-0 flex-1"
              : catalogoLinhasLayout === "linhasFull"
              ? "order-1 w-full"
              : "order-2 w-full"
          }
        >
          <CollapsibleSection
            title="Linhas da proposta"
            headerActions={
              <button
                type="button"
                onClick={() =>
                  setCatalogoLinhasLayout((prev) =>
                    prev === "linhasFull" ? "split" : "linhasFull",
                  )
                }
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                {catalogoLinhasLayout === "linhasFull"
                  ? "Vista dividida"
                  : "Largura total"}
              </button>
            }
          >
            <LinhasEditor
              embed
              linhas={revisaoAtiva.linhas}
              onLinhasChange={handleLinhasChange}
              podeEditar={podeEditar}
              fatorVenda={fatorVenda}
              onAddLinhaLivre={handleAddLinhaLivre}
              onRemoveLinha={handleRemoverLinha}
              onInsertImportedLines={handleInsertImportedLines}
              onSelectArtigoCatalogo={handleSelectArtigo}
            />
          </CollapsibleSection>
        </div>
      </div>

      <ResumoCapitulosPanel linhas={revisaoAtiva.linhas} />

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
          {podeEditar && (
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
          )}
          <p className="text-[11px] text-slate-500">
            {podeEditar
              ? "Os totais de custo e venda são calculados automaticamente a partir das linhas; a margem é apenas informativa neste MVP."
              : "Estes valores são calculados a partir das linhas da revisão ativa."}
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
              {isSaving ? "A gravar…" : "Guardar"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
