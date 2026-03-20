import Image from "next/image";
import { notFound } from "next/navigation";
import { loadPropostaCompleta } from "@/propostas/db";
import { formatCurrencyPt, formatDatePt } from "@/propostas/format";
import type { PropostaLinha } from "@/propostas/domain";
import {
  calcularDerivadosLinha,
  K_DEFAULT,
} from "@/lib/propostas/linhaDerivados";
import {
  agruparLinhasPorGrandeECapitulo,
  type TotaisLinhas,
} from "@/lib/propostas/agruparLinhasProposta";

export const dynamic = "force-dynamic";

export default async function PropostaPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const proposta = await loadPropostaCompleta(id);

  if (!proposta) {
    notFound();
  }

  const { revisaoAtual: rev } = proposta;
  const renderItems = agruparLinhasPorGrandeECapitulo(rev.linhas);
  const ZEROS: TotaisLinhas = { totalCusto: 0, totalVenda: 0, margem: 0 };

  type CapituloPrint = {
    capitulo: string | null;
    linhas: PropostaLinha[];
    totais: TotaisLinhas;
  };

  type GrandeCapituloPrint = {
    grandeCapitulo: string | null;
    capitulos: CapituloPrint[];
    totais: TotaisLinhas;
  };

  const gruposPrint: GrandeCapituloPrint[] = [];
  let currentGrande: GrandeCapituloPrint | null = null;
  let currentCapitulo: CapituloPrint | null = null;
  let totalGeral: TotaisLinhas | null = null;

  for (const item of renderItems) {
    switch (item.type) {
      case "grandeTitle": {
        currentGrande = {
          grandeCapitulo: item.grandeCapitulo,
          capitulos: [],
          totais: ZEROS,
        };
        break;
      }
      case "capTitle": {
        currentCapitulo = {
          capitulo: item.capitulo,
          linhas: [],
          totais: ZEROS,
        };
        break;
      }
      case "linha": {
        currentCapitulo?.linhas.push(item.linha);
        break;
      }
      case "capSubtotal": {
        if (!currentGrande || !currentCapitulo) break;
        currentCapitulo.totais = item.totais;
        currentGrande.capitulos.push(currentCapitulo);
        currentCapitulo = null;
        break;
      }
      case "grandeSubtotal": {
        if (!currentGrande) break;
        currentGrande.totais = item.totais;
        gruposPrint.push(currentGrande);
        currentGrande = null;
        break;
      }
      case "totalGeral": {
        totalGeral = item.totais;
        break;
      }
    }
  }

  const totalGeralValor = totalGeral?.totalVenda ?? rev.totalVenda;

  return (
    <div className="print-page text-[11px] text-slate-800">
      <div className="mx-auto max-w-[180mm] space-y-6">
        {/* Cabeçalho */}
        <header className="print-section flex items-start justify-between gap-6 border-b border-slate-200 pb-4">
          <div className="flex items-start gap-3">
            <Image
              src="/logo-ennova.png"
              alt="Ennova - Engenharia e Gestão de Obra"
              width={157}
              height={66}
              className="h-16 w-auto object-contain"
            />
            <div className="pt-1">
              <div className="text-sm font-semibold tracking-tight text-slate-900">
                Proposta comercial
              </div>
              <div className="mt-1 text-[11px] text-slate-600">
                Ref. {proposta.codigo} · Revisão R{rev.numeroRevisao}
              </div>
              <div className="mt-1 text-[11px] text-slate-600">
                Data: {formatDatePt(rev.folhaRosto.dataProposta)}
              </div>
            </div>
          </div>

          <div className="min-w-[160px] text-right">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Cliente
            </div>
            <div className="mt-1 text-[11px] text-slate-900 font-medium">
              {rev.folhaRosto.clienteNome}
            </div>
            {rev.folhaRosto.clienteEmail && (
              <div className="mt-1 text-[11px] text-slate-600">
                {rev.folhaRosto.clienteEmail}
              </div>
            )}
            {rev.folhaRosto.clienteContacto && (
              <div className="mt-1 text-[11px] text-slate-600">
                {rev.folhaRosto.clienteContacto}
              </div>
            )}
          </div>
        </header>

        {/* Corpo: grande capítulo -> capítulo -> linhas + subtotais */}
        <section className="space-y-5">
          {gruposPrint.map((g, idx) => (
            <div key={`gc-${idx}`} className="space-y-3 print-section">
              <h2 className="text-[12px] font-semibold uppercase tracking-wide text-slate-900">
                Grande Capítulo: {g.grandeCapitulo ?? "Sem Grande Capítulo"}
              </h2>

              {g.capitulos.map((c, cIdx) => (
                <div
                  key={`c-${idx}-${cIdx}`}
                  className="space-y-2 print-section"
                >
                  <h3 className="text-[11px] font-semibold text-slate-900">
                    Capítulo: {c.capitulo ?? "Sem Capítulo"}
                  </h3>

                  <table className="w-full border-collapse text-left text-[10px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-3 py-2 font-semibold text-slate-700 text-[10px]">
                          Descrição
                        </th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-700 text-[10px]">
                          Qtd.
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-700 text-[10px]">
                          Unid.
                        </th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-700 text-[10px]">
                          PU venda
                        </th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-700 text-[10px]">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.linhas.map((linha) => {
                        const derivados = calcularDerivadosLinha(
                          linha,
                          K_DEFAULT,
                        );
                        return (
                          <tr
                            key={linha.id}
                            className="border-b border-slate-100 last:border-0"
                          >
                            <td className="px-3 py-2 align-top text-slate-800">
                              {linha.descricao}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-right text-slate-800">
                              {linha.quantidade}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-slate-800">
                              {linha.unidade}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-right text-slate-800">
                              {formatCurrencyPt(derivados.precoVendaUnitario)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-right font-medium text-slate-900">
                              {formatCurrencyPt(derivados.totalVendaLinha)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div className="flex justify-end rounded border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] text-slate-700">
                    <span className="mr-2">Subtotal Capítulo</span>
                    <span className="font-semibold text-slate-900">
                      {formatCurrencyPt(c.totais.totalVenda)}
                    </span>
                  </div>
                </div>
              ))}

              <div className="flex justify-end rounded border border-slate-200 bg-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-900">
                Subtotal Grande Capítulo:{" "}
                {formatCurrencyPt(g.totais.totalVenda)}
              </div>
            </div>
          ))}
        </section>

        {/* Total geral + nota final */}
        <section className="print-section">
          <div className="flex justify-end rounded border border-slate-300 bg-slate-100 px-4 py-3 text-[11px]">
            <span className="mr-2 font-medium text-slate-700">
              Total geral
            </span>
            <span className="text-base font-bold text-slate-900">
              {formatCurrencyPt(totalGeralValor)}
            </span>
          </div>

          <p className="mt-3 text-[10px] text-slate-600">
            Acresce IVA à taxa legal em vigor.
          </p>
        </section>
      </div>
    </div>
  );
}

