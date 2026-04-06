"use client";
import { useEffect, useState } from "react";
import type { CatalogoArtigo } from "./LinhasEditor";

type Chapter = { capitulo_num: number; capitulo_nome: string; total: number };
type TipoFiltro = "" | "reabilitacao" | "nova_construcao";

/** Capítulo expandido com lazy-load dos seus artigos */
function ChapterSection({
  chapter,
  tipo,
  podeEditar,
  onSelectArtigo,
}: {
  chapter: Chapter;
  tipo: TipoFiltro;
  podeEditar: boolean;
  onSelectArtigo: (a: CatalogoArtigo) => void;
}) {
  const [open, setOpen]       = useState(false);
  const [artigos, setArtigos] = useState<CatalogoArtigo[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded]   = useState(false);

  async function load() {
    if (loaded) return;
    setLoading(true);
    try {
      const t = tipo ? `&tipo=${tipo}` : "";
      const r = await fetch(
        `/api/propostas/catalogo?capitulo_num=${chapter.capitulo_num}${t}`
      );
      const d = await r.json() as CatalogoArtigo[];
      setArtigos(d);
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
          {chapter.total}
          <span className={`transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-100 p-2 space-y-1">
          {loading && (
            <p className="text-[10px] text-slate-400 px-1">A carregar…</p>
          )}
          {!loading && artigos.map(a => (
            <button
              key={a.id}
              type="button"
              disabled={!podeEditar}
              onClick={() => onSelectArtigo(a)}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-left text-[11px] leading-snug text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              title={`${a.codigo} — ${a.descricao}`}
            >
              <span className="font-mono text-[10px] text-emerald-700">{a.codigo}</span>
              {" — "}
              <span className="break-words">{a.descricao}</span>
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
  const [tipo, setTipo]             = useState<TipoFiltro>("");
  const [q, setQ]                   = useState("");
  const [chapters, setChapters]     = useState<Chapter[]>([]);
  const [searchResults, setSearch]  = useState<CatalogoArtigo[] | null>(null);
  const [loading, setLoading]       = useState(false);
  const [erro, setErro]             = useState<string | null>(null);

  // Carrega capítulos ao mudar tipo
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErro(null);
    setSearch(null);
    const t = tipo ? `?tipo=${tipo}` : "?chaptersOnly=1";
    const url = tipo
      ? `/api/propostas/catalogo?chaptersOnly=1&tipo=${tipo}`
      : `/api/propostas/catalogo?chaptersOnly=1`;
    fetch(url)
      .then(r => r.json())
      .then((d: { chapters: Chapter[] }) => {
        if (cancelled) return;
        setChapters(d.chapters ?? []);
      })
      .catch(e => { if (!cancelled) setErro(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tipo]);

  // Pesquisa com debounce
  useEffect(() => {
    if (!q.trim()) { setSearch(null); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const t = tipo ? `&tipo=${tipo}` : "";
        const r = await fetch(
          `/api/propostas/catalogo?q=${encodeURIComponent(q)}&limit=100${t}`
        );
        const d = await r.json() as CatalogoArtigo[];
        setSearch(d);
      } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [q, tipo]);

  const Shell = embed ? "div" : "aside";
  const cls   = embed
    ? "space-y-3 text-xs"
    : "space-y-3 rounded-xl border border-slate-100 bg-white p-4 text-xs shadow-sm";

  return (
    <Shell className={cls}>
      {/* Filtro de tipo */}
      <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 text-[10px] font-medium">
        {(["", "reabilitacao", "nova_construcao"] as TipoFiltro[]).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTipo(t)}
            className={`flex-1 rounded-md px-2 py-1 transition ${
              tipo === t
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "" ? "Todos" : t === "reabilitacao" ? "Reabilitação" : "Obra Nova"}
          </button>
        ))}
      </div>

      {/* Pesquisa */}
      <input
        type="text"
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Filtrar por código ou descrição…"
        disabled={!podeEditar}
        className="w-full rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-700 outline-none focus:border-slate-400 disabled:bg-slate-50"
      />

      {erro && <p className="text-[11px] text-red-600">{erro}</p>}

      {loading && !searchResults && (
        <p className="text-[10px] text-slate-400">A carregar…</p>
      )}

      <div className="max-h-[32rem] space-y-1.5 overflow-auto pr-1">
        {/* Resultados de pesquisa */}
        {searchResults !== null ? (
          searchResults.length === 0 ? (
            <p className="text-[11px] text-slate-500">Sem resultados.</p>
          ) : (
            searchResults.map(a => (
              <button
                key={a.id}
                type="button"
                disabled={!podeEditar}
                onClick={() => onSelectArtigo(a)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-left text-[11px] leading-snug text-slate-800 hover:bg-slate-50"
                title={`${a.codigo} — ${a.descricao}`}
              >
                <div className="font-mono text-[10px] text-emerald-700">{a.codigo}</div>
                <div className="text-slate-500 text-[10px]">{a.capitulo}</div>
                <div>{a.descricao}</div>
              </button>
            ))
          )
        ) : (
          /* Vista por capítulos */
          chapters.map(ch => (
            <ChapterSection
              key={ch.capitulo_num}
              chapter={ch}
              tipo={tipo}
              podeEditar={podeEditar}
              onSelectArtigo={onSelectArtigo}
            />
          ))
        )}
      </div>
    </Shell>
  );
}
