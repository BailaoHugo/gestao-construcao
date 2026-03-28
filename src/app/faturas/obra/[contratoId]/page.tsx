'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';

/* ── types ─────────────────────────────────────────────────────────────── */
interface Avanco {
  id: string;
  ordem: number;
  capitulo: string;
  descricao: string;
  valorContrato: number;
  percentagemAvanco: number;
  valorAvancado: number;
}

interface Custo {
  id: string;
  fornecedor: string;
  nifFornecedor: string | null;
  numeroFatura: string | null;
  dataFatura: string;
  descricao: string;
  valor: number;
  dataVencimento: string | null;
  tipo: string;
  notas: string | null;
}

interface Contrato {
  id: string;
  propostaCodigo: string;
  revisaoNumero: number;
  clienteNome: string;
  designacao: string | null;
  estado: string;
  totalVenda: number;
}

type Tab = 'avancos' | 'custos';

/* ── helpers ────────────────────────────────────────────────────────────── */
function fmt(n: number) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n);
}
function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-PT');
}
const TIPO_LABELS: Record<string, string> = {
  subempreitada: 'Subempreitada',
  material: 'Material',
  equipamento: 'Equipamento',
  outro: 'Outro',
};

/* ── empty form ─────────────────────────────────────────────────────────── */
const EMPTY_FORM = {
  fornecedor: '',
  nifFornecedor: '',
  numeroFatura: '',
  dataFatura: '',
  descricao: '',
  valor: '',
  dataVencimento: '',
  tipo: 'subempreitada',
  notas: '',
};

