"use client";

import Link from "next/link";
import { useBudgetDraft } from "./BudgetDraftContext";

export function NovoOrcamentoHeader() {
  const { items, save, saving, lastSavedId, saveError, meta } = useBudgetDraft();
  const hasItems = items.length > 0;

  const hasRequiredMeta =
    meta.obraNome.trim().length > 0 &&
    meta.obraNumero.trim().length > 0 &&
    meta.dataProposta.trim().length > 0;

  const canSave = hasItems && hasRequiredMeta;

  function handlePrint() {
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  return (
    <header className="sticky top-4 z-20 flex items-center justify-between rounded-xl bg-white/80 px-6 py-4 shadow-sm ring-1 ring-slate-100 no-print">
      <div className="text-sm font-semibold tracking-wide text-slate-800">
        Novo orçamento
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={!canSave || saving}
          title={
            !hasRequiredMeta
              ? "Preencha Nome da obra, Nº de obra e Data da proposta para gravar."
              : undefined
          }
          className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          {saving
            ? "A gravar..."
            : hasItems
              ? "Gravar orçamento"
              : "Sem linhas"}
        </button>
        {saveError ? (
          <span className="text-[11px] text-amber-600" title={saveError}>
            {saveError}
          </span>
        ) : null}
        {lastSavedId ? (
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>
              Gravado:{" "}
              <span className="font-mono text-[10px]">{lastSavedId}</span>
            </span>
            <Link
              href={`/orcamentos/${lastSavedId}`}
              className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700 transition hover:bg-emerald-100"
            >
              Ver proposta
            </Link>
            <Link
              href="/orcamentos/guardados"
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Ver lista
            </Link>
          </div>
        ) : null}
        <button
          type="button"
          onClick={handlePrint}
          className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
        >
          Imprimir / Exportar PDF
        </button>
        <Link
          href="/"
          className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
        >
          Dashboard
        </Link>
      </div>
    </header>
  );
}

