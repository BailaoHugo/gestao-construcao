import Link from "next/link";
import { loadContratosResumo } from "@/contratos/db";
import type { ContratoResumo } from "@/contratos/domain";
import { formatContratoEstado, formatDatePt, formatCurrencyPt } from "@/contratos/format";

export const dynamic = "force-dynamic";

export default async function ContratosPage() {
  let contratos: ContratoResumo[] = [];
  let error: string | null = null;

  try {
    contratos = await loadContratosResumo();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error("[contratos] Falha ao carregar contratos:", message);
    error =
      "Não foi possível carregar a lista de contratos. Verifique a ligação à base de dados.";
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Contratos
          </h1>
          <p className="max-w-2xl text-sm text-slate-500">
            Gestão de contratos de empreitada gerados a partir de propostas emitidas.
          </p>
        </div>
      </header>

      <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-3 text-xs text-slate-500">
          {error && (
            <div className="mb-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
              {error}
            </div>
          )}
          {contratos.length > 0 ? (
            <>
              A mostrar{" "}
              <span className="font-medium">{contratos.length}</span>{" "}
              contrato{contratos.length > 1 && "s"}.
            </>
          ) : (
            "Ainda não existem contratos. Gere um contrato a partir de uma proposta emitida."
          )}
        </div>

        <div className="max-h-[28rem] overflow-auto rounded-lg border border-slate-100">
          <table className="min-w-full border-collapse text-left text-xs">
            <thead className="bg-slate-50">
              <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Código</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2 text-center">Rev.</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Data Contrato</th>
                <th className="px-3 py-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {contratos.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-6 text-center text-[11px] text-slate-400"
                  >
                    Ainda não existem contratos guardados.
                  </td>
                </tr>
              ) : (
                contratos.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                  >
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-sky-700">
                      <Link
                        href={`/contratos/${c.id}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {c.propostaCodigo}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-[11px] text-slate-800">
                      {c.clienteNome}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-center text-[11px] text-slate-700">
                      R{c.revisaoNumero}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-[11px] text-slate-700">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          c.estado === "EMITIDO"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {formatContratoEstado(c.estado)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-[11px] text-slate-700">
                      {formatDatePt(c.dataContrato)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] text-slate-800">
                      {formatCurrencyPt(c.totalVenda)}
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
