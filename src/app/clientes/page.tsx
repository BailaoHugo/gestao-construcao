'use client';
import { useEffect, useState, useCallback } from 'react';

interface Cliente {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  nif: string | null;
  morada: string | null;
  notas: string | null;
}

const empty = (): Partial<Cliente> => ({
  nome: '', email: '', telefone: '', nif: '', morada: '', notas: '',
});

export default function ClientesPage() {
  const [list, setList]       = useState<Cliente[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);
  const [form, setForm]       = useState<Partial<Cliente> | null>(null);
  const [editId, setEditId]   = useState<string | null>(null);
  const [saving, setSaving]   = useState(false);
  const [erro, setErro]       = useState('');
  const LIMIT = 50;

  const load = useCallback(() => {
    setLoading(true);
    const q = new URLSearchParams({ search, page: String(page), limit: String(LIMIT) });
    fetch(`/api/clientes?${q}`)
      .then(r => r.json())
      .then(d => { setList(d.rows ?? []); setTotal(d.total ?? 0); })
      .finally(() => setLoading(false));
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  // debounce search
  useEffect(() => { setPage(1); }, [search]);

  const openNew  = () => { setEditId(null); setForm(empty()); setErro(''); };
  const openEdit = (c: Cliente) => { setEditId(c.id); setForm({ ...c }); setErro(''); };
  const closeForm = () => { setForm(null); setEditId(null); setErro(''); };

  const save = async () => {
    if (!form?.nome?.trim()) { setErro('Nome é obrigatório.'); return; }
    setSaving(true); setErro('');
    try {
      const url    = editId ? `/api/clientes/${editId}` : '/api/clientes';
      const method = editId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); setErro(d.error ?? 'Erro ao guardar.'); return; }
      closeForm();
      load();
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm('Eliminar este cliente?')) return;
    await fetch(`/api/clientes/${id}`, { method: 'DELETE' });
    load();
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Clientes</h1>
          <p className="mt-1 text-sm text-slate-500">
            {total} cliente{total !== 1 ? 's' : ''} registado{total !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={openNew}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          + Novo Cliente
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Pesquisar por nome, email, NIF ou telefone..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Lista */}
      {loading ? (
        <div className="py-16 text-center text-sm text-slate-400">A carregar…</div>
      ) : list.length === 0 ? (
        <div className="py-16 text-center text-sm text-slate-400">
          {search ? 'Nenhum resultado.' : 'Ainda não há clientes. Cria o primeiro!'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-slate-500">Nome</th>
                <th className="px-5 py-3 text-left font-medium text-slate-500">Email</th>
                <th className="px-5 py-3 text-left font-medium text-slate-500">Telefone</th>
                <th className="px-5 py-3 text-left font-medium text-slate-500">NIF</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {list.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-slate-800">{c.nome}</td>
                  <td className="px-5 py-3.5 text-slate-600">{c.email ?? '—'}</td>
                  <td className="px-5 py-3.5 text-slate-600">{c.telefone ?? '—'}</td>
                  <td className="px-5 py-3.5 text-slate-600">{c.nif ?? '—'}</td>
                  <td className="px-5 py-3.5 text-right space-x-2">
                    <button
                      onClick={() => openEdit(c)}
                      className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => remove(c.id)}
                      className="rounded-lg border border-red-100 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="rounded-lg border px-3 py-1.5 disabled:opacity-40 hover:bg-slate-50"
            >← Anterior</button>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="rounded-lg border px-3 py-1.5 disabled:opacity-40 hover:bg-slate-50"
            >Seguinte →</button>
          </div>
        </div>
      )}

      {/* Modal de criação/edição */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-5 text-lg font-semibold text-slate-900">
              {editId ? 'Editar Cliente' : 'Novo Cliente'}
            </h2>

            <div className="space-y-4">
              {/* Nome */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Nome *</label>
                <input
                  autoFocus
                  type="text"
                  value={form.nome ?? ''}
                  onChange={e => setForm(f => ({ ...f!, nome: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome do cliente"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Email */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
                  <input
                    type="email"
                    value={form.email ?? ''}
                    onChange={e => setForm(f => ({ ...f!, email: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="email@exemplo.com"
                  />
                </div>
                {/* Telefone */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Telefone</label>
                  <input
                    type="tel"
                    value={form.telefone ?? ''}
                    onChange={e => setForm(f => ({ ...f!, telefone: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+351 9xx xxx xxx"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* NIF */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">NIF</label>
                  <input
                    type="text"
                    value={form.nif ?? ''}
                    onChange={e => setForm(f => ({ ...f!, nif: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="999 999 999"
                  />
                </div>
                {/* Morada */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Morada</label>
                  <input
                    type="text"
                    value={form.morada ?? ''}
                    onChange={e => setForm(f => ({ ...f!, morada: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Rua, cidade"
                  />
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Notas</label>
                <textarea
                  rows={3}
                  value={form.notas ?? ''}
                  onChange={e => setForm(f => ({ ...f!, notas: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Notas internas…"
                />
              </div>
            </div>

            {erro && (
              <p className="mt-3 text-sm text-red-600">{erro}</p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeForm}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? 'A guardar…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
