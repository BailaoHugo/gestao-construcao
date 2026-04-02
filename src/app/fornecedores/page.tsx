'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Fornecedor {
  id: string;
  nome: string;
  nif: string | null;
  email: string | null;
  telefone: string | null;
  tipo: string;
  ativo: boolean;
}

const EMPTY = { nome: '', nif: '', email: '', telefone: '', tipo: 'fornecedor' };

export default function FornecedoresPage() {
  const [list, setList] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY });
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterAtivo, setFilterAtivo] = useState<'todos' | 'ativo' | 'inativo'>('ativo');

  const load = () => {
    setLoading(true);
    fetch('/api/fornecedores')
      .then(r => r.json())
      .then(d => setList(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editing ? 'PUT' : 'POST';
      const url = editing ? `/api/fornecedores/${editing}` : '/api/fornecedores';
      await fetch(url, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      });
      setForm({ ...EMPTY });
      setEditing(null);
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (f: Fornecedor) => {
    setForm({ nome: f.nome, nif: f.nif ?? '', email: f.email ?? '', telefone: f.telefone ?? '', tipo: f.tipo });
    setEditing(f.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleAtivo = async (f: Fornecedor) => {
    await fetch(`/api/fornecedores/${f.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ativo: !f.ativo }),
    });
    load();
  };

  const filtered = list.filter(f => {
    const matchSearch = !search || f.nome.toLowerCase().includes(search.toLowerCase()) || (f.nif ?? '').includes(search);
    const matchAtivo = filterAtivo === 'todos' || (filterAtivo === 'ativo' ? f.ativo : !f.ativo);
    return matchSearch && matchAtivo;
  });

  const TIPO_LABEL: Record<string, string> = { fornecedor: 'Fornecedor', subempreiteiro: 'Subempreiteiro', ambos: 'Ambos', outro: 'Outro' };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex items-center justify-between rounded-2xl bg-white px-6 py-4 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs text-slate-400 hover:text-slate-600">← Dashboard</Link>
            <span className="text-slate-200">|</span>
            <span className="text-sm font-semibold text-slate-800">Fornecedores</span>
          </div>
          <button
            onClick={() => { setForm({ ...EMPTY }); setEditing(null); setShowForm(s => !s); }}
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-700 transition"
          >
            + Novo Fornecedor
          </button>
        </header>

        {showForm && (
          <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 space-y-4">
            <h2 className="text-sm font-semibold text-slate-700">{editing ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Nome *</label>
                <input required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">NIF</label>
                <input value={form.nif} onChange={e => setForm(f => ({ ...f, nif: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Telefone</label>
                <input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Tipo</label>
                <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300">
                  <option value="fornecedor">Fornecedor</option>
                  <option value="subempreiteiro">Subempreiteiro</option>
                  <option value="ambos">Ambos</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving}
                className="rounded-full bg-slate-900 px-6 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 transition">
                {saving ? 'A guardar...' : editing ? 'Guardar' : 'Criar'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); }}
                className="rounded-full border border-slate-200 px-6 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition">
                Cancelar
              </button>
            </div>
          </form>
        )}

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="mb-4 flex flex-wrap gap-3 items-center">
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Pesquisar por nome ou NIF..."
              className="flex-1 min-w-48 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
            <div className="flex gap-1">
              {(['ativo', 'inativo', 'todos'] as const).map(v => (
                <button key={v} onClick={() => setFilterAtivo(v)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${filterAtivo === v ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-slate-400 py-8 text-center">A carregar...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">Sem fornecedores.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(f => (
                <div key={f.id} className="flex items-center justify-between py-4 gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-800">{f.nome}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${f.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                        {f.ativo ? 'ativo' : 'inativo'}
                      </span>
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{TIPO_LABEL[f.tipo] ?? f.tipo}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{[f.nif, f.email, f.telefone].filter(Boolean).join(' · ')}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleEdit(f)}
                      className="text-xs text-slate-500 hover:text-slate-800 px-3 py-1 rounded-full border border-slate-200 hover:bg-slate-50 transition">
                      Editar
                    </button>
                    <button onClick={() => handleToggleAtivo(f)}
                      className={`text-xs px-3 py-1 rounded-full border transition ${f.ativo ? 'border-slate-200 text-slate-500 hover:bg-slate-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}>
                      {f.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="mt-4 text-xs text-slate-400">{filtered.length} de {list.length} fornecedores</p>
        </div>
      </div>
    </div>
  );
}
