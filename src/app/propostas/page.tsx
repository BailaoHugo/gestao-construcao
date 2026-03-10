import Link from "next/link";
import { loadPropostasResumo } from "@/propostas/db";
import type { PropostaResumo } from "@/propostas/domain";
import { formatCurrencyPt, formatDatePt, formatEstadoLabel } from "@/propostas/format";

export const dynamic = "force-dynamic";

export default async function PropostasPage() {
  let propostas: PropostaResumo[] = [];
  let error: string | null = null;

  try {
    propostas = await loadPropostasResumo();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error("[propostas] Falha ao carregar propostas:", message);
    error =
      "Não foi possível carregar a lista de propostas. Verifique a ligação à base de dados.";
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Propostas
          </h1>
          <p className="max-w-2xl text-sm text-slate-500">
            Gestão simples de propostas comerciais. Esta versão é um MVP
            independente do módulo de orçamentos.
          </p>
        </div>
        <Link
          href="/propostas/nova"
          className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-500"
        >
          Nova proposta
        </Link>
      </header>

      <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-3 text-xs text-slate-500">
          {error && (
            <div className="mb-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
              {error}
            </div>
          )}
          {propostas.length > 0 ? (
            <>
              A mostrar{" "}
              <span className="font-medium">{propostas.length}</span>{" "}
              proposta{propostas.length > 1 && "s"}.
            </>
          ) : (
            "Ainda não existem propostas."
          )}
        </div>

        <div className="max-h-[28rem] overflow-auto rounded-lg border border-slate-100">
          <table className="min-w-full border-collapse text-left text-xs">
            <thead className="bg-slate-50">
              <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Código</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Obra</th>
                <th className="px-3 py-2 text-center">Rev.</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {propostas.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-6 text-center text-[11px] text-slate-400"
                  >
                    Ainda não existem propostas guardadas.
                  </td>
                </tr>
              ) : (
                propostas.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                  >
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-emerald-700">
                      <Link
                        href={`/propostas/${p.id}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {p.codigo}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-slate-800">
                      {p.clienteNome}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-slate-700">
                      {p.obraNome || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-center text-[11px] text-slate-700">
                      R{p.revisaoAtual}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-[11px] text-slate-700">
                      {formatEstadoLabel(p.estadoAtual)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-[11px] text-slate-700">
                      {formatDatePt(p.dataCriacao)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] text-slate-800">
                      {formatCurrencyPt(p.totalAtual)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

