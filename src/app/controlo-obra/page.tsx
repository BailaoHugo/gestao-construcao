'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Contrato {
  id: string;
  propostaCodigo: string;
  revisaoNumero: number;
  clienteNome: string;
  estado: string;
  dataContrato: string | null;
  totalVenda: number;
  criadoEm: string;
}

interface Resumo {
  totalCustos: number;
  numFaturasPendentes: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n);
}

export default function ControloObraPage() {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [resumos, setResumos] = useState<Record<string, Resumo>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/contratos')
      .then(r => r.json())
      .then(async (data: Contrato[]) => {
        setContratos(data);
        const entries = await Promise.all(
          data.map(c =>
            fetch(`/api/custos-obra/resumo/${c.id}`)
              .then(r => r.json())
              .then(res => [c.id, res] as [string, Resumo])
              .catch(() => [c.id, { totalCustos: 0, numFaturasPendentes: 0 }] as [string, Resumo]),
          ),
        );
        setResumos(Object.fromEntries(entries));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-surface px-4 py-6 text-slate-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="no-print flex items-center justify-between rounded-xl bg-white/80 px-6 py-4 shadow-sm ring-1 ring-slate-100">
          <div className="text-sm font-semibold tracking-wide text-slate-800">Gestão Construção</div>
          <div className="flex gap-3">
            <Link href="/controlo-obra/faturas" className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">Faturas</Link>
            <Link href="/controlo-obra/despesas" className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">Despesas</Link>
            <Link href="/despesas/scan" className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100">📷 Registar Despesa</Link>
            <Link href="/controlo-obra/fornecedores" className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">Fornecedores</Link>
            <Link href="/controlo-obra/trabalhadores" className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">Trabalhadores</Link>
            <Link href="/" className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">Dashboard</Link>
          </div>
        </header>
        <main className="rounded-2xl bg-white/80 p-8 shadow-sm ring-1 ring-slate-100">
          <header className="mb-8 space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Controlo de Obra</h1>
            <p className="text-sm text-slate-500">Acompanhamento de custos e faturas por contrato.</p>
          </header>
          {loading ? (
            <p className="text-sm text-slate-400">A carregar...</p>
          ) : contratos.length === 0 ? (
            <p className="text-sm text-slate-400">Sem contratos disponíveis.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {contratos.map(c => {
                const res = resumos[c.id] ?? { totalCustos: 0, numFaturasPendentes: 0 };
                const margem = c.totalVenda > 0 ? ((c.totalVenda - res.totalCustos) / c.totalVenda) * 100 : null;
                return (
                  <Link key={c.id} href={`/controlo-obra/${c.id}`} className="block">
                    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-100 bg-white px-6 py-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{c.propostaCodigo}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.estado === 'EMITIDO' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{c.estado}</span>
                        </div>
                        <h3 className="text-base font-semibold text-slate-900">{c.clienteNome}</h3>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-xs text-slate-400">Venda</p>
                          <p className="text-sm font-semibold text-slate-700">{fmt(c.totalVenda)}</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-xs text-slate-400">Custos</p>
                          <p className="text-sm font-semibold text-slate-700">{fmt(res.totalCustos)}</p>
                        </div>
                        {margem !== null && (
                          <div className="col-span-2 rounded-xl bg-slate-50 px-3 py-2">
                            <p className="text-xs text-slate-400">Margem estimada</p>
                            <p className={`text-sm font-semibold ${margem >= 0 ? 'text-green-600' : 'text-red-600'}`}>{margem.toFixed(1)}%</p>
                          </div>
                        )}
                        {res.numFaturasPendentes > 0 && (
                          <div className="col-span-2 flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-amber-400" />
                            <span className="text-xs text-amber-600">{res.numFaturasPendentes} fatura(s) pendente(s)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
