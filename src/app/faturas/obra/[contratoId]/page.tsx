'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

interface ContratoInfo {
  id: string;
  propostaCodigo: string;
  clienteNome: string;
  totalVenda: number;
}

interface Avanco {
  id: string;
  ordem: number;
  capitulo: string;
  descricao: string;
  valorContrato: number;
  percentagemFaturada: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n);
}

export default function AvancoObraPage() {
  const { contratoId } = useParams<{ contratoId: string }>();
  const router = useRouter();

  const [contrato, setContrato] = useState<ContratoInfo | null>(null);
  const [avancos, setAvancos] = useState<Avanco[]>([]);
  const [percentagens, setPercentagens] = useState<Record<string, string>>({});
  const [taxaIva, setTaxaIva] = useState('0');
  const [notas, setNotas] = useState('IVA \u2013 autoliquidação \u2013 Artigo 2.º n.º 1 alínea j) do CIVA');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!contratoId) return;
    setLoading(true);
    try {
      const [c, av] = await Promise.all([
        fetch(`/api/contratos/${contratoId}`).then(r => r.json()),
        fetch(`/api/contratos/${contratoId}/avancos`).then(r => r.json()),
      ]);
      setContrato(c);
      const list: Avanco[] = Array.isArray(av) ? av : [];
      setAvancos(list);
      const pcts: Record<string, string> = {};
      for (const a of list) pcts[a.id] = String(a.percentagemFaturada);
      setPercentagens(pcts);
    } catch {
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [contratoId]);

  useEffect(() => { loadData(); }, [loadData]);

  const totalFaturar = avancos.reduce((sum, a) => {
    const pAtual = parseFloat(percentagens[a.id] ?? '0') || 0;
    const delta = Math.max(0, pAtual - a.percentagemFaturada);
    return sum + (a.valorContrato * delta) / 100;
  }, 0);

  async function handleGuardar() {
    setSaving(true); setError(null); setSuccess(null);
    try {
      const items = avancos.map(a => ({
        id: a.id,
        percentagemFaturada: parseFloat(percentagens[a.id] ?? '0') || 0,
      }));
      const r = await fetch(`/api/contratos/${contratoId}/avancos`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? 'Erro ao guardar');
      setSuccess('Progresso guardado.');
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao guardar');
    } finally { setSaving(false); }
  }

  async function handleCriarAuto() {
    setCreating(true); setError(null); setSuccess(null);
    try {
      const percentagensInput = avancos.map(a => ({
        id: a.id,
        percentagemAtual: parseFloat(percentagens[a.id] ?? '0') || 0,
      }));
      const r = await fetch(`/api/contratos/${contratoId}/avancos/criar-auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taxaIva: parseFloat(taxaIva) || 0,
          notas,
          percentagens: percentagensInput,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? 'Erro ao criar auto');
      setSuccess(`Auto de Medição ${data.numero} criado!`);
      setTimeout(() => router.push(`/faturas/${data.id}`), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar auto');
    } finally { setCreating(false); }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Link href="/faturas" className="text-gray-400 hover:text-gray-600 text-sm">← Faturação</Link>
            <span className="text-gray-300">|</span>
            <h1 className="text-xl font-semibold text-gray-800">Avanço de Obra</h1>
            {contrato && (
              <>
                <span className="text-gray-300">|</span>
                <span className="text-sm text-gray-500">{contrato.propostaCodigo} — {contrato.clienteNome}</span>
              </>
            )}
          </div>
          {contrato && (
            <span className="text-sm text-gray-500">
              Total contrato: <strong className="text-gray-800">{fmt(contrato.totalVenda)}</strong>
            </span>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-6">
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-sm">{success}</div>}

        {loading && <div className="text-center py-20 text-gray-400">A carregar...</div>}

        {!loading && avancos.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            Sem artigos para este contrato. Verifique se a proposta tem linhas definidas.
          </div>
        )}

        {!loading && avancos.length > 0 && (
          <>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">Artigos da Obra</h2>
                <span className="text-sm text-gray-500">
                  A faturar neste auto:{' '}
                  <strong className="text-blue-700">{fmt(totalFaturar)}</strong>
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-5 py-3 font-medium text-gray-500">Descrição</th>
                      <th className="text-right px-5 py-3 font-medium text-gray-500">Valor Contrato</th>
                      <th className="text-right px-5 py-3 font-medium text-gray-500">% Anterior</th>
                      <th className="text-right px-5 py-3 font-medium text-gray-500 w-36">% Atual</th>
                      <th className="text-right px-5 py-3 font-medium text-gray-500">A Faturar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {avancos.map(a => {
                      const pAtual = parseFloat(percentagens[a.id] ?? '0') || 0;
                      const delta = Math.max(0, pAtual - a.percentagemFaturada);
                      const valorFaturar = (a.valorContrato * delta) / 100;
                      return (
                        <tr key={a.id} className={`hover:bg-gray-50 transition-colors ${delta > 0 ? 'bg-blue-50/40' : ''}`}>
                          <td className="px-5 py-3 text-gray-800">
                            {a.capitulo && <span className="text-xs text-gray-400 mr-2 font-mono">{a.capitulo}</span>}
                            {a.descricao}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-gray-700">{fmt(a.valorContrato)}</td>
                          <td className="px-5 py-3 text-right text-gray-400">{a.percentagemFaturada.toFixed(1)}%</td>
                          <td className="px-5 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number"
                                min={a.percentagemFaturada}
                                max={100}
                                step={0.5}
                                value={percentagens[a.id] ?? '0'}
                                onChange={e => setPercentagens(prev => ({ ...prev, [a.id]: e.target.value }))}
                                className="w-20 text-right border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                              />
                              <span className="text-gray-400 text-xs">%</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right font-medium">
                            {delta > 0 ? (
                              <span className="text-blue-700">{fmt(valorFaturar)}</span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td colSpan={4} className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Total a Faturar</td>
                      <td className="px-5 py-3 text-right text-base font-bold text-blue-700">{fmt(totalFaturar)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-800 mb-4">Emitir Auto de Medição</h2>
              <div className="flex flex-col gap-4">
                <div className="flex gap-4 items-end flex-wrap">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Taxa IVA (%)</label>
                    <input
                      type="number" min={0} max={100} step={1} value={taxaIva}
                      onChange={e => setTaxaIva(e.target.value)}
                      className="w-24 border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <div className="flex-1 min-w-64">
                    <label className="block text-xs text-gray-500 mb-1">Notas</label>
                    <input
                      type="text" value={notas} onChange={e => setNotas(e.target.value)}
                      className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>
                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={handleGuardar} disabled={saving}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'A guardar...' : 'Guardar Progresso'}
                  </button>
                  <button
                    onClick={handleCriarAuto} disabled={creating || totalFaturar === 0}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {creating ? 'A criar...' : `Criar Auto de Medição (${fmt(totalFaturar)})`}
                  </button>
                </div>
                {totalFaturar === 0 && (
                  <p className="text-xs text-gray-400">Ajuste as % acima para calcular o valor a faturar.</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
