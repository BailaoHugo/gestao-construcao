"use client";
import { useEffect, useState } from "react";
import type { CatalogoArtigo } from "./LinhasEditor";

type Chapter = { capitulo_num: number; capitulo_nome: string; total: number };
type TipoInfo = { tipo_catalogo: string; total: number };

const TIPO_LABELS: Record<string, string> = {
  reabilitacao: "Reabilitação",
  obra_nova:    "Obra Nova",
};

function labelTipo(t: string): string {
  return TIPO_LABELS[t] ?? t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function ChapterSection({
  chapter,
  tipo,
  podeEditar,
  onSelectArtigo,
}: {
  chapter: Chapter;
  tipo: string;
  podeEditar: boolean;
  onSelectArtigo: (a: CatalogoArtigo) => void;
}) {
  const [open, setOpen]       = useState(false);
  const [artigos, setArtigos] = useState<CatalogoArtigo[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded]   = useState(false);

  // Reset ao mudar tipo
  useEffect(() => {
    setOpen(false);
    setArtigos([]);
    setLoaded(false);
  }, [tipo]);

  async function load() {
    if (loaded) return;
    setLoading(true);
    try {
      const t = tipo ? `&tipo=${encodeURIComponent(tipo)}` : "";
      const r = await fetch(`/api/propostas/catalogo?capitulo_num=${chapter.capitulo_num}${t}`);
      const d = await r.json() as CatalogoArtigo[];
      setArtigos(Array.isArray(d) ? d : []);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    if (!open) load();
    setOpen(o => !o);
  }

  return (
    <div className="rounded-lg border border-slate-100 bg-white">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-left text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
      >
        <span>{chapter.capitulo_nome}</span>
        <span className="flex items-center gap-2 text-[10px] font-normal text-slate-400">
          <span>{chapter.total}</span>
          <span className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}>▼</span>
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-100 p-2 space-y-1">
          {loading && <p className="text-[10px] text-slate-400 px-1">A carregar…</p>}
          {!loading && artigos.length === 0 && loaded && (
            <p className="text-[10px] text-slate-400 px-1">Sem artigos neste capítulo.</p>
          )}
          {!loading && artigos.map(a => (
            <button
              key={a.id}
              type="button"
              disabled={!podeEditar}
              onClick={() => onSelectArtigo(a)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-left text-[11px] leading-snug hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              title={`${a.codigo} — ${a.descricao}`}
            >
              <span className="font-mono text-[10px] text-emerald-700">{a.codigo}</span>
              {" — "}
              <span className="break-words text-slate-800">{a.descricao}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CatalogoLateralPanel({
  podeEditar,
  onSelectArtigo,
  embed = false,
}: {
  podeEditar: boolean;
  onSelectArtigo: (artigo: CatalogoArtigo) => void;
  embed?: boolean;
}) {
  const [tipo, setTipo]             = useState("");
  const [chapters, setChapters]     = useState<Chapter[]>([]);
  const [tipos, setTipos]           = useState<TipoInfo[]>([]);
  const [loading, setLoading]       = useState(true);
  const [erro, setErro]             = useState<string | null>(null);

  // Pesquisa
  const [q, setQ]                   = useState("");
  const [searchResults, setSearch]  = useState<CatalogoArtigo[]>([]);
  const [searching, setSearching]   = useState(false);

  // Carrega capítulos (e tipos disponíveis na primeira chamada)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErro(null);
      try {
        const t = tipo ? `&tipo=${encodeURIComponent(tipo)}` : "";
        const r = await fetch(`/api/propostas/catalogo?chaptersOnly=1${t}`);
        const d = await r.json() as { chapters: Chapter[]; tiposDisponiveis?: TipoInfo[] };
        if (cancelled) return;
        setChapters(d.chapters ?? []);
        if (d.tiposDisponiveis) setTipos(d.tiposDisponiveis);
      } catch (e) {
        if (!cancelled) setErro(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [tipo]);

  // Pesquisa debounced
  useEffect(() => {
    const trimmed = q.trim();
    if (!trimmed) { setSearch([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const t = tipo ? `&tipo=${encodeURIComponent(tipo)}` : "";
        const r = await fetch(
          `/api/propostas/catalogo?q=${encodeURIComponent(trimmed)}&limit=100${t}`
        );
        const d = await r.json();
        setSearch(Array.isArray(d) ? d : []);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [q, tipo]);

  const Shell = embed ? "div" : "aside";
  const shellClass = embed
    ? "space-y-3 text-xs"
    : "space-y-3 rounded-xl border border-slate-100 bg-white p-4 text-xs shadow-sm";

  const totalArtigos = chapters.reduce((s, c) => s + c.total, 0);

  return (
    <Shell className={shellClass}>
      {!embed && (
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Catálogo</h2>
          <span className="text-[10px] text-slate-500">
            {loading ? "A carregar…" : `${totalArtigos} artigos`}
          </span>
        </div>
      )}

      {/* Filtro por tipo — só aparece se existirem múltiplos tipos */}
      {tipos.length > 1 && (
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setTipo("")}
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition ${
              tipo === ""
                ? "bg-slate-700 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Todos
          </button>
          {tipos.map(t => (
            <button
              key={t.tipo_catalogo}
              type="button"
              onClick={() => setTipo(t.tipo_catalogo)}
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition ${
                tipo === t.tipo_catalogo
                  ? "bg-slate-700 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {labelTipo(t.tipo_catalogo)}
            </button>
          ))}
        </div>
      )}

      <input
        type="text"
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Filtrar (código ou descrição)"
        disabled={!podeEditar}
        className="w-full rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-700 outline-none focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-500"
      />

      {erro && <p className="text-[11px] text-red-600">{erro}</p>}

      <div className="max-h-[28rem] space-y-1.5 overflow-auto pr-1">
        {/* Resultados de pesquisa */}
        {q.trim() ? (
          searching ? (
            <p className="text-[10px] text-slate-400">A pesquisar…</p>
          ) : searchResults.length === 0 ? (
            <p className="text-[10px] text-slate-400">Sem resultados.</p>
          ) : (
            searchResults.map(a => (
              <button
                key={a.id}
                type="button"
                disabled={!podeEditar}
                onClick={() => onSelectArtigo(a)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-left text-[11px] leading-snug hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="font-mono text-[10px] text-emerald-700">{a.codigo}</span>
                {" — "}
                <span className="break-words text-slate-800">{a.descricao}</span>
              </button>
            ))
          )
        ) : (
          /* Capítulos com lazy-load */
          loading ? (
            <p className="text-[10px] text-slate-400">A carregar capítulos…</p>
          ) : chapters.length === 0 ? (
            <p className="text-[10px] text-slate-400">Sem capítulos para este tipo.</p>
          ) : (
            chapters.map(c => (
              <ChapterSection
                key={`${c.capitulo_num}-${tipo}`}
                chapter={c}
                tipo={tipo}
                podeEditar={podeEditar}
                onSelectArtigo={onSelectArtigo}
              />
            ))
          )
        )}
      </div>
    </Shell>
  );
}
