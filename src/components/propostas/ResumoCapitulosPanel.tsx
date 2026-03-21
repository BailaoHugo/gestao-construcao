"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { PropostaLinha } from "@/propostas/domain";
import { formatCurrencyPt } from "@/propostas/format";
import {
  resumoPorGrandeECapitulo,
  type TotaisLinhas,
} from "@/lib/propostas/agruparLinhasProposta";
import { CollapsibleSection } from "@/components/propostas/CollapsibleSection";
import {
  RESUMO_CAP_COLUNAS_ORDER,
  RESUMO_CAP_COL_LABELS,
  countResumoCapColunasVisiveis,
  loadResumoCapColunas,
  saveResumoCapColunas,
  type ResumoCapColunaKey,
} from "@/lib/propostas/resumoCapitulosColunas";
import {
  labelCapitulo,
  labelGrandeCapitulo,
} from "@/lib/propostas/catalogoLabels";

function margemPct(t: TotaisLinhas) {
  return t.totalVenda > 0 ? (t.margem / t.totalVenda) * 100 : 0;
}

function CelulasTotais({
  totais,
  vis,
  vendaDestaque,
}: {
  totais: TotaisLinhas;
  vis: Record<ResumoCapColunaKey, boolean>;
  vendaDestaque?: boolean;
}) {
  return (
    <>
      {vis.custo && (
        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
          {formatCurrencyPt(totais.totalCusto)}
        </td>
      )}
      {vis.venda && (
        <td
          className={`whitespace-nowrap px-3 py-2 text-right tabular-nums ${
            vendaDestaque ? "font-medium text-slate-900" : ""
          }`}
        >
          {formatCurrencyPt(totais.totalVenda)}
        </td>
      )}
      {vis.margem && (
        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
          {formatCurrencyPt(totais.margem)}
        </td>
      )}
      {vis.margemPct && (
        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-600">
          {margemPct(totais).toFixed(1)}%
        </td>
      )}
    </>
  );
}

export function ResumoCapitulosPanel({ linhas }: { linhas: PropostaLinha[] }) {
  const { grupos, totalGeral } = resumoPorGrandeECapitulo(linhas);
  const vazio = linhas.length === 0;

  const [colunasVisiveis, setColunasVisiveis] = useState(() =>
    loadResumoCapColunas(),
  );
  const [menuColunasAberto, setMenuColunasAberto] = useState(false);
  const menuColunasRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    saveResumoCapColunas(colunasVisiveis);
  }, [colunasVisiveis]);

  useEffect(() => {
    if (!menuColunasAberto) return;
    function onDocMouseDown(e: MouseEvent) {
      const el = menuColunasRef.current;
      if (!el) return;
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (!el.contains(target)) setMenuColunasAberto(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [menuColunasAberto]);

  const colSpan = useMemo(
    () => 1 + countResumoCapColunasVisiveis(colunasVisiveis),
    [colunasVisiveis],
  );

  const minTableWidth = useMemo(() => {
    const n = countResumoCapColunasVisiveis(colunasVisiveis);
    /* ~140px capítulo + ~100px por coluna numérica */
    return Math.max(280, 140 + n * 100);
  }, [colunasVisiveis]);

  const headerActions =
    !vazio ? (
      <div className="relative" ref={menuColunasRef}>
        <button
          type="button"
          onClick={() => setMenuColunasAberto((o) => !o)}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          aria-expanded={menuColunasAberto}
        >
          Colunas
        </button>
        {menuColunasAberto && (
          <div className="absolute right-0 z-20 mt-1 w-52 rounded-lg border border-slate-200 bg-white py-2 text-[11px] shadow-lg">
            <p className="border-b border-slate-100 px-3 pb-2 font-semibold text-slate-800">
              Colunas do resumo
            </p>
            <p className="px-3 pt-2 text-[10px] leading-snug text-slate-500">
              «Capítulo» está sempre visível. Escolha as colunas numéricas.
            </p>
            <div className="max-h-64 overflow-auto px-2 pt-2">
              {RESUMO_CAP_COLUNAS_ORDER.map((key) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={colunasVisiveis[key]}
                    onChange={() => {
                      setColunasVisiveis((prev) => {
                        const next = { ...prev, [key]: !prev[key] };
                        if (countResumoCapColunasVisiveis(next) < 1) return prev;
                        return next;
                      });
                    }}
                    className="rounded border-slate-300"
                  />
                  <span>{RESUMO_CAP_COL_LABELS[key]}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    ) : null;

  return (
    <CollapsibleSection
      title="Resumo por capítulo"
      subtitle="Totais por capítulo e grande capítulo. Use «Colunas» para mostrar ou ocultar valores."
      headerActions={headerActions}
    >
      {vazio ? (
        <p className="text-sm text-slate-500">
          Adicione linhas à proposta para ver o resumo agrupado por capítulo.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table
            className="w-full border-collapse text-left text-xs"
            style={{ minWidth: minTableWidth }}
          >
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                <th className="px-3 py-2">Capítulo</th>
                {colunasVisiveis.custo && (
                  <th className="px-3 py-2 text-right">Custo</th>
                )}
                {colunasVisiveis.venda && (
                  <th className="px-3 py-2 text-right">Venda</th>
                )}
                {colunasVisiveis.margem && (
                  <th className="px-3 py-2 text-right">Margem</th>
                )}
                {colunasVisiveis.margemPct && (
                  <th className="px-3 py-2 text-right">Margem %</th>
                )}
              </tr>
            </thead>
            <tbody className="text-slate-800">
              {grupos.map((g, gi) => (
                <Fragment key={`gc-${gi}`}>
                  <tr className="border-b border-slate-100 bg-slate-100/80">
                    <td
                      colSpan={colSpan}
                      className="px-3 py-2 text-[11px] font-semibold text-slate-900"
                    >
                      {labelGrandeCapitulo(g.grandeCapitulo)}
                    </td>
                  </tr>
                  {g.capitulos.map((c, ci) => (
                    <tr
                      key={`g-${gi}-c-${ci}`}
                      className="border-b border-slate-100 hover:bg-slate-50/80"
                    >
                      <td className="px-3 py-2 pl-6 text-slate-700">
                        {labelCapitulo(c.capitulo)}
                      </td>
                      <CelulasTotais
                        totais={c.totais}
                        vis={colunasVisiveis}
                        vendaDestaque
                      />
                    </tr>
                  ))}
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-medium">
                    <td className="px-3 py-2 pl-4 text-slate-700">
                      Subtotal {labelGrandeCapitulo(g.grandeCapitulo)}
                    </td>
                    <CelulasTotais totais={g.totais} vis={colunasVisiveis} />
                  </tr>
                </Fragment>
              ))}
              <tr className="bg-slate-100 text-[11px] font-semibold text-slate-900">
                <td className="px-3 py-2.5">Total geral</td>
                <CelulasTotais totais={totalGeral} vis={colunasVisiveis} />
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </CollapsibleSection>
  );
}
