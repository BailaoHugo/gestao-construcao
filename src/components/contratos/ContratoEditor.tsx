"use client";

import { useState } from "react";
import type { Contrato } from "@/contratos/domain";
import { formatContratoEstado } from "@/contratos/format";
import { CollapsibleSection } from "@/components/propostas/CollapsibleSection";

export function ContratoEditor({ initial }: { initial: Contrato }) {
  const [contrato, setContrato] = useState<Contrato>(initial);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEmitido = contrato.estado === "EMITIDO";

  const handleEmitir = async () => {
    try {
      setIsSaving(true);
      setError(null);
      const res = await fetch(`/api/contratos/${contrato.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "EMITIDO" }),
      });
      const data = (await res.json()) as Contrato & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Falha ao emitir contrato");
      setContrato(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleGuardar = async () => {
    if (isEmitido) return;
    try {
      setIsSaving(true);
      setError(null);
      const res = await fetch(`/api/contratos/${contrato.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataContrato: contrato.dataContrato || null,
          dataConclusaoPrevista: contrato.dataConclusaoPrevista || null,
          signatarioDonoNome: contrato.signatarioDonoNome,
          signatarioDonoFuncao: contrato.signatarioDonoFuncao,
          signatarioEmpreiteiroNome: contrato.signatarioEmpreiteiroNome,
          signatarioEmpreiteiroFuncao: contrato.signatarioEmpreiteiroFuncao,
          clausulas: contrato.clausulas,
        }),
      });
      const data = (await res.json()) as Contrato & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Falha ao guardar contrato");
      setContrato(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const setField = <K extends keyof Contrato>(key: K, value: Contrato[K]) => {
    if (isEmitido) return;
    setContrato((prev) => ({ ...prev, [key]: value }));
  };

  const setClausula = (index: number, texto: string) => {
    if (isEmitido) return;
    setContrato((prev) => {
      const novasClausulas = prev.clausulas.map((c, i) =>
        i === index ? { ...c, texto } : c,
      );
      return { ...prev, clausulas: novasClausulas };
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Contrato {contrato.propostaCodigo} – Revisão {contrato.revisaoNumero}
          </h1>
          <p className="text-sm text-slate-500">
            {contrato.clienteNome}
            {contrato.obraNome ? ` · ${contrato.obraNome}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/contratos/${contrato.id}/pdf`}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Exportar PDF
          </a>
          {!isEmitido && (
            <button
              type="button"
              onClick={() => void handleEmitir()}
              disabled={isSaving}
              className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-60"
            >
              Emitir Contrato
            </button>
          )}
          <span
            className={`rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-white ${
              isEmitido ? "bg-emerald-700" : "bg-slate-900"
            }`}
          >
            {formatContratoEstado(contrato.estado)}
          </span>
        </div>
      </header>

      {/* Dados do Contrato */}
      <CollapsibleSection title="Dados do Contrato">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-700">
                Data do Contrato
              </label>
              <input
                type="date"
                className="w-full rounded border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-500"
                value={contrato.dataContrato ?? ""}
                onChange={(e) => setField("dataContrato", e.target.value || null)}
                disabled={isEmitido}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-700">
                Data de Conclusão Prevista
              </label>
              <input
                type="date"
                className="w-full rounded border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-500"
                value={contrato.dataConclusaoPrevista ?? ""}
                onChange={(e) =>
                  setField("dataConclusaoPrevista", e.target.value || null)
                }
                disabled={isEmitido}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <h3 className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
                Signatário – Dono da Obra
              </h3>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">
                  Nome
                </label>
                <input
                  type="text"
                  className="w-full rounded border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-500"
                  value={contrato.signatarioDonoNome}
                  onChange={(e) => setField("signatarioDonoNome", e.target.value)}
                  disabled={isEmitido}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">
                  Função
                </label>
                <input
                  type="text"
                  className="w-full rounded border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-500"
                  value={contrato.signatarioDonoFuncao}
                  onChange={(e) => setField("signatarioDonoFuncao", e.target.value)}
                  disabled={isEmitido}
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
                Signatário – Empreiteiro
              </h3>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">
                  Nome
                </label>
                <input
                  type="text"
                  className="w-full rounded border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-500"
                  value={contrato.signatarioEmpreiteiroNome}
                  onChange={(e) =>
                    setField("signatarioEmpreiteiroNome", e.target.value)
                  }
                  disabled={isEmitido}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-600">
                  Função
                </label>
                <input
                  type="text"
                  className="w-full rounded border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-500"
                  value={contrato.signatarioEmpreiteiroFuncao}
                  onChange={(e) =>
                    setField("signatarioEmpreiteiroFuncao", e.target.value)
                  }
                  disabled={isEmitido}
                />
              </div>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Cláusulas */}
      <CollapsibleSection title="Cláusulas">
        <div className="space-y-4">
          {contrato.clausulas.map((clausula, index) => (
            <div key={clausula.numero} className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-700">
                Cláusula {clausula.numero}.ª – {clausula.titulo}
              </label>
              <textarea
                rows={5}
                className="w-full rounded border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-slate-400 disabled:bg-slate-50 disabled:text-slate-500"
                value={clausula.texto}
                onChange={(e) => setClausula(index, e.target.value)}
                disabled={isEmitido}
              />
            </div>
          ))}
        </div>
      </CollapsibleSection>

      {/* Bottom save bar */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="text-xs text-slate-500">
          {isEmitido
            ? "Este contrato está emitido e não pode ser editado."
            : "Guarde as alterações antes de exportar o PDF."}
          {error && (
            <p className="mt-1 text-[11px] text-red-600">{error}</p>
          )}
        </div>
        {!isEmitido && (
          <button
            type="button"
            onClick={() => void handleGuardar()}
            disabled={isSaving}
            className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-60"
          >
            {isSaving ? "A guardar…" : "Guardar"}
          </button>
        )}
      </section>
    </div>
  );
}
