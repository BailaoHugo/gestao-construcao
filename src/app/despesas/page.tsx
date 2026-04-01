'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Despesa {
  id: number;
  fornecedor: string;
  nif: string;
  data_documento: string;
  valor_total: number;
  valor_sem_iva: number;
  taxa_iva: number;
  descricao: string;
  categoria: string;
  obra: string;
  notas: string;
  criado_em: string;
}

interface ListaResponse {
  items: Despesa[];
  total: number;
  soma_total: number;
  soma_sem_iva: number;
  page: number;
  pages: number;
}

const CATEGORIAS = [
  '', 'Material', 'Equipamento', 'Subcontratação', 'Mão de Obra',
  'Transporte', 'Serviços', 'Outros',
];

function fmt(val: number) {
  return (val ?? 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

export default function DespesasPage() {
  const [data, setData] = useState<ListaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [obra, setObra] = useState('');
  const [categoria, setCategoria] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [page, setPage] = useState(1);

  async function load(p = 1) {
    setLoading(true);
    const params = new URLSearchParams();
    if (obra) params.set('obra', obra);
    if (categoria) params.set('categoria', categoria);
    if (inicio) params.set('inicio', inicio);
    if (fim) params.set('fim', fim);
    params.set('page', String(p));
    const res = await fetch('/api/despesas/lista?' + params.toString());
    const json = await res.json();
    setData(json);
    setPage(p);
    setLoading(false);
  }

  useEffect(() => { load(1); }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load(1);
  }

  function clearFilters() {
    setObra('');
    setCategoria('');
    setInicio('');
    setFim('');
    setTimeout(() => load(1), 0);
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Despesas Registadas</h1>
        <Link
          href="/despesas/scan"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
        >
          + Registar Despesa
        </Link>
      </div>

      <form
        onSubmit={handleSearch}
        className="bg-gray-50 p-4 rounded-lg mb-4 grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        <div>
          <label className="block text-xs text-gray-500 mb-1">Obra</label>
          <input
            className="w-full border rounded px-2 py-1 text-sm"
            value={obra}
            onChange={e => setObra(e.target.value)}
            placeholder="Filtrar por obra..."
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Categoria</label>
          <select
            className="w-full border rounded px-2 py-1 text-sm"
            value={categoria}
            onChange={e => setCategoria(e.target.value)}
          >
            {CATEGORIAS.map(c => (
              <option key={c} value={c}>{c || 'Todas'}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Data início</label>
          <input
            type="date"
            className="w-full border rounded px-2 py-1 text-sm"
            value={inicio}
            onChange={e => setInicio(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Data fim</label>
          <input
            type="date"
            className="w-full border rounded px-2 py-1 text-sm"
            value={fim}
            onChange={e => setFim(e.target.value)}
          />
        </div>
        <div className="col-span-2 md:col-span-4 flex gap-2">
          <button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700">
            Filtrar
          </button>
          <button type="button" onClick={clearFilters} className="bg-gray-200 px-4 py-1.5 rounded text-sm hover:bg-gray-300">
            Limpar
          </button>
        </div>
      </form>

      {data && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white border rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Registos</div>
            <div className="text-2xl font-bold">{data.total}</div>
          </div>
          <div className="bg-white border rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Total c/ IVA</div>
            <div className="text-2xl font-bold text-red-600">{fmt(data.soma_total)}</div>
          </div>
          <div className="bg-white border rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Total s/ IVA</div>
            <div className="text-2xl font-bold text-orange-600">{fmt(data.soma_sem_iva)}</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-400">A carregar...</div>
      ) : !data || data.items.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          {data ? 'Sem despesas para os filtros seleccionados.' : ''}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded border">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="border-b px-3 py-2">Data</th>
                  <th className="border-b px-3 py-2">Fornecedor</th>
                  <th className="border-b px-3 py-2">Obra</th>
                  <th className="border-b px-3 py-2">Categoria</th>
                  <th className="border-b px-3 py-2">Descrição</th>
                  <th className="border-b px-3 py-2 text-right">S/ IVA</th>
                  <th className="border-b px-3 py-2 text-right">IVA</th>
                  <th className="border-b px-3 py-2 text-right">Total</th>
                  <th className="border-b px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((d, i) => (
                  <tr key={d.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border-b px-3 py-2 whitespace-nowrap">
                      {d.data_documento ? new Date(d.data_documento).toLocaleDateString('pt-PT') : '—'}
                    </td>
                    <td className="border-b px-3 py-2">{d.fornecedor || '—'}</td>
                    <td className="border-b px-3 py-2">{d.obra || '—'}</td>
                    <td className="border-b px-3 py-2">{d.categoria || '—'}</td>
                    <td className="border-b px-3 py-2 max-w-xs truncate">{d.descricao || '—'}</td>
                    <td className="border-b px-3 py-2 text-right whitespace-nowrap">{fmt(d.valor_sem_iva)}</td>
                    <td className="border-b px-3 py-2 text-right">{d.taxa_iva}%</td>
                    <td className="border-b px-3 py-2 text-right font-semibold whitespace-nowrap">{fmt(d.valor_total)}</td>
                    <td className="border-b px-3 py-2">
                      <Link href={`/despesas/${d.id}`} className="text-blue-600 hover:underline text-xs">Ver</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.pages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-4">
              <button disabled={page <= 1} onClick={() => load(page - 1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40 hover:bg-gray-50">
                ← Anterior
              </button>
              <span className="text-sm text-gray-600">Página {page} de {data.pages}</span>
              <button disabled={page >= data.pages} onClick={() => load(page + 1)} className="px-3 py-1 rounded border text-sm disabled:opacity-40 hover:bg-gray-50">
                Seguinte →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
