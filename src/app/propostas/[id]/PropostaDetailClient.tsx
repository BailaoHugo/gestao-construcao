"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Proposta, PropostaLinha } from "@/propostas/domain";
import {
  formatCurrencyPt,
  formatDatePt,
  formatEstadoLabel,
} from "@/propostas/format";

function computeTotal(linhas: PropostaLinha[]): number {
  return linhas.reduce((sum, l) => sum + l.totalVendaLinha, 0);
}

export function PropostaDetailClient({ initial }: { initial: Proposta }) {
  const [proposta, setProposta] = useState<Proposta>(initial);
  const [revisaoAtivaId, setRevisaoAtivaId] = useState<string>(
    initial.revisaoAtual.id,
  );

  const revisaoAtiva = useMemo(() => {
    return (
      proposta.todasRevisoes.find((r) => r.id === revisaoAtivaId) ??
      proposta.revisaoAtual
    );
  }, [proposta, revisaoAtivaId]);

  const podeEditar = revisaoAtiva.estado === "RASCUNHO";

  const handleLinhaChange = (id: string, patch: Partial<PropostaLinha>) => {
    if (!podeEditar) return;
    setProposta((prev) => {
      const revisoesAtualizadas = prev.todasRevisoes.map((rev) => {
        if (rev.id !== revisaoAtiva.id) return rev;
        const linhas = rev.linhas.map((linha) => {
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
        });
        const totalVenda = computeTotal(linhas);
        const totalCusto = linhas.reduce(
          (sum, l) => sum + l.totalCustoLinha,
          0,
        );
        const margemValor = totalVenda - totalCusto;
        const margemPercentagem =
          totalVenda > 0 ? (margemValor / totalVenda) * 100 : 0;
        return {
          ...rev,
          linhas,
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

  const handleCriarNovaRevisao = () => {
    // TODO: criar nova revisão em Supabase a partir da última EMITIDA
    // eslint-disable-next-line no-console
    console.log("Criar nova revisão (MVP, ainda sem persistência)");
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

      {/* Folha de rosto (read-only por enquanto) */}
      <section className="space-y-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Folha de rosto</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1 text-xs text-slate-700">
            <div>
              <span className="font-medium">Cliente: </span>
              <span>{revisaoAtiva.folhaRosto.clienteNome}</span>
            </div>
            {revisaoAtiva.folhaRosto.clienteEmail && (
              <div>
                <span className="font-medium">Email: </span>
                <span>{revisaoAtiva.folhaRosto.clienteEmail}</span>
              </div>
            )}
            {revisaoAtiva.folhaRosto.clienteContacto && (
              <div>
                <span className="font-medium">Contacto: </span>
                <span>{revisaoAtiva.folhaRosto.clienteContacto}</span>
              </div>
            )}
          </div>
          <div className="space-y-1 text-xs text-slate-700">
            {revisaoAtiva.folhaRosto.obraNome && (
              <div>
                <span className="font-medium">Obra: </span>
                <span>{revisaoAtiva.folhaRosto.obraNome}</span>
              </div>
            )}
            {revisaoAtiva.folhaRosto.obraMorada && (
              <div>
                <span className="font-medium">Morada: </span>
                <span>{revisaoAtiva.folhaRosto.obraMorada}</span>
              </div>
            )}
            <div>
              <span className="font-medium">Data proposta: </span>
              <span>{formatDatePt(revisaoAtiva.folhaRosto.dataProposta)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Linhas da proposta (edição só se rascunho, ainda sem guardar na BD) */}
      <section className="space-y-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Linhas da proposta
          </h2>
          {!podeEditar && (
            <p className="text-[11px] text-slate-500">
              Esta revisão está emitida e não pode ser editada diretamente.
            </p>
          )}
        </div>

        <div className="max-h-[28rem] overflow-auto rounded-lg border border-slate-100">
          <table className="min-w-full border-collapse text-left text-xs">
            <thead className="bg-slate-50">
              <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Descrição</th>
                <th className="px-3 py-2">Capítulo</th>
                <th className="px-3 py-2 text-right">Qtd.</th>
                <th className="px-3 py-2">Unid.</th>
                <th className="px-3 py-2 text-right">PU Custo</th>
                <th className="px-3 py-2 text-right">Total Custo</th>
                <th className="px-3 py-2 text-right">PU Venda</th>
                <th className="px-3 py-2 text-right">Total Venda</th>
                <th className="px-3 py-2 text-right">Margem</th>
              </tr>
            </thead>
            <tbody>
              {revisaoAtiva.linhas.map((linha) => (
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
                      />
                    ) : (
                      linha.descricao
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-[11px] text-slate-800">
                    {linha.capitulo && linha.capitulo.trim().length > 0
                      ? linha.capitulo
                      : "—"}
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
                      />
                    ) : (
                      linha.unidade
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Totais (ainda apenas em memória) */}
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
            Estes valores são calculados a partir das linhas; guardar alterações
            ainda não atualiza a base de dados neste MVP.
          </p>
        </div>
        {podeEditar && (
          <div className="flex flex-wrap items-center gap-2">
            {/* TODO: guardar alterações da revisão em Supabase */}
            <button
              type="button"
              className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-500"
            >
              Guardar alterações (em breve)
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

