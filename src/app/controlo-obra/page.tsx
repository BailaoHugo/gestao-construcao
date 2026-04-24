'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Obra {
  id: string;
  code: string;
  nome: string;
}

interface ObraStats {
  id: string;
  code: string;
  nome: string;
  total_sem_iva: number;
  total_com_iva: number;
  num_faturas: number;
  num_fornecedores: number;
}

interface FornecedorStat {
  fornecedor: string;
  fornecedor_key: string;
  total_sem_iva: number;
  num_faturas: number;
}

interface Despesa {
  id: number;
  data_despesa: string;
  fornecedor: string;
  numero_fatura: string;
  valor_sem_iva: number;
  valor_total_civa: number;
  tipo: string;
  nome_ficheiro: string;
  documento_ref: string;
}

export default function ControloObra() {
  const [obras, setObras] = useState<ObraStats[]>([]);
  const [selectedObra, setSelectedObra] = useState<ObraStats | null>(null);
  const [fornecedores, setFornecedores] = useState<FornecedorStat[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [selectedForn, setSelectedForn] = useState<string | null>(null);
  const [fornExpanded, setFornExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('2026-01-01');
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));

  const loadObras = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/controlo-obra/stats?from=${dateFrom}&to=${dateTo}`);
      const d = await r.json();
      setObras(d.obras || []);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { loadObras(); }, [loadObras]);

  const loadObraDetail = async (obra: ObraStats) => {
    setSelectedObra(obra);
    setSelectedForn(null);
    const r = await fetch(`/api/controlo-obra/detail?obra_id=${obra.id}&from=${dateFrom}&to=${dateTo}`);
    const d = await r.json();
    setFornecedores(d.fornecedores || []);
    setDespesas(d.despesas || []);
  };

  const filt = selectedForn
    ? despesas.filter(d => d.fornecedor &&
        d.fornecedor.toUpperCase().replace(/[^A-Za-z0-9 ]/g,'').trim() === selectedForn)
    : despesas;
  const totalFilt = filt.reduce((s, d) => s + (d.valor_sem_iva || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 pb-12">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link href="/despesas" className="text-sm text-gray-500 hover:text-gray-700">← Despesas</Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Controlo de Obra</h1>
            <p className="text-sm text-gray-500">Totais de custos por obra e fornecedor</p>
          </div>
          <div className="flex gap-2 items-center">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border rounded px-3 py-1.5 text-sm" />
            <span className="text-gray-400">→</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border rounded px-3 py-1.5 text-sm" />
            <button onClick={loadObras} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm font-medium">Actualizar</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Lista de Obras */}
          <div className="lg:col-span-1">
            <div className="bg-white border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50">
                <h2 className="text-sm font-semibold text-gray-700">Obras / Centros de Custo</h2>
              </div>
              {loading ? (
                <div className="p-8 text-center text-gray-400 text-sm">A carregar...</div>
              ) : (
                <ul className="divide-y">
                  {obras.map(obra => (
                    <li key={obra.id}
                      onClick={() => loadObraDetail(obra)}
                      className={`px-4 py-3 cursor-pointer hover:bg-blue-50 transition-colors ${selectedObra?.id === obra.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{obra.code}</p>
                          <p className="text-xs text-gray-500 truncate max-w-[160px]">{obra.nome}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">{obra.total_sem_iva.toLocaleString('pt-PT', {minimumFractionDigits:2})} €</p>
                          <p className="text-xs text-gray-400">{obra.num_faturas} fat.</p>
                        </div>
                      </div>
                    </li>
                  ))}
                  {obras.length === 0 && <li className="p-6 text-center text-gray-400 text-sm">Sem dados no período</li>}
                </ul>
              )}
            </div>
          </div>

          {/* Detalhe */}
          <div className="lg:col-span-2 space-y-4">
            {!selectedObra ? (
              <div className="bg-white border rounded-xl p-12 text-center text-gray-400">
                <p className="text-3xl mb-3">📊</p>
                <p className="text-sm">Selecciona uma obra para ver o detalhe</p>
              </div>
            ) : (
              <>
                {/* Header obra seleccionada */}
                <div className="bg-white border rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{selectedObra.code} — {selectedObra.nome}</h2>
                      <p className="text-sm text-gray-500">{selectedObra.num_faturas} faturas · {selectedObra.num_fornecedores} fornecedores</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-700">{selectedObra.total_sem_iva.toLocaleString('pt-PT', {minimumFractionDigits:2})} €</p>
                      <p className="text-xs text-gray-400">s/ IVA · c/ IVA: {selectedObra.total_com_iva.toLocaleString('pt-PT', {minimumFractionDigits:2})} €</p>
                    </div>
                  </div>
                </div>

                {/* Por fornecedor */}
                <div className="bg-white border rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">Por Fornecedor</h3>
                    <div className="flex gap-3 items-center">
                      {selectedForn && <button onClick={() => setSelectedForn(null)} className="text-xs text-blue-600 hover:underline">ver todos</button>}
                      <button onClick={() => setFornExpanded(e => !e)} className="text-xs text-gray-500 hover:text-gray-700">{fornExpanded ? '▲ recolher' : '▼ expandir'}</button>
                    </div>
                  </div>
                  <div className={`divide-y overflow-y-auto transition-all ${fornExpanded ? 'max-h-[500px]' : 'max-h-48'}`}>
                    {fornecedores.map(f => {
                      const pct = selectedObra.total_sem_iva > 0 ? (f.total_sem_iva / selectedObra.total_sem_iva * 100) : 0;
                      return (
                        <div key={f.fornecedor}
                          onClick={() => setSelectedForn(f.fornecedor_key === selectedForn ? null : f.fornecedor_key)}
                          className={`px-4 py-2 cursor-pointer hover:bg-gray-50 ${selectedForn === f.fornecedor_key ? 'bg-blue-50' : ''}`}>
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <div className="flex justify-between items-center mb-0.5">
                                <span className="text-sm text-gray-800 font-medium truncate max-w-[200px]">{f.fornecedor || '—'}</span>
                                <span className="text-sm font-semibold text-gray-900 shrink-0">{f.total_sem_iva.toLocaleString('pt-PT', {minimumFractionDigits:2})} €</span>
                              </div>
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-400 rounded-full" style={{width: `${pct}%`}} />
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5">{pct.toFixed(1)}% · {f.num_faturas} fat.</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Listagem de despesas */}
                <div className="bg-white border rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">
                      {selectedForn ? `Faturas — ${selectedForn}` : 'Todas as faturas'}
                    </h3>
                    <span className="text-sm font-semibold text-gray-700">{totalFilt.toLocaleString('pt-PT', {minimumFractionDigits:2})} €</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 text-gray-500">
                        <tr>
                          <th className="text-left px-3 py-2">Data</th>
                          <th className="text-left px-3 py-2">Fornecedor</th>
                          <th className="text-left px-3 py-2">Nº Fatura</th>
                          <th className="text-left px-3 py-2">Ficheiro</th>
                          <th className="text-right px-3 py-2">S/ IVA</th>
                          <th className="text-right px-3 py-2">C/ IVA</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filt.map(d => (
                          <tr key={d.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-600">{d.data_despesa?.slice(0,10)}</td>
                            <td className="px-3 py-2 font-medium text-gray-900 max-w-[140px] truncate">{d.fornecedor || '—'}</td>
                            <td className="px-3 py-2 text-gray-600">{d.numero_fatura || '—'}</td>
                            <td className="px-3 py-2">
                              {d.documento_ref ? (
                                <a href={`/api/despesas/documento/${d.id}`} target="_blank" className="text-blue-600 hover:underline truncate block max-w-[160px]">
                                  {d.nome_ficheiro || '📎'}
                                </a>
                              ) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-3 py-2 text-right font-medium">{d.valor_sem_iva?.toLocaleString('pt-PT', {minimumFractionDigits:2})} €</td>
                            <td className="px-3 py-2 text-right text-gray-500">{d.valor_total_civa?.toLocaleString('pt-PT', {minimumFractionDigits:2})} €</td>
                          </tr>
                        ))}
                        {filt.length === 0 && (
                          <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">Sem faturas</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
