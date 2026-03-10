 "use client";

import { useMemo, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { TopBar } from "@/components/layout/TopBar";
// JSON gerado a partir do Excel em data/orcamentos/processed
// eslint-disable-next-line @typescript-eslint/no-var-requires
const artigos = require("../../../../data/orcamentos/processed/artigos_master.json") as Array<{
  code: string;
  description: string;
  unit: string;
  grandeCapituloCode: string;
  capituloCode: string;
  subgrupo: string;
  disciplina: string;
  categoriaCusto: string;
  tipoMedicao: string;
  incluiMO: boolean;
  puCusto?: number;
  puVendaFixo?: number;
  flags?: {
    nova?: boolean;
    reabilitacao?: boolean;
    habitacao?: boolean;
    comercio?: boolean;
  };
  ativo?: boolean;
}>;

export default function BaseDeDadosPage() {
  const [filterGc, setFilterGc] = useState<string>("");
  const [filterCap, setFilterCap] = useState<string>("");
  const [filterText, setFilterText] = useState<string>("");

  const todosGc = useMemo(
    () =>
      Array.from(
        new Set(artigos.map((a: { grandeCapituloCode: string }) => a.grandeCapituloCode)),
      ).sort(),
    [],
  );

  const todosCap = useMemo(
    () =>
      Array.from(
        new Set(
          artigos.map(
            (a: { grandeCapituloCode: string; capituloCode: string }) =>
              `${a.grandeCapituloCode}|${a.capituloCode}`,
          ),
        ),
      )
        .map((key) => {
          const [gc, cap] = key.split("|");
          return { gc, cap };
        })
        .sort((a, b) => `${a.gc}${a.cap}`.localeCompare(`${b.gc}${b.cap}`)),
    [],
  );

  const filteredArtigos = useMemo(() => {
    const text = filterText.trim().toLowerCase();
    return artigos.filter((a: (typeof artigos)[number]) => {
      if (filterGc && a.grandeCapituloCode !== filterGc) return false;
      if (filterCap && a.capituloCode !== filterCap) return false;
      if (text) {
        const haystack = `${a.code} ${a.description} ${a.subgrupo} ${a.disciplina} ${a.categoriaCusto}`.toLowerCase();
        if (!haystack.includes(text)) return false;
      }
      return true;
    });
  }, [filterGc, filterCap, filterText]);

  return (
    <MainLayout>
      <TopBar title="Base de dados de artigos" />

      <main className="rounded-2xl bg-white/80 p-8 shadow-sm ring-1 ring-slate-100">
        <header className="mb-6 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Base de dados de artigos
          </h1>
          <p className="max-w-3xl text-sm text-slate-500">
            Catálogo normalizado de artigos de construção (derivado do ficheiro{" "}
            <span className="font-mono">BD_MASTER_Normalizada_4d.xlsx</span>).
            Esta vista é apenas de leitura para consulta rápida.
          </p>
        </header>

        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-4 text-xs">
            <p className="text-xs text-slate-500">
              A mostrar{" "}
              <span className="font-medium">{filteredArtigos.length}</span>{" "}
              artigos (de um total de{" "}
              <span className="font-medium">{artigos.length}</span>).
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1">
                <span className="text-slate-500">GC</span>
                <select
                  value={filterGc}
                  onChange={(e) => {
                    setFilterGc(e.target.value);
                    setFilterCap("");
                  }}
                  className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-800"
                >
                  <option value="">Todos</option>
                  {todosGc.map((gc) => (
                    <option key={gc} value={gc}>
                      {gc}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1">
                <span className="text-slate-500">Cap.</span>
                <select
                  value={filterCap}
                  onChange={(e) => setFilterCap(e.target.value)}
                  className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-800"
                >
                  <option value="">Todos</option>
                  {todosCap
                    .filter((c) => !filterGc || c.gc === filterGc)
                    .map(({ gc, cap }) => (
                      <option key={`${gc}-${cap}`} value={cap}>
                        {gc}.{cap}
                      </option>
                    ))}
                </select>
              </label>
              <input
                type="text"
                placeholder="Filtrar por código, descrição, subgrupo…"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-56 rounded border border-slate-200 px-2 py-1 text-[11px] text-slate-800 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="max-h-[32rem] overflow-auto rounded-lg border border-slate-100">
            <table className="min-w-full border-collapse text-left text-xs">
              <thead className="bg-slate-50">
                <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2">
                    Código
                  </th>
                  <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2">
                    Descrição
                  </th>
                  <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2">
                    Unid.
                  </th>
                  <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2">
                    Grande cap.
                  </th>
                  <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2">
                    Capítulo
                  </th>
                  <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2">
                    Subgrupo
                  </th>
                  <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2 text-right">
                    PU custo
                  </th>
                  <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2 text-right">
                    PU venda
                  </th>
                  <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2">
                    Disciplina
                  </th>
                  <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2">
                    Categoria custo
                  </th>
                  <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2">
                    Tipo medição
                  </th>
                  <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2">
                    Inclui MO
                  </th>
                  <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2">
                    Flags
                  </th>
                  <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2">
                    Ativo
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredArtigos.map((artigo) => (
                  <tr
                    key={artigo.code}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                  >
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-slate-800">
                      {artigo.code}
                    </td>
                    <td className="max-w-xl px-3 py-2 text-[11px] text-slate-800">
                      {artigo.description}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-[11px] text-slate-700">
                      {artigo.unit}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-[11px] text-slate-700">
                      {artigo.grandeCapituloCode}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-[11px] text-slate-700">
                      {artigo.capituloCode}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-slate-700">
                      {artigo.subgrupo}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] text-slate-800">
                      {typeof artigo.puCusto === "number"
                        ? artigo.puCusto.toFixed(2)
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] text-slate-800">
                      {typeof artigo.puVendaFixo === "number"
                        ? artigo.puVendaFixo.toFixed(2)
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-[11px] text-slate-700">
                      {artigo.disciplina}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-[11px] text-slate-700">
                      {artigo.categoriaCusto}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-[11px] text-slate-700">
                      {artigo.tipoMedicao}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-[11px] text-slate-700">
                      {artigo.incluiMO ? "Sim" : "Não"}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-slate-700">
                      {artigo.flags
                        ? [
                            artigo.flags.nova && "Nova",
                            artigo.flags.reabilitacao && "Reabilitação",
                            artigo.flags.habitacao && "Habitação",
                            artigo.flags.comercio && "Comércio",
                          ]
                            .filter(Boolean)
                            .join(" · ")
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-[11px] text-slate-700">
                      {artigo.ativo === false ? "Não" : "Sim"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </MainLayout>
  );
}

