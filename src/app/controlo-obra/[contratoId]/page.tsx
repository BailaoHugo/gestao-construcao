'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Resumo {
  contratoId: string;
  totalCustos: number;
  totalMateriais: number;
  totalSubempreitadas: number;
  totalMaoDeObra: number;
  totalEquipamento: number;
  numFaturasPendentes: number;
}

interface CustoObra {
  id: string;
  tipo: string;
  data: string;
  descricao: string | null;
  valor: number;
  fornecedorNome: string | null;
  trabalhadorNome: string | null;
  faturaRef: string | null;
}

interface Contrato {
  id: string;
  propostaCodigo: string;
  clienteNome: string;
  estado: string;
  totalVenda: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n);
}

const TIPO_LABELS: Record<string, string> = {
  material: 'Material',
  subempreitada: 'Subempreitada',
  mao_de_obra: 'Mão de Obra',
  equipamento: 'Equipamento',
  outro: 'Outro',
};

export default function ContratoDetailPage() {
  const { contratoId } = useParams<{ contratoId: string }>();
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [custos, setCustos] = useState<CustoObra[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contratoId) return;
    Promise.all([
      fetch(`/api/contratos/${contratoId}`).then(r => r.json()),
      fetch(`/api/custos-obra/resumo/${contratoId}`).then(r => r.json()),
      fetch(`/api/custos-obra?contratoId=${contratoId}`).then(r => r.json()),
    ])
      .then(([c, res, co]) => {
        setContrato(c);
        setResumo(res);
        setCustos(Array.isArray(co) ? co : []);
      })
      .finally(() => setLoading(false));
  }, [contratoId]);

  const margem = contrato && contrato.totalVenda > 0 && resumo
    ? ((contrato.totalVenda - resumo.totalCustos) / contrato.totalVenda) * 100
    : null;

  return (
    <div className="min-h-screen bg-surface px-4 py-6 text-slate-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="no-print flex items-center justify-between rounded-xl bg-white/80 px-6 py-4 shadow-sm ring-1 ring-slate-100">
          <div className="text-sm font-semibold tracking-wide text-slate-800">Gestão Construção</div>
          <div className="flex gap-3">
            <Link href={`/controlo-obra/faturas?contratoId=${contratoId}`} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">Faturas</Link>
            <Link href="/controlo-obra" className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">← Contratos</Link>
          </div>
        </header>

        {loading ? (
          <p className="text-sm text-slate-400 px-4">A carregar...</p>
        ) : (
          <>
            <div className="rounded-2xl bg-white/80 p-8 shadow-sm ring-1 ring-slate-100">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{contrato?.propostaCodigo}</p>
                  <h1 className="text-2xl font-semibold text-slate-900">{contrato?.clienteNome}</h1>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${contrato?.estado === 'EMITIDO' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{contrato?.estado}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
                {[
                  { label: 'Venda', val: fmt(contrato?.totalVenda ?? 0), color: 'text-slate-700' },
                  { label: 'Total Custos', val: fmt(resumo?.totalCustos ?? 0), color: 'text-slate-700' },
                  { label: 'Margem', val: margem !== null ? `${margem.toFixed(1)}%` : '—', color: margem !== null && margem >= 0 ? 'text-green-600' : 'text-red-600' },
                  { label: 'Materiais', val: fmt(resumo?.totalMateriais ?? 0), color: 'text-blue-600' },
                  { label: 'Subempreitadas', val: fmt(resumo?.totalSubempreitadas ?? 0), color: 'text-purple-600' },
                  { label: 'Mão de Obra', val: fmt(resumo?.totalMaoDeObra ?? 0), color: 'text-orange-600' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="rounded-xl bg-slate-50 px-4 py-3">
                    <p className="text-xs text-slate-400">{label}</p>
                    <p className={`text-sm font-semibold ${color}`}>{val}</p>
                  </div>
                ))}
              </div>

              {(resumo?.numFaturasPendentes ?? 0) > 0 && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span className="text-sm text-amber-700">{resumo!.numFaturasPendentes} fatura(s) pendente(s) de revisão</span>
                  <Link href={`/controlo-obra/faturas?contratoId=${contratoId}`} className="ml-auto text-xs font-medium text-amber-600 underline">Ver faturas</Link>
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white/80 p-8 shadow-sm ring-1 ring-slate-100">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Custos de Obra</h2>
              </div>

              {custos.length === 0 ? (
                <p className="text-sm text-slate-400">Sem custos registados para este contrato.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs text-slate-400">
                        <th className="pb-3 font-medium">Data</th>
                        <th className="pb-3 font-medium">Tipo</th>
                        <th className="pb-3 font-medium">Descrição</th>
                        <th className="pb-3 font-medium">Fornecedor / Trabalhador</th>
                        <th className="pb-3 font-medium text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {custos.map(c => (
                        <tr key={c.id} className="hover:bg-slate-50/50">
                          <td className="py-3 text-slate-500">{c.data ? new Date(c.data).toLocaleDateString('pt-PT') : '—'}</td>
                          <td className="py-3">
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{TIPO_LABELS[c.tipo] ?? c.tipo}</span>
                          </td>
                          <td className="py-3 text-slate-700">{c.descricao ?? '—'}</td>
                          <td className="py-3 text-slate-500">{c.fornecedorNome ?? c.trabalhadorNome ?? '—'}</td>
                          <td className="py-3 text-right font-semibold text-slate-900">{fmt(c.valor)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-200">
                        <td colSpan={4} className="pt-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</td>
                        <td className="pt-4 text-right text-base font-bold text-slate-900">{fmt(resumo?.totalCustos ?? 0)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
