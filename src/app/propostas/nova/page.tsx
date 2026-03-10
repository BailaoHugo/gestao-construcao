"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PropostaFolhaRosto, PropostaLinha } from "@/propostas/domain";

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
    precoUnitario: 0,
    totalLinha: 0,
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

  const total = useMemo(
    () => linhas.reduce((sum, l) => sum + l.totalLinha, 0),
    [linhas],
  );

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
        const preco = Number.isFinite(next.precoUnitario)
          ? next.precoUnitario
          : 0;
        next.totalLinha = quantidade * preco;
        return next;
      }),
    );
  };

  const handleRemoverLinha = (id: string) => {
    setLinhas((prev) => prev.filter((l) => l.id !== id));
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

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-PT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    });

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
            {/* TODO: pesquisa de catálogo com Supabase */}
            <input
              type="text"
              placeholder="Pesquisar artigo no catálogo (futuro)"
              className="w-56 rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-700 placeholder:text-slate-400"
              disabled
            />
            <button
              type="button"
              onClick={handleAddLinhaLivre}
              className="rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-slate-800"
            >
              Adicionar linha livre
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
                <th className="px-3 py-2 text-right">PU</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {linhas.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
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
                    <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] text-slate-800">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="w-24 rounded border border-slate-200 bg-white px-1 py-0.5 text-right text-[11px] outline-none focus:border-slate-400"
                        value={linha.precoUnitario}
                        onChange={(e) =>
                          handleLinhaChange(linha.id, {
                            precoUnitario: Number(e.target.value) || 0,
                          })
                        }
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] text-slate-800">
                      {formatCurrency(linha.totalLinha)}
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
            <span className="font-medium text-slate-700">Total proposta: </span>
            <span className="text-sm font-semibold text-slate-900">
              {formatCurrency(total)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Os totais são calculados automaticamente a partir das linhas.
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
    </div>
  );
}