/* ════════════════════════════════════════════════════════════════════════ */
export default function AvancoObraPage() {
  const { contratoId } = useParams<{ contratoId: string }>();
  const [tab, setTab] = useState<Tab>('avancos');

  /* — contrato — */
  const [contrato, setContrato] = useState<Contrato | null>(null);

  /* — avanços — */
  const [avancos, setAvancos] = useState<Avanco[]>([]);
  const [loadingAvancos, setLoadingAvancos] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  /* — custos — */
  const [custos, setCustos] = useState<Custo[]>([]);
  const [loadingCustos, setLoadingCustos] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /* ── load contrato ───────────────────────────────────────────────────── */
  useEffect(() => {
    fetch(`/api/contratos/${contratoId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setContrato(d); })
      .catch(() => null);
  }, [contratoId]);

  /* ── load avanços ────────────────────────────────────────────────────── */
  const loadAvancos = useCallback(() => {
    setLoadingAvancos(true);
    fetch(`/api/contratos/${contratoId}/avancos`)
      .then(r => r.json())
      .then((data: Avanco[]) => {
        setAvancos(Array.isArray(data) ? data : []);
        const d: Record<string, string> = {};
        (Array.isArray(data) ? data : []).forEach((a: Avanco) => {
          d[a.id] = String(a.percentagemAvanco ?? 0);
        });
        setDrafts(d);
      })
      .finally(() => setLoadingAvancos(false));
  }, [contratoId]);

  useEffect(() => { loadAvancos(); }, [loadAvancos]);

  /* ── load custos ─────────────────────────────────────────────────────── */
  const loadCustos = useCallback(() => {
    setLoadingCustos(true);
    fetch(`/api/contratos/${contratoId}/custos`)
      .then(r => r.json())
      .then((data: Custo[]) => setCustos(Array.isArray(data) ? data : []))
      .finally(() => setLoadingCustos(false));
  }, [contratoId]);

  useEffect(() => {
    if (tab === 'custos') loadCustos();
  }, [tab, loadCustos]);

  /* ── save avanco ─────────────────────────────────────────────────────── */
  async function saveAvanco(id: string) {
    const pct = parseFloat(drafts[id] ?? '0');
    if (isNaN(pct) || pct < 0 || pct > 100) return;
    setSavingId(id);
    try {
      const res = await fetch(`/api/contratos/${contratoId}/avancos`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, percentagemAvanco: pct }),
      });
      if (res.ok) {
        const updated: Avanco = await res.json();
        setAvancos(prev => prev.map(a => (a.id === id ? updated : a)));
      }
    } finally {
      setSavingId(null);
    }
  }

  /* ── add custo ───────────────────────────────────────────────────────── */
  async function addCusto(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = {
        fornecedor: form.fornecedor,
        nifFornecedor: form.nifFornecedor || null,
        numeroFatura: form.numeroFatura || null,
        dataFatura: form.dataFatura,
        descricao: form.descricao,
        valor: parseFloat(form.valor),
        dataVencimento: form.dataVencimento || null,
        tipo: form.tipo,
        notas: form.notas || null,
      };
      const res = await fetch(`/api/contratos/${contratoId}/custos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const created: Custo = await res.json();
        setCustos(prev => [created, ...prev]);
        setForm({ ...EMPTY_FORM });
        setShowForm(false);
      }
    } finally {
      setSubmitting(false);
    }
  }

  /* ── delete custo ────────────────────────────────────────────────────── */
  async function deleteCusto(id: string) {
    if (!confirm('Eliminar este custo?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/contratos/${contratoId}/custos/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) setCustos(prev => prev.filter(c => c.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  /* ── totals ──────────────────────────────────────────────────────────── */
  const totalContrato = contrato?.totalVenda ?? 0;
  const totalAvancado = avancos.reduce((s, a) => s + (a.valorAvancado ?? 0), 0);
  const totalCustos   = custos.reduce((s, c) => s + Number(c.valor), 0);
  const margem        = totalContrato > 0
    ? ((totalContrato - totalCustos) / totalContrato) * 100
    : null;

  /* ════════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <a className="text-gray-400 hover:text-gray-600 text-sm" href="/faturas">
              &#8592; Faturação
            </a>
            <span className="text-gray-300">|</span>
            <h1 className="text-xl font-semibold text-gray-800">Controlo de Obra</h1>
          </div>
          {contrato && (
            <div className="text-right">
              <p className="text-sm font-medium text-gray-700">{contrato.clienteNome}</p>
              <p className="text-xs text-gray-400">{contrato.propostaCodigo} · Rev.{contrato.revisaoNumero}</p>
            </div>
          )}
        </div>

        {/* tabs */}
        <div className="max-w-6xl mx-auto px-6 flex gap-0 border-t border-gray-100">
          {([['avancos', 'Avanço de Obra'], ['custos', 'Custos']] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-6">

        {/* ── AVANÇOS TAB ──────────────────────────────────────────────── */}
        {tab === 'avancos' && (
          <>
            {/* summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-xs text-gray-400 mb-1">Valor Contrato</p>
                <p className="text-lg font-semibold text-gray-800">{fmt(totalContrato)}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-xs text-gray-400 mb-1">Avançado</p>
                <p className="text-lg font-semibold text-blue-700">{fmt(totalAvancado)}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-xs text-gray-400 mb-1">Custos Registados</p>
                <p className="text-lg font-semibold text-orange-600">{fmt(totalCustos)}</p>
              </div>
              {margem !== null && (
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="text-xs text-gray-400 mb-1">Margem Estimada</p>
                  <p className={`text-lg font-semibold ${margem >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {margem.toFixed(1)}%
                  </p>
                </div>
              )}
            </div>

            {/* avanços table */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-800">Itens de Obra</h2>
                <p className="text-xs text-gray-400 mt-0.5">Registe a percentagem de avanço por item</p>
              </div>
              {loadingAvancos ? (
                <div className="px-6 py-10 text-sm text-gray-400 text-center">A carregar...</div>
              ) : avancos.length === 0 ? (
                <div className="px-6 py-10 text-sm text-gray-400 text-center">Sem itens de obra disponíveis.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 w-12">#</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Descrição</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Valor</th>
                        <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 w-28">% Avanço</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Valor Avançado</th>
                        <th className="px-4 py-3 w-16"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {avancos.map(a => (
                        <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 text-gray-400 text-xs">{a.ordem}</td>
                          <td className="px-4 py-3">
                            {a.capitulo && (
                              <span className="inline-block text-xs bg-gray-100 text-gray-500 rounded px-1.5 py-0.5 mr-1.5 font-mono">
                                {a.capitulo}
                              </span>
                            )}
                            <span className="text-gray-800">{a.descricao}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600 tabular-nums">
                            {fmt(a.valorContrato)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 justify-center">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step={1}
                                value={drafts[a.id] ?? ''}
                                onChange={e => setDrafts(p => ({ ...p, [a.id]: e.target.value }))}
                                onBlur={() => saveAvanco(a.id)}
                                onKeyDown={e => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }}
                                className="w-16 text-center border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 tabular-nums"
                              />
                              <span className="text-gray-400 text-xs">%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            <span className={`font-medium ${a.valorAvancado > 0 ? 'text-blue-700' : 'text-gray-400'}`}>
                              {fmt(a.valorAvancado ?? 0)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {savingId === a.id && (
                              <span className="text-xs text-blue-400 animate-pulse">...</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 border-t-2 border-gray-200">
                        <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-gray-700">Total</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-700 tabular-nums">
                          {fmt(avancos.reduce((s, a) => s + a.valorContrato, 0))}
                        </td>
                        <td></td>
                        <td className="px-4 py-3 text-right font-semibold text-blue-700 tabular-nums">
                          {fmt(totalAvancado)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── CUSTOS TAB ───────────────────────────────────────────────── */}
        {tab === 'custos' && (
          <>
            {/* summary strip */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-xs text-gray-400 mb-1">Total Custos</p>
                <p className="text-lg font-semibold text-orange-600">{fmt(totalCustos)}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-200">
                <p className="text-xs text-gray-400 mb-1">Valor Contrato</p>
                <p className="text-lg font-semibold text-gray-700">{fmt(totalContrato)}</p>
              </div>
              {margem !== null && (
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                  <p className="text-xs text-gray-400 mb-1">Margem Estimada</p>
                  <p className={`text-lg font-semibold ${margem >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {margem.toFixed(1)}%
                  </p>
                </div>
              )}
            </div>

            {/* list + add button */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-800">Faturas de Subempreiteiros</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{custos.length} registo{custos.length !== 1 ? 's' : ''}</p>
                </div>
                <button
                  onClick={() => setShowForm(f => !f)}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  <span>+</span> Nova fatura
                </button>
              </div>

              {/* add form */}
              {showForm && (
                <div className="px-6 py-5 border-b border-blue-50 bg-blue-50/40">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Registar nova fatura</h3>
                  <form onSubmit={addCusto} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Fornecedor *</label>
                      <input
                        required
                        value={form.fornecedor}
                        onChange={e => setForm(p => ({ ...p, fornecedor: e.target.value }))}
                        placeholder="Ex: Serralharia Artística de Marques &amp; Pereira"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">NIF Fornecedor</label>
                      <input
                        value={form.nifFornecedor}
                        onChange={e => setForm(p => ({ ...p, nifFornecedor: e.target.value }))}
                        placeholder="Ex: 503698580"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">N.º Fatura</label>
                      <input
                        value={form.numeroFatura}
                        onChange={e => setForm(p => ({ ...p, numeroFatura: e.target.value }))}
                        placeholder="Ex: FT 2026A21/157"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Data Fatura *</label>
                      <input
                        required
                        type="date"
                        value={form.dataFatura}
                        onChange={e => setForm(p => ({ ...p, dataFatura: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Descrição *</label>
                      <input
                        required
                        value={form.descricao}
                        onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
                        placeholder="Ex: Fornecimento e aplicação de caixilharia em alumínio série 40T"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Valor (€) *</label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.valor}
                        onChange={e => setForm(p => ({ ...p, valor: e.target.value }))}
                        placeholder="0.00"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                      <select
                        value={form.tipo}
                        onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                      >
                        <option value="subempreitada">Subempreitada</option>
                        <option value="material">Material</option>
                        <option value="equipamento">Equipamento</option>
                        <option value="outro">Outro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Data Vencimento</label>
                      <input
                        type="date"
                        value={form.dataVencimento}
                        onChange={e => setForm(p => ({ ...p, dataVencimento: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
                      <input
                        value={form.notas}
                        onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
                        placeholder="Observações..."
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <div className="md:col-span-2 flex gap-3 justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => { setShowForm(false); setForm({ ...EMPTY_FORM }); }}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        {submitting ? 'A guardar...' : 'Guardar'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* custos list */}
              {loadingCustos ? (
                <div className="px-6 py-10 text-sm text-gray-400 text-center">A carregar...</div>
              ) : custos.length === 0 && !showForm ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-gray-400 text-sm mb-1">Sem custos registados</p>
                  <p className="text-gray-300 text-xs">Clique em &ldquo;Nova fatura&rdquo; para registar faturas de subempreiteiros</p>
                </div>
              ) : custos.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Fornecedor</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">N.º Fatura</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Data</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Descrição</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Tipo</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Valor</th>
                        <th className="px-4 py-3 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {custos.map(c => (
                        <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-800">{c.fornecedor}</p>
                            {c.nifFornecedor && (
                              <p className="text-xs text-gray-400">NIF {c.nifFornecedor}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                            {c.numeroFatura ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                            {fmtDate(c.dataFatura)}
                            {c.dataVencimento && (
                              <p className="text-xs text-amber-500">Vence {fmtDate(c.dataVencimento)}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-700 max-w-xs">
                            <p className="truncate">{c.descricao}</p>
                            {c.notas && <p className="text-xs text-gray-400 truncate">{c.notas}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                              {TIPO_LABELS[c.tipo] ?? c.tipo}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-800 tabular-nums whitespace-nowrap">
                            {fmt(Number(c.valor))}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => deleteCusto(c.id)}
                              disabled={deletingId === c.id}
                              className="text-gray-300 hover:text-red-400 disabled:opacity-50 transition-colors text-lg leading-none"
                              title="Eliminar"
                            >
                              &#215;
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 border-t-2 border-gray-200">
                        <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-gray-700">Total</td>
                        <td className="px-4 py-3 text-right font-semibold text-orange-600 tabular-nums">
                          {fmt(totalCustos)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
