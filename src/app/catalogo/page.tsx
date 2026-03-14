"use client";

import { useCallback, useEffect, useState } from "react";

type Artigo = {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string | null;
  grande_capitulo: string | null;
  capitulo: string | null;
  ativo: boolean;
};

type Opcoes = {
  grandeCapitulos: string[];
  capitulos: string[];
};

export default function CatalogoPage() {
  const [artigos, setArtigos] = useState<Artigo[]>([]);
  const [opcoes, setOpcoes] = useState<Opcoes>({
    grandeCapitulos: [],
    capitulos: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [grandeCapitulo, setGrandeCapitulo] = useState("");
  const [capitulo, setCapitulo] = useState("");
  const [ativo, setAtivo] = useState<"todos" | "ativo" | "inativo">("ativo");

  const fetchCatalogo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (grandeCapitulo) params.set("grandeCapitulo", grandeCapitulo);
      if (capitulo) params.set("capitulo", capitulo);
      if (ativo === "ativo") params.set("ativo", "true");
      if (ativo === "inativo") params.set("ativo", "false");

      const res = await fetch(`/api/catalogo?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Falha ao carregar catálogo");
      }
      const data = await res.json();
      setArtigos(data.artigos ?? []);
      setOpcoes(data.opcoes ?? { grandeCapitulos: [], capitulos: [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setArtigos([]);
    } finally {
      setLoading(false);
    }
  }, [q, grandeCapitulo, capitulo, ativo]);

  useEffect(() => {
    fetchCatalogo();
  }, [fetchCatalogo]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Catálogo
        </h1>
        <p className="max-w-2xl text-sm text-slate-500">
          Base de dados de artigos, capítulos e códigos do sistema
        </p>
      </header>

      <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Pesquisa (código ou descrição)
            </label>
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ex.: código ou descrição"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Grande capítulo
            </label>
            <select
              value={grandeCapitulo}
              onChange={(e) => setGrandeCapitulo(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="">Todos</option>
              {opcoes.grandeCapitulos.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Capítulo
            </label>
            <select
              value={capitulo}
              onChange={(e) => setCapitulo(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="">Todos</option>
              {opcoes.capitulos.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Estado
            </label>
            <select
              value={ativo}
              onChange={(e) =>
                setAtivo(e.target.value as "todos" | "ativo" | "inativo")
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
              <option value="todos">Todos</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-8 text-center text-sm text-slate-500">
            A carregar…
          </div>
        ) : (
          <div className="overflow-auto rounded-lg border border-slate-100">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50">
                <tr className="text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2 font-medium">Grande Capítulo</th>
                  <th className="px-3 py-2 font-medium">Capítulo</th>
                  <th className="px-3 py-2 font-medium">Código</th>
                  <th className="px-3 py-2 font-medium">Descrição</th>
                  <th className="px-3 py-2 font-medium">Unidade</th>
                  <th className="px-3 py-2 font-medium">Ativo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {artigos.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-6 text-center text-slate-500"
                    >
                      Nenhum artigo encontrado.
                    </td>
                  </tr>
                ) : (
                  artigos.map((a) => (
                    <tr
                      key={a.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-3 py-2 text-slate-700">
                        {a.grande_capitulo ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {a.capitulo ?? "—"}
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-800">
                        {a.codigo}
                      </td>
                      <td className="px-3 py-2 text-slate-800 max-w-md truncate">
                        {a.descricao}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {a.unidade ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={
                            a.ativo
                              ? "text-emerald-600 font-medium"
                              : "text-slate-400"
                          }
                        >
                          {a.ativo ? "Sim" : "Não"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && artigos.length > 0 && (
          <div className="mt-3 text-xs text-slate-500">
            A mostrar {artigos.length} artigo{artigos.length !== 1 ? "s" : ""}.
          </div>
        )}
      </section>
    </div>
  );
}
