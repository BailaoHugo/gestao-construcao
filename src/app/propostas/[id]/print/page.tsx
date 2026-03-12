import Image from "next/image";
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

  const gruposPorCapitulo: {
    capitulo: string;
    grandeCapitulo: string | null;
    linhas: typeof rev.linhas;
    subtotal: number;
  }[] = [];

  for (const linha of rev.linhas) {
    const capituloTrim = (linha.capitulo ?? "").trim();
    const grandeTrim = (linha.grandeCapitulo ?? "").trim();
    const capitulo =
      capituloTrim.length > 0 ? capituloTrim : "Sem capítulo";
    const grandeCapitulo =
      grandeTrim.length > 0 ? grandeTrim : null;

    let grupo = gruposPorCapitulo.find((g) => g.capitulo === capitulo);
    if (!grupo) {
      grupo = {
        capitulo,
        grandeCapitulo,
        linhas: [],
        subtotal: 0,
      };
      gruposPorCapitulo.push(grupo);
    }

    grupo.linhas.push(linha);
    grupo.subtotal += linha.totalVendaLinha;

    if (!grupo.grandeCapitulo && grandeCapitulo) {
      grupo.grandeCapitulo = grandeCapitulo;
    }
  }

  return (
    <div className="print-page text-xs text-slate-800">
      <div className="mx-auto max-w-[180mm] space-y-6">
        {/* Cabeçalho com logo e título */}
        <header className="print-section flex items-start justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded bg-slate-900">
              <Image
                src="/logo-ennova.png"
                alt="Ennova - Engenharia e Gestão de Obra"
                width={40}
                height={40}
                className="h-10 w-10 object-contain"
              />
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                ENNova
              </div>
              <div className="text-[11px] text-slate-500">
                Empresa de Construção
              </div>
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-700">
            <div className="text-sm font-semibold tracking-tight text-slate-900">
              Proposta comercial
            </div>
            <div className="text-[11px] text-slate-600">
              Ref. {proposta.codigo} · Revisão R{rev.numeroRevisao}
            </div>
            <div className="text-[11px] text-slate-600">
              Data: {formatDatePt(rev.folhaRosto.dataProposta)}
            </div>
          </div>
        </header>

        {/* Blocos de informação + resumo */}
        <section className="print-section mt-4 grid gap-4 border-b border-slate-200 pb-4 md:grid-cols-3">
          <div className="space-y-1">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Cliente
            </h2>
            <div>{rev.folhaRosto.clienteNome}</div>
            {rev.folhaRosto.clienteEmail && (
              <div>{rev.folhaRosto.clienteEmail}</div>
            )}
            {rev.folhaRosto.clienteContacto && (
              <div>{rev.folhaRosto.clienteContacto}</div>
            )}
          </div>
          <div className="space-y-1">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Obra
            </h2>
            {rev.folhaRosto.obraNome && <div>{rev.folhaRosto.obraNome}</div>}
            {rev.folhaRosto.obraMorada && (
              <div className="text-[11px] text-slate-700">
                {rev.folhaRosto.obraMorada}
              </div>
            )}
          </div>
          <div className="space-y-1 rounded border border-slate-200 bg-slate-50 p-3 text-[11px]">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              Resumo
            </h2>
            <dl className="mt-1 space-y-0.5">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-500">Referência</dt>
                <dd className="font-medium text-slate-800">
                  {proposta.codigo}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-500">Revisão</dt>
                <dd className="font-medium text-slate-800">
                  R{rev.numeroRevisao}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-500">Data</dt>
                <dd className="font-medium text-slate-800">
                  {formatDatePt(rev.folhaRosto.dataProposta)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-500">Validade</dt>
                <dd className="font-medium text-slate-800">
                  {rev.folhaRosto.validadeTexto ??
                    (rev.folhaRosto.validadeDias
                      ? `${rev.folhaRosto.validadeDias} dias`
                      : "—")}
                </dd>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 border-t border-slate-200 pt-1.5">
                <dt className="text-slate-600">Total</dt>
                <dd className="text-sm font-semibold text-slate-900">
                  {formatCurrencyPt(rev.totalVenda)}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Tabela de linhas por capítulo */}
        <section className="print-section mt-4 space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Detalhe da proposta
          </h2>
          {gruposPorCapitulo.map((grupo) => (
            <div key={grupo.capitulo} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">
                  CAP. {grupo.capitulo}
                </h3>
                {grupo.grandeCapitulo && (
                  <span className="text-[10px] text-slate-500">
                    Grande capítulo {grupo.grandeCapitulo}
                  </span>
                )}
              </div>
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
                  {grupo.linhas.map((linha) => (
                    <tr
                      key={linha.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-3 py-2 align-top text-[11px] text-slate-800">
                        {linha.descricao}
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right text-[11px] text-slate-800">
                        {linha.quantidade}
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-[11px] text-slate-800">
                        {linha.unidade}
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right text-[11px] text-slate-800">
                        {formatCurrencyPt(linha.precoVendaUnitario)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5 text-right text-[11px] text-slate-800">
                        {formatCurrencyPt(linha.totalVendaLinha)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-1 flex justify-end text-[10px] text-slate-600">
                <span className="mr-2">Subtotal capítulo</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrencyPt(grupo.subtotal)}
                </span>
              </div>
            </div>
          ))}
        </section>

        {/* Totais */}
        <section className="print-section mt-6 flex justify-end">
          <div className="w-full max-w-xs rounded border border-slate-300 bg-slate-50 p-3 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-700">Total proposta</span>
              <span className="text-base font-semibold text-slate-900">
                {formatCurrencyPt(rev.totalVenda)}
              </span>
            </div>
          </div>
        </section>

        {/* Notas finais / condições */}
        <section className="print-section mt-4 text-[10px] text-slate-500">
          {rev.folhaRosto.notas && (
            <p className="mb-2 whitespace-pre-line">{rev.folhaRosto.notas}</p>
          )}
          <p>
            Esta proposta é válida pelo período indicado, salvo erro ou omissão.
            Os trabalhos serão executados de acordo com as boas práticas de
            construção e a legislação em vigor. Quaisquer alterações ao escopo
            inicial poderão implicar revisão de preços.
          </p>
        </section>

        {/* Rodapé */}
        <footer className="print-section mt-8 flex items-center justify-between border-t border-slate-200 pt-3 text-[9px] text-slate-500">
          <span>ENNova · Empresa de Construção</span>
          <span>exemplo@ennova.pt · +351 900 000 000 · www.exemplo.pt</span>
        </footer>
      </div>
    </div>
  );
}

