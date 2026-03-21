"use client";

import { useState } from "react";
import type { CatalogoArtigo } from "./LinhasEditor";
import { interpretarMensagem } from "@/lib/maria/interpretarMensagem";
import type { MariaResultadoArtigo } from "@/lib/maria/types";
import { formatCurrencyPt } from "@/propostas/format";

type MariaPanelProps = {
  podeEditar: boolean;
  onInsertArtigo: (artigo: CatalogoArtigo, quantidade?: number) => void;
  /** Sem cartão próprio (ex.: dentro de CollapsibleSection) */
  embed?: boolean;
};

type HistoricoItem = {
  id: string;
  mensagem: string;
  intent: string;
  timestamp: string;
};

export function MariaPanel({
  podeEditar,
  onInsertArtigo,
  embed = false,
}: MariaPanelProps) {
  const [mensagem, setMensagem] = useState("");
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [resultados, setResultados] = useState<MariaResultadoArtigo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastIntent, setLastIntent] = useState<string | null>(null);
  const [quantidades, setQuantidades] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!podeEditar) return;
    const texto = mensagem.trim();
    if (!texto) return;

    const intent = interpretarMensagem(texto);

    setLastIntent(intent.intent);
    setHistorico((prev) => [
      {
        id: crypto.randomUUID(),
        mensagem: texto,
        intent: intent.intent,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
    setLoading(true);
    setError(null);

    try {
      if (intent.intent === "searchArtigos") {
        const res = await fetch(
          `/api/propostas/catalogo?q=${encodeURIComponent(
            intent.payload.q,
          )}`,
        );
        if (!res.ok) {
          throw new Error("Falha ao pesquisar artigos no catálogo");
        }
        const data = (await res.json()) as CatalogoArtigo[];
        const mapped: MariaResultadoArtigo[] = data.map((a) => ({
          id: a.id,
          codigo: a.codigo,
          descricao: a.descricao,
          unidade: a.unidade,
          grande_capitulo: a.grande_capitulo,
          capitulo: a.capitulo,
          preco_custo_unitario: a.preco_custo_unitario,
          preco_venda_unitario: a.preco_venda_unitario,
        }));
        setResultados(mapped);
      } else if (intent.intent === "getArtigoByCodigo") {
        const res = await fetch(
          `/api/catalogo/artigo?codigo=${encodeURIComponent(
            intent.payload.codigo,
          )}`,
        );
        if (!res.ok) {
          throw new Error("Artigo não encontrado");
        }
        const a = (await res.json()) as any;
        const mapped: MariaResultadoArtigo = {
          id: a.id,
          codigo: a.codigo,
          descricao: a.descricao,
          unidade: a.unidade ?? null,
          grande_capitulo: a.grande_capitulo ?? null,
          capitulo: a.capitulo ?? null,
          preco_custo_unitario: a.preco_custo_unitario ?? null,
          preco_venda_unitario: a.preco_venda_unitario ?? null,
        };
        setResultados([mapped]);
      } else if (intent.intent === "addLinhaFromCatalogo") {
        const res = await fetch(
          `/api/catalogo/artigo?codigo=${encodeURIComponent(
            intent.payload.codigoArtigo,
          )}`,
        );
        if (!res.ok) {
          throw new Error("Artigo não encontrado");
        }
        const a = (await res.json()) as any;
        const artigoCatalogo: CatalogoArtigo = {
          id: a.id,
          codigo: a.codigo,
          descricao: a.descricao,
          unidade: a.unidade ?? null,
          grande_capitulo: a.grande_capitulo ?? null,
          capitulo: a.capitulo ?? null,
          preco_custo_unitario: a.preco_custo_unitario ?? null,
          preco_venda_unitario: a.preco_venda_unitario ?? null,
          origem: a.origem ?? "CATALOGO",
        };
        onInsertArtigo(artigoCatalogo, intent.payload.quantidade);
        setResultados([]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setResultados([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInserirResultado = (artigo: MariaResultadoArtigo, quantidade: number) => {
    if (!podeEditar) return;
    const artigoCatalogo: CatalogoArtigo = {
      id: artigo.id ?? crypto.randomUUID(),
      codigo: artigo.codigo,
      descricao: artigo.descricao,
      unidade: artigo.unidade,
      grande_capitulo: artigo.grande_capitulo ?? null,
      capitulo: artigo.capitulo ?? null,
      preco_custo_unitario: artigo.preco_custo_unitario,
      preco_venda_unitario: artigo.preco_venda_unitario,
      origem: "CATALOGO",
    };
    onInsertArtigo(artigoCatalogo, quantidade || 1);
  };

  const Shell = embed ? "div" : "aside";
  const shellClass = embed
    ? "space-y-3 text-xs"
    : "space-y-3 rounded-xl border border-slate-100 bg-white p-4 text-xs shadow-sm";

  return (
    <Shell className={shellClass}>
      {!embed && (
        <header className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Maria Orcamentista (em formação)
            </h2>
            <p className="text-[11px] text-slate-500">
              Assistente local para pesquisar e inserir linhas do catálogo.
            </p>
          </div>
        </header>
      )}

      <form onSubmit={handleSubmit} className="space-y-2">
        <label className="block text-[11px] font-medium text-slate-700">
          Pedido
        </label>
        <input
          type="text"
          className="w-full rounded border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-400"
          placeholder="Ex.: adiciona E5.0002 com 14 m2"
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          disabled={!podeEditar || loading}
        />
        <button
          type="submit"
          disabled={!podeEditar || loading}
          className="w-full rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {loading ? "A interpretar…" : "Interpretar pedido"}
        </button>
      </form>

      {error && (
        <p className="text-[11px] text-red-600">
          {error}
        </p>
      )}

      {historico.length > 0 && (
        <section className="space-y-1">
          <h3 className="text-[11px] font-medium text-slate-700">
            Histórico recente
          </h3>
          <ul className="space-y-1">
            {historico.slice(0, 5).map((h) => (
              <li
                key={h.id}
                className="rounded border border-slate-100 bg-slate-50 px-2 py-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase text-slate-500">
                    {h.intent}
                  </span>
                  <span className="text-[9px] text-slate-400">
                    {new Date(h.timestamp).toLocaleTimeString("pt-PT", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-[11px] text-slate-800">{h.mensagem}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {resultados.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-[11px] font-medium text-slate-700">
            Resultados do catálogo
          </h3>
          <ul className="space-y-2 max-h-64 overflow-auto pr-1">
            {resultados.map((artigo) => {
              const keyId = `${artigo.codigo}-${artigo.id ?? "sem-id"}`;
              const quantidadeLocal = quantidades[keyId] ?? "1";
              const quantidadeNum =
                Number.parseFloat(quantidadeLocal.replace(",", ".")) || 1;
              return (
                <li
                  key={keyId}
                  className="space-y-1 rounded border border-slate-100 bg-slate-50 p-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-emerald-700">
                      {artigo.codigo}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {artigo.capitulo ?? "—"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-800">
                    {artigo.descricao}
                  </p>
                  <div className="text-[10px] text-slate-600">
                    <div>
                      <span className="font-medium">
                        {artigo.preco_venda_unitario != null
                          ? formatCurrencyPt(artigo.preco_venda_unitario)
                          : "—"}
                      </span>{" "}
                      <span className="text-slate-500">
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
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <input
                      type="text"
                      value={quantidadeLocal}
                      onChange={(e) =>
                        setQuantidades((prev) => ({
                          ...prev,
                          [keyId]: e.target.value,
                        }))
                      }
                      className="w-16 rounded border border-slate-200 px-2 py-1 text-[11px] text-slate-800 outline-none focus:border-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleInserirResultado(artigo, quantidadeNum)
                      }
                      className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-medium text-white hover:bg-emerald-500"
                    >
                      Inserir
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {lastIntent === "searchArtigos" && !loading && resultados.length === 0 && (
        <p className="text-[11px] text-slate-500">
          Sem resultados para este pedido.
        </p>
      )}
    </Shell>
  );
}

