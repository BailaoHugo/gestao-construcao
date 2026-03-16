"use client";

import { useCallback, useEffect, useState, type JSX } from "react";
import {
  labelGrandeCapitulo,
  labelCapitulo,
} from "@/lib/catalogo/descricoesCapitulos";

type Artigo = {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string | null;
  grande_capitulo: string | null;
  capitulo: string | null;
  pu_custo: number | null;
  pu_venda: number | null;
  ativo: boolean;
};

type Opcoes = {
  grandeCapitulos: string[];
  capitulos: string[];
};

type GrandeCapituloOption = {
  codigo: string;
  descricao: string | null;
};

type CapituloOption = {
  codigo: string;
  descricao: string | null;
  grande_capitulo: string | null;
};

type CapitulosResponse = {
  grandes_capitulos: GrandeCapituloOption[];
  capitulos: CapituloOption[];
};

type NovoArtigoForm = {
  grande_capitulo: string;
  capitulo: string;
  codigo: string;
  descricao: string;
  unidade: string;
  pu_custo: string;
  pu_venda: string;
  ativo: boolean;
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
  const [isNovoArtigoOpen, setIsNovoArtigoOpen] = useState(false);
  const [capitulosAutorizados, setCapitulosAutorizados] = useState<
    CapituloOption[]
  >([]);
  const [grandesCapitulosAutorizados, setGrandesCapitulosAutorizados] =
    useState<GrandeCapituloOption[]>([]);
  const [loadingNovoArtigo, setLoadingNovoArtigo] = useState(false);
  const [novoArtigoError, setNovoArtigoError] = useState<string | null>(null);
  const [savingNovoArtigo, setSavingNovoArtigo] = useState(false);
  const [toggleAtivoId, setToggleAtivoId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingArtigoId, setEditingArtigoId] = useState<string | null>(null);

  const [novoArtigoForm, setNovoArtigoForm] = useState<NovoArtigoForm>({
    grande_capitulo: "",
    capitulo: "",
    codigo: "",
    descricao: "",
    unidade: "",
    pu_custo: "",
    pu_venda: "",
    ativo: true,
  });

  function resetNovoArtigoForm() {
    setNovoArtigoForm({
      grande_capitulo: "",
      capitulo: "",
      codigo: "",
      descricao: "",
      unidade: "",
      pu_custo: "",
      pu_venda: "",
      ativo: true,
    });
    setNovoArtigoError(null);
  }

  function validarNovoArtigoForm(): string | null {
    if (!novoArtigoForm.grande_capitulo)
      return "Selecione o grande capítulo";
    if (!novoArtigoForm.capitulo) return "Selecione o capítulo";
    if (!novoArtigoForm.codigo) return "Código por preencher";
    if (!novoArtigoForm.descricao.trim())
      return "Descrição é obrigatória";
    return null;
  }

  async function handleGuardarNovoArtigo() {
    setNovoArtigoError(null);
    const erroValidacao = validarNovoArtigoForm();
    if (erroValidacao) {
      setNovoArtigoError(erroValidacao);
      return;
    }

    try {
      setSavingNovoArtigo(true);
      const payload = {
        codigo: novoArtigoForm.codigo,
        descricao: novoArtigoForm.descricao.trim(),
        unidade: novoArtigoForm.unidade.trim() || null,
        grande_capitulo: novoArtigoForm.grande_capitulo,
        capitulo: novoArtigoForm.capitulo,
        pu_custo: novoArtigoForm.pu_custo.trim() || null,
        pu_venda: novoArtigoForm.pu_venda.trim() || null,
        ativo: novoArtigoForm.ativo,
      };

      const res = await fetch("/api/catalogo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(
          data?.error || "Falha ao criar artigo",
        );
      }

      setIsNovoArtigoOpen(false);
      resetNovoArtigoForm();
      await fetchCatalogo();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Falha ao criar artigo";
      setNovoArtigoError(message);
    } finally {
      setSavingNovoArtigo(false);
    }
  }

  async function handleToggleAtivo(artigo: Artigo) {
    try {
      setError(null);
      setToggleAtivoId(artigo.id);

      const res = await fetch(`/api/catalogo/${artigo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !artigo.ativo }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          (data as { error?: string })?.error ||
            "Falha ao atualizar estado do artigo",
        );
      }

      await fetchCatalogo();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setToggleAtivoId(null);
    }
  }

  function abrirModalNovoArtigo() {
    setIsEditMode(false);
    setEditingArtigoId(null);
    resetNovoArtigoForm();
    setIsNovoArtigoOpen(true);
  }

  function abrirModalEditarArtigo(artigo: Artigo) {
    setIsEditMode(true);
    setEditingArtigoId(artigo.id);
    setNovoArtigoError(null);
    setNovoArtigoForm({
      grande_capitulo: artigo.grande_capitulo ?? "",
      capitulo: artigo.capitulo ?? "",
      codigo: artigo.codigo,
      descricao: artigo.descricao,
      unidade: artigo.unidade ?? "",
      pu_custo:
        artigo.pu_custo != null && Number.isFinite(artigo.pu_custo)
          ? artigo.pu_custo.toString()
          : "",
      pu_venda:
        artigo.pu_venda != null && Number.isFinite(artigo.pu_venda)
          ? artigo.pu_venda.toString()
          : "",
      ativo: artigo.ativo,
    });
    setIsNovoArtigoOpen(true);
  }

  async function handleGuardarArtigoEditado() {
    if (!editingArtigoId) return;
    setNovoArtigoError(null);
    const erroValidacao = validarNovoArtigoForm();
    if (erroValidacao) {
      setNovoArtigoError(erroValidacao);
      return;
    }

    try {
      setSavingNovoArtigo(true);
      const payload = {
        descricao: novoArtigoForm.descricao.trim(),
        unidade: novoArtigoForm.unidade.trim() || null,
        grande_capitulo: novoArtigoForm.grande_capitulo || null,
        capitulo: novoArtigoForm.capitulo,
        pu_custo: novoArtigoForm.pu_custo.trim() || null,
        pu_venda: novoArtigoForm.pu_venda.trim() || null,
      };

      const res = await fetch(`/api/catalogo/${editingArtigoId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(
          data?.error || "Falha ao atualizar artigo",
        );
      }

      setIsNovoArtigoOpen(false);
      setIsEditMode(false);
      setEditingArtigoId(null);
      resetNovoArtigoForm();
      await fetchCatalogo();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Falha ao atualizar artigo";
      setNovoArtigoError(message);
    } finally {
      setSavingNovoArtigo(false);
    }
  }

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

  useEffect(() => {
    if (!isNovoArtigoOpen) return;
    const loadCapitulos = async () => {
      try {
        setLoadingNovoArtigo(true);
        setNovoArtigoError(null);
        const res = await fetch("/api/catalogo/capitulos");
        if (!res.ok) {
          throw new Error("Falha ao carregar capítulos autorizados");
        }
        const data = (await res.json()) as CapitulosResponse;
        setGrandesCapitulosAutorizados(data.grandes_capitulos ?? []);
        setCapitulosAutorizados(data.capitulos ?? []);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Falha ao carregar capítulos autorizados";
        setNovoArtigoError(message);
      } finally {
        setLoadingNovoArtigo(false);
      }
    };
    void loadCapitulos();
  }, [isNovoArtigoOpen]);

  useEffect(() => {
    if (!isNovoArtigoOpen) return;
    if (isEditMode) return;
    if (!novoArtigoForm.capitulo) return;
    const fetchCodigo = async () => {
      try {
        setLoadingNovoArtigo(true);
        setNovoArtigoError(null);
        const res = await fetch(
          `/api/catalogo/proximo-codigo?capitulo=${encodeURIComponent(
            novoArtigoForm.capitulo,
          )}`,
        );
        if (!res.ok) {
          throw new Error("Falha ao obter próximo código");
        }
        const data = (await res.json()) as { codigo?: string };
        if (data.codigo) {
          setNovoArtigoForm((prev) => ({
            ...prev,
            codigo: data.codigo as string,
          }));
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Falha ao obter próximo código";
        setNovoArtigoError(message);
      } finally {
        setLoadingNovoArtigo(false);
      }
    };
    void fetchCodigo();
  }, [isNovoArtigoOpen, isEditMode, novoArtigoForm.capitulo]);

  const capitulosFiltrados = capitulosAutorizados.filter((c) => {
    if (!novoArtigoForm.grande_capitulo) return true;
    if (c.grande_capitulo) {
      return c.grande_capitulo === novoArtigoForm.grande_capitulo;
    }
    return (c.codigo ?? "").startsWith(novoArtigoForm.grande_capitulo);
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Catálogo
          </h1>
          <p className="max-w-2xl text-sm text-slate-500">
            Base de dados de artigos, capítulos e códigos do sistema
          </p>
        </div>

        <button
          type="button"
          onClick={abrirModalNovoArtigo}
          className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Novo artigo
        </button>
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
                  {labelGrandeCapitulo(g)}
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
                  {labelCapitulo(c)}
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
                  <th className="px-3 py-2 font-medium text-right">PU Custo</th>
                  <th className="px-3 py-2 font-medium text-right">PU Venda</th>
                  <th className="px-3 py-2 font-medium">Ativo</th>
                  <th className="px-3 py-2 font-medium" />
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
                        {labelGrandeCapitulo(a.grande_capitulo)}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {labelCapitulo(a.capitulo)}
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
                      <td className="px-3 py-2 text-right text-slate-700">
                        {a.pu_custo != null ? a.pu_custo.toFixed(2) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700">
                        {a.pu_venda != null ? a.pu_venda.toFixed(2) : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              a.ativo
                                ? "text-emerald-600 font-medium"
                                : "text-slate-400"
                            }
                          >
                            {a.ativo ? "Sim" : "Não"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleAtivo(a)}
                            disabled={toggleAtivoId === a.id}
                            className="rounded-md border border-slate-200 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                          >
                            {toggleAtivoId === a.id
                              ? "A atualizar..."
                              : a.ativo
                                ? "Inativar"
                                : "Ativar"}
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => abrirModalEditarArtigo(a)}
                          className="rounded-md border border-slate-200 px-3 py-1 text-[11px] text-slate-700 hover:bg-slate-50"
                        >
                          Editar
                        </button>
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

      {isNovoArtigoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">
                {isEditMode ? "Editar artigo" : "Novo artigo"}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsNovoArtigoOpen(false);
                  setIsEditMode(false);
                  setEditingArtigoId(null);
                }}
                className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm text-slate-700">
              {novoArtigoError && (
                <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {novoArtigoError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500">
                    Grande capítulo
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    value={novoArtigoForm.grande_capitulo}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNovoArtigoForm((prev) => ({
                        ...prev,
                        grande_capitulo: value,
                        capitulo: "",
                        codigo: "",
                      }));
                    }}
                  >
                    <option value="">Selecionar...</option>
                    {grandesCapitulosAutorizados.map((gc) => (
                      <option key={gc.codigo} value={gc.codigo}>
                        {labelGrandeCapitulo(gc.codigo)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500">
                    Capítulo
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    value={novoArtigoForm.capitulo}
                    onChange={(e) =>
                      setNovoArtigoForm((prev) => ({
                        ...prev,
                        capitulo: e.target.value,
                      }))
                    }
                  >
                    <option value="">Selecionar...</option>
                    {capitulosFiltrados.map((c) => (
                      <option key={c.codigo} value={c.codigo}>
                        {labelCapitulo(c.codigo)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500">
                    Código
                  </label>
                  <input
                    type="text"
                    readOnly
                    className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                    value={novoArtigoForm.codigo}
                  />
                </div>

                <div className="space-y-1 md:col-span-1">
                  <label className="text-xs font-medium text-slate-500">
                    Unidade
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    value={novoArtigoForm.unidade}
                    onChange={(e) =>
                      setNovoArtigoForm((prev) => ({
                        ...prev,
                        unidade: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500">
                    PU custo
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    value={novoArtigoForm.pu_custo}
                    onChange={(e) =>
                      setNovoArtigoForm((prev) => ({
                        ...prev,
                        pu_custo: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-500">
                    PU venda
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    value={novoArtigoForm.pu_venda}
                    onChange={(e) =>
                      setNovoArtigoForm((prev) => ({
                        ...prev,
                        pu_venda: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium text-slate-500">
                    Descrição
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    value={novoArtigoForm.descricao}
                    onChange={(e) =>
                      setNovoArtigoForm((prev) => ({
                        ...prev,
                        descricao: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="flex items-center gap-2 md:col-span-2">
                  <input
                    id="novo-artigo-ativo"
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                    checked={novoArtigoForm.ativo}
                    onChange={(e) =>
                      setNovoArtigoForm((prev) => ({
                        ...prev,
                        ativo: e.target.checked,
                      }))
                    }
                  />
                  <label
                    htmlFor="novo-artigo-ativo"
                    className="text-xs font-medium text-slate-600"
                  >
                    Artigo ativo
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsNovoArtigoOpen(false);
                    setIsEditMode(false);
                    setEditingArtigoId(null);
                    setNovoArtigoError(null);
                  }}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={
                    isEditMode ? handleGuardarArtigoEditado : handleGuardarNovoArtigo
                  }
                  disabled={savingNovoArtigo || loadingNovoArtigo}
                  className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {savingNovoArtigo
                    ? "A guardar..."
                    : isEditMode
                      ? "Guardar alterações"
                      : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
