import { notFound } from "next/navigation";
import { loadPropostaCompleta } from "@/propostas/db";
import { formatCurrencyPt, formatDatePt } from "@/propostas/format";

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

  return (
    <div className="print-page text-xs text-slate-800">
      <div className="mx-auto max-w-[180mm] space-y-6">
      {/* Cabeçalho */}
      <header className="print-section flex items-start justify-between border-b border-slate-200 pb-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Proposta de serviços
          </h1>
          <p className="text-[11px] text-slate-600">
            Ref. {proposta.codigo} · Revisão R{rev.numeroRevisao}
          </p>
        </div>
        <div className="text-right text-[11px] text-slate-700">
          <div className="font-semibold text-slate-900">ENNova</div>
          <div>Empresa de Construção</div>
          <div>exemplo@ennova.pt</div>
          <div>+351 900 000 000</div>
        </div>
      </header>

      {/* Dados do cliente / obra */}
      <section className="print-section grid gap-4 border-b border-slate-200 pb-4 md:grid-cols-2 mt-4">
        <div className="space-y-1">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Cliente
          </h2>
          <div>{rev.folhaRosto.clienteNome}</div>
          {rev.folhaRosto.clienteEmail && <div>{rev.folhaRosto.clienteEmail}</div>}
          {rev.folhaRosto.clienteContacto && <div>{rev.folhaRosto.clienteContacto}</div>}
        </div>
        <div className="space-y-1 text-right md:text-left">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Obra
          </h2>
          {rev.folhaRosto.obraNome && <div>{rev.folhaRosto.obraNome}</div>}
          {rev.folhaRosto.obraMorada && <div>{rev.folhaRosto.obraMorada}</div>}
          <div className="mt-2 text-[11px] text-slate-600">
            <span className="font-medium">Data proposta: </span>
            {formatDatePt(rev.folhaRosto.dataProposta)}
          </div>
          <div className="text-[11px] text-slate-600">
            <span className="font-medium">Validade: </span>
            {rev.folhaRosto.validadeTexto ??
              (rev.folhaRosto.validadeDias
                ? `${rev.folhaRosto.validadeDias} dias`
                : "—")}
          </div>
        </div>
      </section>

      {/* Tabela de linhas */}
      <section className="print-section mt-4 space-y-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Detalhe da proposta
        </h2>
        <table className="min-w-full border-collapse text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50">
              <tr className="text-[11px] uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2">Descrição</th>
              <th className="px-3 py-2 text-right">Qtd.</th>
              <th className="px-3 py-2">Unid.</th>
              <th className="px-3 py-2 text-right">PU</th>
              <th className="px-3 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {rev.linhas.map((linha) => (
              <tr key={linha.id} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2 align-top text-[11px] text-slate-800">
                  {linha.descricao}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right text-[11px] text-slate-800">
                  {linha.quantidade}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-[11px] text-slate-800">
                  {linha.unidade}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right text-[11px] text-slate-800">
                  {formatCurrencyPt(linha.precoUnitario)}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-right text-[11px] text-slate-800">
                  {formatCurrencyPt(linha.totalLinha)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Totais */}
      <section className="print-section mt-6 flex justify-end">
        <div className="w-full max-w-xs rounded border border-slate-300 bg-slate-50 p-3 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-700">Total proposta</span>
            <span className="text-base font-semibold text-slate-900">
              {formatCurrencyPt(rev.total)}
            </span>
          </div>
        </div>
      </section>

      {/* Notas finais / condições */}
      <section className="print-section mt-4 text-[10px] text-slate-500">
        <p>
          Esta proposta é válida pelo período indicado, salvo erro ou omissão. Os
          trabalhos serão executados de acordo com as boas práticas de construção
          e a legislação em vigor.
        </p>
      </section>
      </div>
    </div>
  );
}

