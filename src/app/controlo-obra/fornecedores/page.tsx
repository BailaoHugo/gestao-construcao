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

const EMPTY: Omit<Fornecedor, 'id' | 'ativo'> = { nome: '', nif: '', email: '', telefone: '', tipo: 'fornecedor' };

export default function FornecedoresPage() {
  const [list, setList] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY });
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = () =>
    fetch('/api/fornecedores')
      .then(r => r.json())
      .then(d => setList(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));

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
  };

  const handleToggleAtivo = async (f: Fornecedor) => {
    await fetch(`/api/fornecedores/${f.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ativo: !f.ativo }),
    });
    load();
  };

  return (
    <div className="min-h-screen bg-surface px-4 py-6 text-slate-900">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header className="no-print flex items-center justify-between rounded-xl bg-white/80 px-6 py-4 shadow-sm ring-1 ring-slate-100">
          <div className="text-sm font-semibold tracking-wide text-slate-800">GestÃ£o ConstruÃ§Ã£o</div>
          <Link href="/controlo-obra" className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">â Controlo de Obra</Link>
        </header>

        <main className="rounded-2xl bg-white/80 p-8 shadow-sm ring-1 ring-slate-100">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Fornecedores</h1>
            <button onClick={() => { setForm({ ...EMPTY }); setEditing(null); setShowForm(true); }} className="rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-700 transition">
              + Novo Fornecedor
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="mb-8 rounded-2xl border border-slate-100 bg-slate-50 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-slate-700">{editing ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Nome *</label>
                  <input required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">NIF</label>
                  <input value={form.nif} onChange={e => setForm(f => ({ ...f, nif: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Telefone</label>
                  <input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Tipo</label>
                  <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300">
                    <option value="fornecedor">Fornecedor</option>
                    <option value="subempreiteiro">Subempreiteiro</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="rounded-full bg-slate-900 px-6 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 transition">
                  {saving ? 'A guardar...' : editing ? 'Guardar' : 'Criar'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="rounded-full border border-slate-200 px-6 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition">
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <p className="text-sm text-slate-400">A carregar...</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-slate-400">Sem fornecedores registados.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {list.map(f => (
                <div key={f.id} className="flex items-center justify-between py-4 gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800">{f.nome}</span>
                      {!f.ativo && <span className="text-xs bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">inativo</span>}
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{f.tipo}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{[f.nif, f.email, f.telefone].filter(Boolean).join(' Â· ')}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleEdit(f)} className="text-xs text-slate-500 hover:text-slate-800 px-3 py-1 rounded-full border border-slate-200 hover:bg-slate-50 transition">Editar</button>
                    <button onClick={() => handleToggleAtivo(f)} className="text-xs text-slate-500 hover:text-slate-800 px-3 py-1 rounded-full border border-slate-200 hover:bg-slate-50 transition">{f.ativo ? 'Desativar' : 'Ativar'}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
