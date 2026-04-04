"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type Artigo = {
  id: string;
  capitulo_num: number;
  capitulo_nome: string;
  subcapitulo: string | null;
  codigo: string;
  descricao: string;
  unidade: string;
  preco_custo: number;
  k_padrao: number;
  tipo_catalogo: string;
  categoria_cype: string | null;
  subcategoria_cype: string | null;
  seccao_cype: string | null;
};

type Chapter = { capitulo_num: number; capitulo_nome: string };

const LIMIT = 50;

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function CatalogoBrowsePage() {
  const [artigos, setArtigos]     = useState<Artigo[]>([]);
  const [chapters, setChapters]   = useState<Chapter[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(false);

  const [search, setSearch]       = useState("");
  const [capitulo, setCapitulo]   = useState<number | null>(null);
  const [tipo, setTipo]           = useState<"obra_nova" | "reabilitacao">("obra_nova");
  const [page, setPage]           = useState(1);

  const debouncedSearch = useDebounce(search, 350);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    const qs = new URLSearchParams({
      limit: String(LIMIT),
      page:  String(page),
      tipo,
    });
    if (debouncedSearch) qs.set("search", debouncedSearch);
    if (capitulo)        qs.set("capitulo", String(capitulo));

    try {
      const res  = await fetch(`/api/catalogo?${qs}`, { signal: ctrl.signal });
      const data = await res.json();
      setArtigos(data.rows ?? []);
      setTotal(data.total ?? 0);
      setChapters(data.chapters ?? []);
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") console.error(e);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, capitulo, tipo, page]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, capitulo, tipo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(total / LIMIT);
  const priceColor = (t: string) =>
    t === "obra_nova" ? "text-blue-600" : "text-emerald-600";

  return (
    <div className="flex h-full min-h-screen bg-slate-50">
      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Capítulos
          </h2>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          <button
            onClick={() => setCapitulo(null)}
            className={`w-full text-left px-4 py-2 text-sm transition-colors ${
              capitulo === null
                ? "bg-blue-50 text-blue-700 font-semibold"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            Todos os capítulos
          </button>
          {chapters.map((c) => (
            <button
              key={c.capitulo_num}
              onClick={() => setCapitulo(c.capitulo_num)}
              className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-start gap-2 ${
                capitulo === c.capitulo_num
                  ? "bg-blue-50 text-blue-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="shrink-0 w-6 text-right text-slate-400 font-mono text-xs pt-0.5">
                {c.capitulo_num}
              </span>
              <span className="leading-snug">{c.capitulo_nome}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Main ─────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <h1 className="text-xl font-bold text-slate-800">
                Catálogo Ennova
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {loading ? "A carregar…" : `${total.toLocaleString("pt-PT")} artigos`}
                {capitulo
                  ? ` · ${chapters.find((c) => c.capitulo_num === capitulo)?.capitulo_nome ?? ""}`
                  : ""}
              </p>
            </div>

            {/* Tipo toggle */}
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
              <button
                onClick={() => setTipo("obra_nova")}
                className={`px-4 py-2 font-medium transition-colors ${
                  tipo === "obra_nova"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Obra Nova
              </button>
              <button
                onClick={() => setTipo("reabilitacao")}
                className={`px-4 py-2 font-medium transition-colors ${
                  tipo === "reabilitacao"
                    ? "bg-emerald-600 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Reabilitação
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4"
                fill="none" stroke="currentColor" strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Pesquisar código ou descrição…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </header>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 sticky top-0 z-10">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-28">Código</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Descrição</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 w-16">Un.</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 w-28">Preço custo</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600 w-24">P. venda</th>
              </tr>
            </thead>
            <tbody>
              {loading && artigos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-slate-400">
                    A carregar…
                  </td>
                </tr>
              ) : artigos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-slate-400">
                    Nenhum artigo encontrado.
                  </td>
                </tr>
              ) : (
                artigos.map((a, i) => (
                  <tr
                    key={a.id}
                    className={`border-b border-slate-100 hover:bg-blue-50/50 transition-colors ${
                      i % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                    }`}
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">
                      {a.codigo}
                    </td>
                    <td className="px-4 py-2.5 text-slate-800 leading-snug">
                      {a.descricao}
                      {a.seccao_cype && (
                        <span className="ml-2 text-xs text-slate-400">
                          {a.seccao_cype}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">{a.unidade}</td>
                    <td className={`px-4 py-2.5 text-right font-medium tabular-nums ${priceColor(a.tipo_catalogo)}`}>
                      {a.preco_custo.toLocaleString("pt-PT", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} €
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-700 tabular-nums">
                      {(a.preco_custo * a.k_padrao).toLocaleString("pt-PT", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} €
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <footer className="bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between text-sm text-slate-500">
            <span>
              Página {page} de {totalPages} · {total.toLocaleString("pt-PT")} artigos
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors"
              >
                Próxima →
              </button>
            </div>
          </footer>
        )}
      </main>
    </div>
  );
}
