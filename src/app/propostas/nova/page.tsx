"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PropostaFolhaRosto, PropostaLinha } from "@/propostas/domain";
import { formatCurrencyPt } from "@/propostas/format";
import LinhasEditor, {
  type CatalogoArtigo,
} from "@/components/propostas/LinhasEditor";
import type { ParsedImportedLine } from "@/lib/propostas/parseImportedLines";
import { MariaPanel } from "@/components/propostas/MariaPanel";

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
    k: 1.3,
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
  const errorBannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error && errorBannerRef.current) {
      errorBannerRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [error]);

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
        k: 1.3,
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

    setLinhas((prev) => [...prev, novaLinha]);
  };

  const handleSelectArtigo = (artigo: CatalogoArtigo) => {
    handleAddLinhaFromCatalogo(artigo, 1);
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

      {error && (
        <div
          ref={errorBannerRef}
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm"
        >
          <p className="font-medium">Não foi possível gravar</p>
          <p className="mt-1 text-red-700">{error}</p>
          <p className="mt-2 text-[11px] text-red-600/90">
            Se aparecer erro de coluna ou permissão, confirma no Supabase que as
            migrations estão aplicadas e que{" "}
            <code className="rounded bg-red-100 px-1">DATABASE_URL</code> no{" "}
            <code className="rounded bg-red-100 px-1">.env.local</code> está
            correto.
          </p>
        </div>
      )}

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

      {/* Maria v1 — entre folha de rosto e linhas */}
      <MariaPanel
        podeEditar={true}
        onInsertArtigo={(artigo, quantidade) =>
          handleAddLinhaFromCatalogo(artigo, quantidade)
        }
      />

      {/* Linhas da proposta — componente partilhado com /propostas/[id] */}
      <LinhasEditor
        linhas={linhas}
        onLinhasChange={setLinhas}
        podeEditar={true}
        fatorVenda={fatorVenda}
        onAddLinhaLivre={handleAddLinhaLivre}
        onRemoveLinha={handleRemoverLinha}
        onInsertImportedLines={handleInsertImportedLines}
        onSelectArtigoCatalogo={handleSelectArtigo}
      />

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
    </div>
  );
}

