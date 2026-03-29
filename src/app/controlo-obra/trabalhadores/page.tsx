'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Trabalhador {
  id: string;
  nome: string;
  cargo: string | null;
  custoHora: number;
  ativo: boolean;
  notas: string | null;
}

const EMPTY = { nome: '', cargo: '', custoHora: 0, notas: '' };

export default function TrabalhadoresPage() {
  const [list, setList] = useState<Trabalhador[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY });
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = () =>
    fetch('/api/trabalhadores')
      .then(r => r.json())
      .then(d => setList(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editing ? 'PUT' : 'POST';
      const url = editing ? `/api/trabalhadores/${editing}` : '/api/trabalhadores';
      await fetch(url, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, custoHora: Number(form.custoHora) }),
      });
      setForm({ ...EMPTY });
      setEditing(null);
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (t: Trabalhador) => {
    setForm({ nome: t.nome, cargo: t.cargo ?? '', custoHora: t.custoHora, notas: t.notas ?? '' });
    setEditing(t.id);
    setShowForm(true);
  };

  const handleToggleAtivo = async (t: Trabalhador) => {
    await fetch(`/api/trabalhadores/${t.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ativo: !t.ativo }),
    });
    load();
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
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Trabalhadores</h1>
            <button onClick={() => { setForm({ ...EMPTY }); setEditing(null); setShowForm(true); }} className="rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-700 transition">
              + Novo Trabalhador
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="mb-8 rounded-2xl border border-slate-100 bg-slate-50 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-slate-700">{editing ? 'Editar Trabalhador' : 'Novo Trabalhador'}</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Nome *</label>
                  <input required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Cargo</label>
                  <input value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Custo/Hora (€)</label>
                  <input type="number" min="0" step="0.01" value={form.custoHora} onChange={e => setForm(f => ({ ...f, custoHora: Number(e.target.value) }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Notas</label>
                  <input value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
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
            <p className="text-sm text-slate-400">Sem trabalhadores registados.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {list.map(t => (
                <div key={t.id} className="flex items-center justify-between py-4 gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800">{t.nome}</span>
                      {!t.ativo && <span className="text-xs bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">inativo</span>}
                      {t.cargo && <span className="text-xs text-slate-500">{t.cargo}</span>}
                    </div>
                    {t.custoHora > 0 && <p className="text-xs text-slate-400 mt-0.5">{t.custoHora.toFixed(2)} €/h</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleEdit(t)} className="text-xs text-slate-500 hover:text-slate-800 px-3 py-1 rounded-full border border-slate-200 hover:bg-slate-50 transition">Editar</button>
                    <button onClick={() => handleToggleAtivo(t)} className="text-xs text-slate-500 hover:text-slate-800 px-3 py-1 rounded-full border border-slate-200 hover:bg-slate-50 transition">{t.ativo ? 'Desativar' : 'Ativar'}</button>
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
