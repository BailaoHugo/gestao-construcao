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
const TIPOS = ['todos', 'fornecedor', 'subempreiteiro', 'outro'] as const;
type TipoFilter = typeof TIPOS[number];

export default function FornecedoresPage() {
  const [list, setList] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY });
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>('todos');

  const load = () =>
    fetch('/api/fornecedores')
      .then(r => r.json())
      .then(d => setList(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const filtered = tipoFilter === 'todos' ? list : list.filter(f => f.tipo === tipoFilter);
  const counts: Record<string, number> = {};
  for (const f of list) counts[f.tipo] = (counts[f.tipo] ?? 0) + 1;

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
      setShowModal(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const openNew = () => {
    setForm({ ...EMPTY });
    setEditing(null);
    setShowModal(true);
  };

  const handleEdit = (f: Fornecedor) => {
    setForm({ nome: f.nome, nif: f.nif ?? '', email: f.email ?? '', telefone: f.telefone ?? '', tipo: f.tipo });
    setEditing(f.id);
    setShowModal(true);
  };

  const handleToggleAtivo = async (f: Fornecedor) => {
    await fetch(`/api/fornecedores/${f.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ativo: !f.ativo }),
    });
    load();
  };

  const closeModal = () => { setShowModal(false); setEditing(null); };

  const tipoLabel: Record<string, string> = {
    todos: 'Todos',
    fornecedor: 'Fornecedores',
    subempreiteiro: 'Subempreiteiros',
    outro: 'Outros',
  };

  return (
    <div className="min-h-screen bg-surface px-4 py-6 text-slate-900">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header className="no-print flex items-center justify-between rounded-xl bg-white/80 px-6 py-4 shadow-sm ring-1 ring-slate-100">
          <div className="text-sm font-semibold tracking-wide text-slate-800">Gestão Construção</div>
          <Link href="/controlo-obra" className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">← Controlo de Obra</Link>
        </header>

        <main className="rounded-2xl bg-white/80 p-8 shadow-sm ring-1 ring-slate-100">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Fornecedores</h1>
            <button
              onClick={openNew}
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-700 transition">
              + Novo Fornecedor
            </button>
          </div>

          {/* Filtro por tipo */}
          <div className="mb-6 flex gap-2 flex-wrap">
            {TIPOS.map(t => (
              <button
                key={t}
                onClick={() => setTipoFilter(t)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${tipoFilter === t ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
                {tipoLabel[t]}{t !== 'todos' && counts[t] ? ` (${counts[t]})` : t === 'todos' && list.length ? ` (${list.length})` : ''}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-sm text-slate-400">A carregar...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-400">Sem {tipoLabel[tipoFilter].toLowerCase()} registados.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(f => (
                <div key={f.id} className="flex items-center justify-between py-4 gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-800">{f.nome}</span>
                      {!f.ativo && <span className="text-xs bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">inativo</span>}
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{f.tipo}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{[f.nif, f.email, f.telefone].filter(Boolean).join(' · ')}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleEdit(f)}
                      className="text-xs text-slate-500 hover:text-slate-800 px-3 py-1 rounded-full border border-slate-200 hover:bg-slate-50 transition">
                      Editar
                    </button>
                    <button
                      onClick={() => handleToggleAtivo(f)}
                      className="text-xs text-slate-500 hover:text-slate-800 px-3 py-1 rounded-full border border-slate-200 hover:bg-slate-50 transition">
                      {f.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Modal de edição */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-2xl">
            <h2 className="mb-6 text-lg font-semibold text-slate-900">
              {editing ? 'Editar Fornecedor' : 'Novo Fornecedor'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Nome *</label>
                  <input
                    required
                    value={form.nome}
                    onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">NIF</label>
                  <input
                    value={form.nif ?? ''}
                    onChange={e => setForm(f => ({ ...f, nif: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email ?? ''}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Telefone</label>
                  <input
                    value={form.telefone ?? ''}
                    onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs text-slate-500 mb-1">Tipo</label>
                  <select
                    value={form.tipo}
                    onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300">
                    <option value="fornecedor">Fornecedor</option>
                    <option value="subempreiteiro">Subempreiteiro</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-slate-900 px-6 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 transition">
                  {saving ? 'A guardar...' : editing ? 'Guardar' : 'Criar'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full border border-slate-200 px-6 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
