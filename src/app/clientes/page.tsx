'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Cliente {
  id: string;
  nome: string;
  nif: string | null;
  email: string | null;
  telefone: string | null;
  ativo: boolean;
}

export default function ClientesPage() {
  const [list, setList] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/clientes')
      .then(r => r.json())
      .then(d => setList(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = list.filter(c =>
    search === '' ||
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    (c.nif ?? '').includes(search),
  );

  return (
    <div className="min-h-screen bg-surface px-4 py-6 text-slate-900">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header className="no-print flex items-center justify-between rounded-xl bg-white/80 px-6 py-4 shadow-sm ring-1 ring-slate-100">
          <div className="text-sm font-semibold tracking-wide text-slate-800">Gestão Construção</div>
          <Link href="/" className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">← Dashboard</Link>
        </header>
        <main className="rounded-2xl bg-white/80 p-8 shadow-sm ring-1 ring-slate-100">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Clientes</h1>
            <span className="text-xs text-slate-400">sincronizado do TOConline</span>
          </div>
          <div className="mb-6">
            <input
              type="search"
              placeholder="Pesquisar por nome ou NIF..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>
          {loading ? (
            <p className="text-sm text-slate-400">A carregar...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-400">{search ? 'Nenhum cliente encontrado.' : 'Sem clientes registados.'}</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(c => (
                <div key={c.id} className="flex items-center py-4 gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800">{c.nome}</span>
                      {!c.ativo && (
                        <span className="text-xs bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">inativo</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {[c.nif, c.email, c.telefone].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && (
            <p className="mt-4 text-xs text-slate-300">
              {filtered.length} cliente{filtered.length !== 1 ? 's' : ''}
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
