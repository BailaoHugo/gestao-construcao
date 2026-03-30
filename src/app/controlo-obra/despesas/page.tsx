'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Despesa {
  id: string;
  document_no: string | null;
  document_type: string | null;
  status: number | null;
  date: string | null;
  due_date: string | null;
  gross_total: number | null;
  net_total: number | null;
  tax_payable: number | null;
  pending_total: number | null;
  supplier_business_name: string | null;
  supplier_tax_registration_number: string | null;
  external_reference: string | null;
  notes: string | null;
  currency_iso_code: string | null;
  synced_at: string | null;
}

function fmt(n: number | null | undefined) {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(Number(n));
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-PT');
}

const STATUS_LABELS: Record<number, string> = {
  1: 'Rascunho',
  2: 'Pendente',
  3: 'Finalizada',
};

const DOC_TYPE_LABELS: Record<string, string> = {
  FC: 'Fatura Compra',
  DSP: 'Despesa',
  NC: 'Nota Crédito',
  ND: 'Nota Débito',
};

export default function DespesasPage() {
  const [list, setList] = useState<Despesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');

  const load = () => {
    setLoading(true);
    fetch(`/api/despesas?start=${startDate}&end=${endDate}`)
      .then(r => r.json())
      .then(d => setList(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [startDate, endDate]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const r = await fetch('/api/despesas/sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ startDate, endDate }),
      });
      const d = await r.json();
      setSyncMsg(d.ok ? `✓ Sincronizado: ${d.upserted} documentos importados` : `Erro: ${d.error}`);
      if (d.ok) load();
    } finally {
      setSyncing(false);
    }
  };

  const totalGross = list.reduce((s, d) => s + (Number(d.gross_total) || 0), 0);
  const totalNet = list.reduce((s, d) => s + (Number(d.net_total) || 0), 0);
  const totalVat = list.reduce((s, d) => s + (Number(d.tax_payable) || 0), 0);
  const totalPending = list.reduce((s, d) => s + (Number(d.pending_total) || 0), 0);

  return (
    <div className="min-h-screen bg-surface px-4 py-6 text-slate-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="no-print flex items-center justify-between rounded-xl bg-white/80 px-6 py-4 shadow-sm ring-1 ring-slate-100">
          <div className="text-sm font-semibold tracking-wide text-slate-800">Gestão Construção</div>
          <Link href="/controlo-obra" className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">
            ← Controlo de Obra
          </Link>
        </header>
        <main className="rounded-2xl bg-white/80 p-8 shadow-sm ring-1 ring-slate-100">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Despesas</h1>
              <p className="mt-1 text-sm text-slate-500">Documentos de compra sincronizados do TOConline</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500">De</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-500">Até</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </div>
              <button onClick={handleSync} disabled={syncing}
                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50 transition">
                {syncing ? 'A sincronizar...' : '↻ Sincronizar TOConline'}
              </button>
            </div>
          </div>
          {syncMsg && (
            <div className={`mb-4 rounded-xl px-4 py-3 text-sm ${syncMsg.startsWith('Erro') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {syncMsg}
            </div>
          )}
          {list.length > 0 && (
            <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { label: 'Total (c/ IVA)', value: totalGross, color: 'text-slate-900' },
                { label: 'Sem IVA', value: totalNet, color: 'text-slate-700' },
                { label: 'IVA', value: totalVat, color: 'text-slate-500' },
                { label: 'Por pagar', value: totalPending, color: totalPending > 0 ? 'text-amber-600' : 'text-slate-400' },
              ].map(card => (
                <div key={card.label} className="rounded-xl bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-400">{card.label}</p>
                  <p className={`text-sm font-semibold ${card.color}`}>{fmt(card.value)}</p>
                </div>
              ))}
            </div>
          )}
          {loading ? (
            <p className="text-sm text-slate-400">A carregar...</p>
          ) : list.length === 0 ? (
            <div className="rounded-xl bg-slate-50 px-6 py-10 text-center">
              <p className="text-sm text-slate-500">Sem despesas para o período selecionado.</p>
              <p className="mt-2 text-xs text-slate-400">
                Use &ldquo;↻ Sincronizar TOConline&rdquo; para importar os documentos de compra.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="pb-3 text-left text-xs font-medium text-slate-400 pr-4">Data</th>
                    <th className="pb-3 text-left text-xs font-medium text-slate-400 pr-4">Documento</th>
                    <th className="pb-3 text-left text-xs font-medium text-slate-400 pr-4">Tipo</th>
                    <th className="pb-3 text-left text-xs font-medium text-slate-400 pr-4">Fornecedor</th>
                    <th className="pb-3 text-right text-xs font-medium text-slate-400 pr-4">Sem IVA</th>
                    <th className="pb-3 text-right text-xs font-medium text-slate-400 pr-4">IVA</th>
                    <th className="pb-3 text-right text-xs font-medium text-slate-400 pr-2">Total</th>
                    <th className="pb-3 text-center text-xs font-medium text-slate-400">Estado</th>
                    <th className="pb-3 text-center text-xs font-medium text-slate-400 pl-4">Anexo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {list.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 pr-4 text-xs text-slate-500 whitespace-nowrap">{fmtDate(d.date)}</td>
                      <td className="py-3 pr-4">
                        <div className="text-xs font-medium text-slate-800">{d.document_no ?? '—'}</div>
                        {d.external_reference && (
                          <div className="text-xs text-slate-400">{d.external_reference}</div>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-xs text-slate-500 whitespace-nowrap">
                        {DOC_TYPE_LABELS[d.document_type ?? ''] ?? d.document_type ?? '—'}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="text-xs text-slate-700">{d.supplier_business_name ?? '—'}</div>
                        {d.supplier_tax_registration_number && (
                          <div className="text-xs text-slate-400">NIF {d.supplier_tax_registration_number}</div>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-right text-xs text-slate-600 whitespace-nowrap">{fmt(d.net_total)}</td>
                      <td className="py-3 pr-4 text-right text-xs text-slate-400 whitespace-nowrap">{fmt(d.tax_payable)}</td>
                      <td className="py-3 pr-2 text-right text-xs font-semibold text-slate-900 whitespace-nowrap">{fmt(d.gross_total)}</td>
                      <td className="py-3 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          d.status === 3 ? 'bg-green-50 text-green-700' :
                          d.status === 2 ? 'bg-amber-50 text-amber-600' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {STATUS_LABELS[d.status ?? 0] ?? String(d.status ?? '—')}
                        </span>
                      </td>
                      <td className="py-3 pl-4 text-center">
                        <a href={`/api/despesas/${d.id}/pdf`} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition"
                          title="Abrir fatura PDF">
                          📄 Ver
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-4 text-right text-xs text-slate-400">{list.length} documento(s)</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
