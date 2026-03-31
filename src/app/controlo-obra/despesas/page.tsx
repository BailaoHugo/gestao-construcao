'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

interface Despesa {
  id: string;
  document_no: string | nul;
  document_type: string | null;
  status: number | null;
  date: string | null
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
  centro_custo: string | null;
  arquivo_url: string | null;
  arquivo_nome: string | null;
  origem: string | null;
}

function fmt(n: number | null | undefined) {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(Number(n));
}
function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-PT');
}

const STATUS_LABELS: Record<number, string> = { 0: 'Importada', 1: 'Rascunho', 2: 'Pendente', 3: 'Finalizada' };
const DOC_TYPE_LABELS: Record<string, string> = {
  FC: 'Fatura Compra', DSP: 'Despesa', NC: 'Nota Crédito', ND: 'Nota Débito',
};

export default function DespesasPage() {
  const [list, setList] = useState<Despesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('2026-01-01');
  const [endDate, setEndDate] = useState('2026-12-31');
  const [filterFornec, setFilterFornec] = useState('');
  const [filterOrigem, setFilterOrigem] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [upFile, setUpFile] = useState<File | null>(null);
  const [upFornec, setUpFornec] = useState('');
  const [upCentro, setUpCentro] = useState('');
  const [upValor, setUpValor] = useState('');
  const [upData, setUpData] = useState(new Date().toISOString().slice(0, 10));

  const load = () => {
    setLoading(true);
    fetch('/api/despesas?start=' + startDate + '&end=' + endDate)
      .then(r => r.json())
      .then(d => setList(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [startDate, endDate]);

  const handleSync = async () => {
    setSyncing(true); setSyncMsg(null);
    try {
      const r = await fetch('/api/despesas/sync', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ startDate, endDate }),
      });
      const d = await r.json();
      setSyncMsg(d.ok ? '✓ Sincronizado: ' + d.upserted + ' documentos' : 'Erro: ' + d.error);
      if (d.ok) load();
    } finally { setSyncing(false); }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upFile) return;
    setUploading(true); setUploadMsg(null);
    try {
      const form = new FormData();
      form.append('file', upFile);
      form.append('fornecedor', upFornec);
      form.append('centro_custo', upCentro);
      form.append('valor', upValor);
      form.append('data', upData);
      const r = await fetch('/api/despesas/upload', { method: 'POST', body: form });
      const d = await r.json();
      if (d.ok) {
        setUploadMsg('✓ Fatura enviada e guardada.');
        setUpFile(null); setUpFornec(''); setUpCentro(''); setUpValor('');
        load();
      } else {
        setUploadMsg('Erro: ' + d.error);
      }
    } finally { setUploading(false); }
  };

  const filtered = list.filter(d => {
    if (filterFornec && !(d.supplier_business_name ?? '').toLowerCase().includes(filterFornec.toLowerCase())) return false;
    if (filterOrigem && d.origem !== filterOrigem) return false;
    return true;
  });

  const totalGross   = filtered.reduce((s, d) => s + (Number(d.gross_total)   || 0), 0);
  const totalNet     = filtered.reduce((s, d) => s + (Number(d.net_total)     || 0), 0);
  const totalVat     = filtered.reduce((s, d) => s + (Number(d.tax_payable)   || 0), 0);
  const totalPending = filtered.reduce((s, d) => s + (Number(d.pending_total) || 0), 0);

  return (
    <div className="min-h-screen bg-surface px-4 py-6 text-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">

        {/* Header */}
        <header className="no-print flex items-center justify-between rounded-xl bg-white/80 px-6 py-4 shadow-sm ring-1 ring-slate-100">
          <div className="text-sm font-semibold tracking-wide text-slate-800">Gestão Construção</div>
          <Link href="/controlo-obra" className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">
            ← Controlo de Obra
          </Link>
        </header>

        <main className="rounded-2xl bg-white/80 p-8 shadow-sm ring-1 ring-slate-100">

          {/* Title + actions */}
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Despesas</h1>
              <p className="mt-1 text-sm text-slate-500">Documentos de compra — TOConline + upload manual</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-slate-500">De</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-slate-500">Até</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </div>
              <button onClick={() => setShowUpload(true)}
                className="rounded-full bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-500 transition">
                + Adicionar fatura
              </button>
              <button onClick={handleSync} disabled={syncing}
                className="rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50 transition">
                {syncing ? 'A sincronizar...' : '↻ Sincronizar TOConline'}
              </button>
            </div>
          </div>

          {/* Sync message */}
          {syncMsg && (
            <div className={'mb-4 rounded-xl px-4 py-3 text-sm ' + (syncMsg.startsWith('Erro') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700')}>
              {syncMsg}
            </div>
          )}

          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input type="text" placeholder="Filtrar fornecedor..." value={filterFornec}
              onChange={e => setFilterFornec(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-300 w-48" />
            <select value={filterOrigem} onChange={e => setFilterOrigem(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-300">
              <option value="">Todas as origens</option>
              <option value="toconline">TOConline</option>
              <option value="manual">Manual</option>
            </select>
            {(filterFornec || filterOrigem) && (
              <button onClick={() => { setFilterFornec(''); setFilterOrigem(''); }}
                className="text-xs text-slate-400 hover:text-slate-700">× Limpar filtros</button>
            )}
          </div>

          {/* KPI cards */}
          {filtered.length > 0 && (
            <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { label: 'Total (c/ IVA)', value: totalGross,   color: 'text-slate-900' },
                { label: 'Sem IVA',        value: totalNet,     color: 'text-slate-700' },
                { label: 'IVA',            value: totalVat,     color: 'text-slate-500' },
                { label: 'Por pagar',      value: totalPending, color: totalPending > 0 ? 'text-amber-600' : 'text-slate-400' },
              ].map(c => (
                <div key={c.label} className="rounded-xl bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-400">{c.label}</p>
                  <p className={'text-sm font-semibold ' + c.color}>{fmt(c.value)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Table */}
          {loading ? (
            <p className="text-sm text-slate-400">A carregar...</p>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl bg-slate-50 px-6 py-10 text-center">
              <p className="text-sm text-slate-500">Sem despesas para o período selecionado.</p>
              <p className="mt-2 text-xs text-slate-400">Use &ldquo;↻ Sincronizar TOConline&rdquo; ou &ldquo;+ Adicionar fatura&rdquo;.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="pb-3 text-left text-xs font-medium text-slate-400 pr-3">Data</th>
                    <th className="pb-3 text-left text-xs font-medium text-slate-400 pr-3">Documento</th>
                    <th className="pb-3 text-left text-xs font-medium text-slate-400 pr-3">Tipo</th>
                    <th className="pb-3 text-left text-xs font-medium text-slate-400 pr-3">Fornecedor</th>
                    <th className="pb-3 text-left text-xs font-medium text-slate-400 pr-3">Centro Custo</th>
                    <th className="pb-3 text-right text-xs font-medium text-slate-400 pr-3">Sem IVA</th>
                    <th className="pb-3 text-right text-xs font-medium text-slate-400 pr-2">Total</th>
                    <th className="pb-3 text-center text-xs font-medium text-slate-400">Estado</th>
                    <th className="pb-3 text-center text-xs font-medium text-slate-400 pr-2">Origem</th>
                    <th className="pb-3 text-center text-xs font-medium text-slate-400 pl-3">Anexo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map(d => (
                    <tr key={d.id ?? ((d.supplier_business_name ?? '') + d.date)} className="hover:bg-slate-50/60 transition">
                      <td className="py-2.5 pr-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(d.date)}</td>
                      <td className="py-2.5 pr-3">
                        <div className="text-xs font-medium text-slate-800">{d.document_no ?? '—'}</div>
                        {d.external_reference && <div className="text-xs text-slate-400">{d.external_reference}</div>}
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-slate-500 whitespace-nowrap">
                        {DOC_TYPE_LABELS[d.document_type ?? ''] ?? d.document_type ?? '—'}
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="text-xs text-slate-700">{d.supplier_business_name ?? '—'}</div>
                        {d.supplier_tax_registration_number && <div className="text-xs text-slate-400">NIF {d.supplier_tax_registration_number}</div>}
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-slate-500 whitespace-nowrap">{d.centro_custo ?? '—'}</td>
                      <td className="py-2.5 pr-3 text-right text-xs text-slate-600 whitespace-nowrap">{fmt(d.net_total)}</td>
                      <td className="py-2.5 pr-2 text-right text-xs font-semibold text-slate-900 whitespace-nowrap">{fmt(d.gross_total)}</td>
                      <td className="py-2.5 text-center">
                        <span className={'rounded-full px-2 py-0.5 text-xs font-medium ' + (
                          d.status === 3 ? 'bg-green-50 text-green-700' :
                          d.status === 2 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                        )}>
                          {STATUS_LABELS[d.status ?? 0] ?? String(d.status ?? '—')}
                        </span>
                      </td>
                      <td className="py-2.5 pr-2 text-center">
                        <span className={'rounded-full px-2 py-0.5 text-xs ' + (d.origem === 'manual' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400')}>
                          {d.origem === 'manual' ? 'Manual' : 'TOC'}
                        </span>
                      </td>
                      <td className="py-2.5 pl-3 text-center">
                        {d.arquivo_url ? (
                          <a href={d.arquivo_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-600 hover:bg-blue-100 transition"
                            title={d.arquivo_nome ?? 'Abrir ficheiro'}>
                            📄 Abrir
                          </a>
                        ) : d.id && d.status && d.status > 0 ? (
                          <a href={'/api/despesas/' + d.id + '/pdf'} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition"
                            title="Abrir fatura PDF">
                            📄 Ver
                          </a>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-4 text-right text-xs text-slate-400">{filtered.length} documento(s)</p>
            </div>
          )}
        </main>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={e => { if (e.target === e.currentTarget) setShowUpload(false); }}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Adicionar fatura manual</h2>
              <button onClick={() => setShowUpload(false)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
            </div>

            {uploadMsg && (
              <div className={'mb-4 rounded-xl px-4 py-2.5 text-sm ' + (uploadMsg.startsWith('Erro') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700')}>
                {uploadMsg}
              </div>
            )}

            <form onSubmit={handleUpload} className="flex flex-col gap-3">
              {/* Drag & Drop zone */}
              <div
                className={'rounded-xl border-2 border-dashed px-4 py-6 text-center cursor-pointer transition ' + (dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300')}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) setUpFile(f); }}
                onClick={() => fileRef.current?.click()}>
                <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) setUpFile(f); }} />
                {upFile ? (
                  <p className="text-xs text-slate-700">📄 {upFile.name}</p>
                ) : (
                  <>
                    <p className="text-sm text-slate-500">Arraste a fatura ou clique para selecionar</p>
                    <p className="mt-1 text-xs text-slate-400">PDF, JPG ou PNG</p>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-500">Fornecedor</label>
                  <input type="text" value={upFornec} onChange={e => setUpFornec(e.target.value)}
                    placeholder="Nome do fornecedor"
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-500">Centro de Custo</label>
                  <input type="text" value={upCentro} onChange={e => setUpCentro(e.target.value)}
                    placeholder="Ex: Obra Lisboa"
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-500">Valor (EUR)</label>
                  <input type="number" step="0.01" value={upValor} onChange={e => setUpValor(e.target.value)}
                    placeholder="0.00"
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-500">Data</label>
                  <input type="date" value={upData} onChange={e => setUpData(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
              </div>

              <div className="mt-1 flex gap-2 justify-end">
                <button type="button" onClick={() => setShowUpload(false)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs text-slate-600 hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" disabled={!upFile || uploading}
                  className="rounded-full bg-blue-600 px-5 py-2 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition">
                  {uploading ? 'A enviar...' : 'Enviar fatura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
