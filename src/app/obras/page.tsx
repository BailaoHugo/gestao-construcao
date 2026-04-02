'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const ESTADOS = ['ativo', 'concluido', 'suspenso', 'cancelado'];

interface Obra {
  id: string;
  code: string;
  nome: string;
  descricao: string;
  estado: string;
  cliente_nome: string;
  data_inicio: string | null;
  data_fim: string | null;
}

const empty = (): Partial<Obra> => ({ code: '', nome: '', descricao: '', estado: 'ativo', cliente_nome: '', data_inicio: null, data_fim: null });

export default function ObrasPage() {
  const [list, setList] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [form, setForm] = useState<Partial<Obra> | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');

  const load = () => {
    setLoading(true);
    fetch('/api/obras')
      .then(r => r.json())
      .then(d => setList(d.items || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = list.filter(o => {
    const q = search.toLowerCase();
    const matchQ = q === '' || o.nome.toLowerCase().includes(q) || o.code.toLowerCase().includes(q) || (o.cliente_nome || '').toLowerCase().includes(q);
    const matchE = filtroEstado === '' || o.estado === filtroEstado;
    return matchQ && matchE;
  });

  const openNew = () => { setForm(empty()); setEditId(null); setErro(''); };
  const openEdit = (o: Obra) => { setForm({ ...o }); setEditId(o.id); setErro(''); };
  const closeForm = () => { setForm(null); setEditId(null); setErro(''); };

  const save = async () => {
    if (!form?.code || !form?.nome) { setErro('Código e Nome são obrigatórios'); return; }
    setSaving(true); setErro('');
    try {
      const method = editId ? 'PATCH' : 'POST';
      const url = editId ? `/api/obras/${editId}` : '/api/obras';
      const body = editId ? { name: form.nome, descricao: form.descricao, estado: form.estado, cliente_nome: form.cliente_nome, data_inicio: form.data_inicio || null, data_fim: form.data_fim || null }
                          : { code: form.code, name: form.nome, descricao: form.descricao, estado: form.estado, cliente_nome: form.cliente_nome, data_inicio: form.data_inicio || null, data_fim: form.data_fim || null };
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Erro');
      closeForm();
      load();
    } catch(e) { setErro(e instanceof Error ? e.message : 'Erro'); }
    finally { setSaving(false); }
  };

  const del = async (id: string, nome: string) => {
    if (!confirm(`Eliminar "${nome}"?`)) return;
    await fetch(`/api/obras/${id}`, { method: 'DELETE' });
    load();
  };

  const estadoBadge = (e: string) => {
    const map: Record<string, string> = { ativo: 'bg-green-100 text-green-700', concluido: 'bg-blue-100 text-blue-700', suspenso: 'bg-yellow-100 text-yellow-700', cancelado: 'bg-red-100 text-red-700' };
    return map[e] || 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="min-h-screen bg-surface px-4 py-6 text-slate-900">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex items-center justify-between rounded-xl bg-white/80 px-6 py-4 shadow-sm ring-1 ring-slate-100">
          <div className="text-sm font-semibold tracking-wide text-slate-800">Gestão Construção</div>
          <Link href="/" className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">← Dashboard</Link>
        </header>

        <main className="rounded-2xl bg-white/80 p-8 shadow-sm ring-1 ring-slate-100">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Obras / Centros de Custo</h1>
            <button onClick={openNew} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">+ Nova Obra</button>
          </div>

          <div className="mb-6 flex gap-3">
            <input type="search" placeholder="Pesquisar por código, nome ou cliente..." value={search} onChange={e => setSearch(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300">
              <option value="">Todos os estados</option>
              {ESTADOS.map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
            </select>
          </div>

          {form !== null && (
            <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/50 p-6">
              <h2 className="mb-4 text-base font-semibold text-slate-800">{editId ? 'Editar Obra' : 'Nova Obra'}</h2>
              {erro && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Código *</label>
                  <input disabled={!!editId} value={form.code || ''} onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
                    placeholder="CC-001" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm disabled:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Nome *</label>
                  <input value={form.nome || ''} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                    placeholder="Obra Lisboa Centro" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Cliente</label>
                  <input value={form.cliente_nome || ''} onChange={e => setForm(p => ({ ...p, cliente_nome: e.target.value }))}
                    placeholder="Nome do cliente" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Estado</label>
                  <select value={form.estado || 'ativo'} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                    {ESTADOS.map(e => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Data Início</label>
                  <input type="date" value={form.data_inicio || ''} onChange={e => setForm(p => ({ ...p, data_inicio: e.target.value || null }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Data Fim</label>
                  <input type="date" value={form.data_fim || ''} onChange={e => setForm(p => ({ ...p, data_fim: e.target.value || null }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Descrição</label>
                  <input value={form.descricao || ''} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
                    placeholder="Descrição opcional" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button onClick={save} disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'A guardar...' : 'Guardar'}
                </button>
                <button onClick={closeForm} className="rounded-xl border border-slate-200 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
              </div>
            </div>
          )}

          {loading ? (
            <p className="text-sm text-slate-400">A carregar...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-400">{search || filtroEstado ? 'Nenhuma obra encontrada.' : 'Sem obras registadas. Clique em "+ Nova Obra" para começar.'}</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(o => (
                <div key={o.id} className="flex items-center gap-4 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700">{o.code.slice(0, 3)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-800">{o.nome}</span>
                      <span className="text-xs text-slate-400">{o.code}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${estadoBadge(o.estado)}`}>{o.estado}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {[o.cliente_nome, o.data_inicio && `Início: ${o.data_inicio}`, o.data_fim && `Fim: ${o.data_fim}`].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => openEdit(o)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Editar</button>
                    <button onClick={() => del(o.id, o.nome)} className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50">Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!loading && <p className="mt-4 text-xs text-slate-300">{filtered.length} obra{filtered.length !== 1 ? 's' : ''}</p>}
        </main>
      </div>
    </div>
  );
}
