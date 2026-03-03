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
  categoriaCusto: string;
  puCusto?: number;
}>;

export default function BaseDeDadosPage() {
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
          <div className="mb-3 flex items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              A mostrar <span className="font-medium">{artigos.length}</span>{" "}
              artigos.
            </p>
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
                </tr>
              </thead>
              <tbody>
                {artigos.map((artigo) => (
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

