"use client";

import { useEffect, useMemo, useState } from "react";
import type { CatalogoArtigo } from "./LinhasEditor";
import { labelCapitulo, labelGrandeCapitulo } from "@/lib/propostas/catalogoLabels";
import { compareChaveCapitulo } from "@/lib/propostas/ordenarCodigoCapitulo";

type GrupoCapitulos = {
  grande: string | null;
  capitulos: Map<string, CatalogoArtigo[]>;
};

function normalize(v: string | null | undefined): string | null {
  const t = (v ?? "").trim();
  return t ? t : null;
}

export function CatalogoLateralPanel({
  podeEditar,
  onSelectArtigo,
  embed = false,
}: {
  podeEditar: boolean;
  onSelectArtigo: (artigo: CatalogoArtigo) => void;
  /** Sem cartão / título próprio (ex.: dentro de CollapsibleSection) */
  embed?: boolean;
}) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [resultados, setResultados] = useState<CatalogoArtigo[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setErro(null);
        const trimmed = q.trim();
        // Sem filtro: queremos mostrar o catálogo inteiro (até ao limite do endpoint).
        // Com filtro: mantemos resposta mais leve.
        const limit = trimmed.length ? 50 : 2000;
        const url = trimmed
          ? `/api/propostas/catalogo?q=${encodeURIComponent(trimmed)}&limit=${limit}`
          : `/api/propostas/catalogo?limit=${limit}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Falha ao carregar catálogo");
        const data = (await res.json()) as CatalogoArtigo[];
        if (cancelled) return;
        setResultados(data);
      } catch (e) {
        if (cancelled) return;
        setResultados([]);
        setErro(e instanceof Error ? e.message : String(e));
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [q]);

  const grupos: GrupoCapitulos[] = useMemo(() => {
    const grandes = new Map<string | null, GrupoCapitulos>();
    for (const a of resultados) {
      const grande = normalize(a.grande_capitulo);
      const cap = normalize(a.capitulo);
      const gKey = grande ?? "__NULL__";
      const capKey = cap ?? "__NULL__";

      const g = grandes.get(gKey) ?? {
        grande,
        capitulos: new Map<string, CatalogoArtigo[]>(),
      };

      const list = g.capitulos.get(capKey) ?? [];
      list.push(a);
      g.capitulos.set(capKey, list);

      grandes.set(gKey, g);
    }

    // Ordenação estável por nome (o backend já ordena por grande/cap/código).
    return Array.from(grandes.values()).map((g) => ({
      ...g,
      capitulos: new Map(
        Array.from(g.capitulos.entries()).sort(([a], [b]) =>
          compareChaveCapitulo(a, b),
        ),
      ),
    }));
  }, [resultados]);

  const Shell = embed ? "div" : "aside";
  const shellClass = embed
    ? "space-y-3 text-xs"
    : "space-y-3 rounded-xl border border-slate-100 bg-white p-4 text-xs shadow-sm";

  return (
    <Shell className={shellClass}>
      {!embed && (
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Catálogo</h2>
          {loading ? (
            <span className="text-[10px] text-slate-500">A carregar…</span>
          ) : (
            <span className="text-[10px] text-slate-500">
              {resultados.length} itens
            </span>
          )}
        </div>
      )}

      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filtrar (código ou descrição)"
        disabled={!podeEditar}
        className="w-full rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-700 outline-none focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-500"
      />

      {erro && <p className="text-[11px] text-red-600">{erro}</p>}

      <div className="max-h-[28rem] space-y-2 overflow-auto pr-1">
        {grupos.length === 0 ? (
          <p className="text-[11px] text-slate-500">
            Sem resultados. Usa o filtro acima.
          </p>
        ) : (
          grupos.map((g) => (
            <details
              key={g.grande ?? "__NULL__"}
              className="group rounded-lg border border-slate-100 bg-white"
            >
              <summary className="list-none cursor-pointer select-none rounded-lg bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700 hover:bg-slate-100 [&::-webkit-details-marker]:hidden">
                <span className="inline-flex w-full items-center justify-between gap-2">
                  <span>{labelGrandeCapitulo(g.grande)}</span>
                  <span
                    aria-hidden
                    className="text-[10px] font-normal text-slate-400 transition group-open:rotate-180"
                  >
                    ▼
                  </span>
                </span>
              </summary>

              <div className="mt-1 space-y-1 border-t border-slate-100 p-2 pl-2">
                {Array.from(g.capitulos.entries()).map(([capKey, arts]) => {
                  const cap = capKey === "__NULL__" ? null : capKey;
                  return (
                    <details
                      key={capKey}
                      className="group/cap rounded-md border border-slate-100 bg-slate-50/80"
                    >
                      <summary className="list-none cursor-pointer select-none px-2 py-1.5 text-left text-[11px] font-medium leading-snug text-slate-600 hover:bg-slate-100 [&::-webkit-details-marker]:hidden">
                        <span className="inline-flex w-full items-center justify-between gap-2">
                          <span>
                            {labelCapitulo(cap)}{" "}
                            <span className="font-normal text-slate-400">
                              ({arts.length})
                            </span>
                          </span>
                          <span
                            aria-hidden
                            className="text-[9px] text-slate-400 transition group-open/cap:rotate-180"
                          >
                            ▼
                          </span>
                        </span>
                      </summary>
                      <div className="space-y-1 border-t border-slate-100 bg-white px-1 py-2">
                        {arts.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            disabled={!podeEditar}
                            onClick={() => onSelectArtigo(a)}
                            className="w-full truncate rounded-lg border border-slate-200 bg-white px-2 py-1 text-left text-[11px] text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            title={`${a.codigo} - ${a.descricao}`}
                          >
                            <span className="font-mono text-[10px] text-emerald-700">
                              {a.codigo}
                            </span>
                            {" — "}
                            <span className="truncate">{a.descricao}</span>
                          </button>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            </details>
          ))
        )}
      </div>
    </Shell>
  );
}

