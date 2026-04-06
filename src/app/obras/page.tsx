"use client";
import { useState, useEffect, useCallback } from "react";

type Cliente = { id: number; nome: string };
type Obra = {
  id: string;
  code: string;
  nome: string;
  descricao?: string;
  estado: string;
  cliente_id?: string;
  cliente_nome?: string;
  data_inicio?: string;
  data_fim?: string;
};

// Valores que existem na BD (CHECK constraint)
const ESTADOS = [
  { value: "ativo",     label: "Ativa",      color: "bg-blue-100 text-blue-700" },
  { value: "concluido", label: "Concluída",   color: "bg-green-100 text-green-700" },
  { value: "suspenso",  label: "Suspensa",    color: "bg-amber-100 text-amber-700" },
  { value: "cancelado", label: "Cancelada",   color: "bg-red-100 text-red-700" },
];

function estadoBadge(estado: string) {
  const e = ESTADOS.find((x) => x.value === estado) ?? ESTADOS[0];
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${e.color}`}>
      {e.label}
    </span>
  );
}

const EMPTY = {
  code: "",
  nome: "",
  descricao: "",
  estado: "ativo",
  cliente_id: "",
  data_inicio: "",
  data_fim: "",
};

const FILTROS = [
  { value: "",         label: "Todas"      },
  { value: "ativo",    label: "Ativas"     },
  { value: "concluido",label: "Concluídas" },
  { value: "suspenso", label: "Suspensas"  },
  { value: "cancelado",label: "Canceladas" },
];

export default function ObrasPage() {
  const [obras, setObras]     = useState<Obra[]>([]);
  const [total, setTotal]     = useState(0);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch]   = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [editId, setEditId]   = useState<string | null>(null);
  const [form, setForm]       = useState<typeof EMPTY>({ ...EMPTY });
  const [saving, setSaving]   = useState(false);

  const load = useCallback(async (q = search, est = filtroEstado) => {
    setLoading(true);
    let url = `/api/obras?search=${encodeURIComponent(q)}&limit=100`;
    if (est) url += `&estado=${encodeURIComponent(est)}`;
    const r = await fetch(url);
    const d = await r.json();
    setObras(d.data ?? d.items ?? []);
    setTotal(d.total ?? 0);
    setLoading(false);
  }, [search, filtroEstado]);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search, filtroEstado), 300);
    return () => clearTimeout(t);
  }, [search, filtroEstado]);

  useEffect(() => {
    fetch("/api/clientes?limit=200")
      .then((r) => r.json())
      .then((d) => setClientes(d.data ?? []));
  }, []);

  function openNew() {
    setForm({ ...EMPTY });
    setEditId(null);
    setModal(true);
  }

  function openEdit(o: Obra) {
    setForm({
      code:        o.code ?? "",
      nome:        o.nome,
      descricao:   o.descricao ?? "",
      estado:      o.estado,
      cliente_id:  o.cliente_id ? String(o.cliente_id) : "",
      data_inicio: o.data_inicio?.slice(0, 10) ?? "",
      data_fim:    o.data_fim?.slice(0, 10) ?? "",
    });
    setEditId(o.id);
    setModal(true);
  }

  async function save() {
    if (!form.nome.trim() || !form.code.trim()) return;
    setSaving(true);
    const body = {
      code:        form.code.trim(),
      name:        form.nome.trim(),   // API espera 'name'
      descricao:   form.descricao || null,
      estado:      form.estado,
      cliente_id:  form.cliente_id ? form.cliente_id : null,
      data_inicio: form.data_inicio || null,
      data_fim:    form.data_fim    || null,
    };
    if (editId) {
      await fetch(`/api/obras/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/obras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
    setSaving(false);
    setModal(false);
    load(search, filtroEstado);
  }

  async function del(id: string) {
    if (!confirm("Eliminar esta obra?")) return;
    await fetch(`/api/obras/${id}`, { method: "DELETE" });
    load(search, filtroEstado);
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Obras</h1>
          <p className="text-sm text-slate-500">
            {total} {total === 1 ? "obra" : "obras"}
            {filtroEstado ? ` — ${FILTROS.find(f => f.value === filtroEstado)?.label}` : ""}
          </p>
        </div>
        <button
          onClick={openNew}
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
        >
          + Nova Obra
        </button>
      </div>

      {/* Filtros de estado */}
      <div className="flex gap-2 flex-wrap">
        {FILTROS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltroEstado(f.value)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              filtroEstado === f.value
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Pesquisa */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Pesquisar por nome ou código…"
        className="w-full rounded-xl border-0 bg-white/80 px-4 py-3 text-sm shadow-sm ring-1 ring-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      {/* Tabela */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-sm">A carregar…</div>
      ) : obras.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          {filtroEstado ? "Nenhuma obra com este estado." : "Ainda não há obras. Cria a primeira!"}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white/80 shadow-sm ring-1 ring-slate-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3 w-16">Cód.</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Início</th>
                <th className="px-4 py-3">Fim</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {obras.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-500">{o.code}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{o.nome}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {o.cliente_nome ?? <span className="text-slate-300 italic">—</span>}
                  </td>
                  <td className="px-4 py-3">{estadoBadge(o.estado)}</td>
                  <td className="px-4 py-3 text-slate-500">{o.data_inicio?.slice(0, 10) ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{o.data_fim?.slice(0, 10) ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => openEdit(o)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => del(o.id)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 ring-1 ring-red-100 hover:bg-red-50"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-5 text-lg font-semibold text-slate-800">
              {editId ? "Editar Obra" : "Nova Obra"}
            </h2>
            <div className="flex flex-col gap-4">

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Código *</label>
                  <input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    placeholder="001"
                    className="w-full rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm font-mono ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate-500">Nome *</label>
                  <input
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    className="w-full rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Cliente</label>
                <select
                  value={form.cliente_id}
                  onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}
                  className="w-full rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">— Sem cliente —</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Descrição</label>
                <textarea
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  rows={2}
                  className="w-full rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Estado</label>
                <select
                  value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value })}
                  className="w-full rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {ESTADOS.map((e) => (
                    <option key={e.value} value={e.value}>{e.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Data Início</label>
                  <input
                    type="date"
                    value={form.data_inicio}
                    onChange={(e) => setForm({ ...form, data_inicio: e.target.value })}
                    className="w-full rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Data Fim</label>
                  <input
                    type="date"
                    value={form.data_fim}
                    onChange={(e) => setForm({ ...form, data_fim: e.target.value })}
                    className="w-full rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setModal(false)}
                className="rounded-xl px-4 py-2 text-sm text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={save}
                disabled={saving || !form.nome.trim() || !form.code.trim()}
                className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {saving ? "A guardar…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
