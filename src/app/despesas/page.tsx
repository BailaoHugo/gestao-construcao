"use client";
import Link from "next/link";

import { useEffect, useState, useCallback } from "react";

type Obra = { id: string; code: string; name: string };
type Despesa = {
  id: string;
  data_despesa: string;
  descricao: string;
  tipo: string;
  valor: number;
  centro_custo_id: string | null;
  centro_custo_nome: string | null;
  centro_custo_code: string | null;
  fornecedor: string | null;
  notas: string | null;
  documento_ref: string | null;
};

const TIPOS = [
  { value: "materiais", label: "Materiais" },
  { value: "equipamentos", label: "Equipamentos" },
  { value: "mao_de_obra", label: "Mão de Obra" },
  { value: "outros", label: "Outros" },
];

const TIPO_CORES: Record<string, string> = {
  materiais: "bg-blue-100 text-blue-800",
  equipamentos: "bg-purple-100 text-purple-800",
  mao_de_obra: "bg-orange-100 text-orange-800",
  outros: "bg-gray-100 text-gray-700",
};

const fmt = (v: number) =>
  v.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });

const today = () => new Date().toISOString().slice(0, 10);

export default function DespesasPage() {
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroCentro, setFiltroCentro] = useState("");
  const [filtroFrom, setFiltroFrom] = useState("");
  const [filtroTo, setFiltroTo] = useState("");

  // Form
  const [form, setForm] = useState({
    data_despesa: today(),
    descricao: "",
    tipo: "materiais",
    valor: "",
    centro_custo_id: "",
    fornecedor: "",
    notas: "",
    documento_ref: "",
  });
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  const loadObras = useCallback(async () => {
    const r = await fetch("/api/obras?limit=200");
    const d = await r.json();
    setObras(d.rows ?? []);
  }, []);

  const loadDespesas = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroTipo) params.set("tipo", filtroTipo);
    if (filtroCentro) params.set("centro_custo_id", filtroCentro);
    if (filtroFrom) params.set("from", filtroFrom);
    if (filtroTo) params.set("to", filtroTo);
    const r = await fetch("/api/despesas?" + params.toString());
    const d = await r.json();
    setDespesas(d.rows ?? []);
    setLoading(false);
  }, [filtroTipo, filtroCentro, filtroFrom, filtroTo]);

  useEffect(() => { loadObras(); }, [loadObras]);
  useEffect(() => { loadDespesas(); }, [loadDespesas]);

  const resetForm = () => {
    setForm({ data_despesa: today(), descricao: "", tipo: "materiais", valor: "", centro_custo_id: "", fornecedor: "", notas: "", documento_ref: "" });
    setEditId(null);
    setErro("");
  };

  const openEdit = (d: Despesa) => {
    setForm({
      data_despesa: d.data_despesa.slice(0, 10),
      descricao: d.descricao,
      tipo: d.tipo,
      valor: String(d.valor),
      centro_custo_id: d.centro_custo_id ?? "",
      fornecedor: d.fornecedor ?? "",
      notas: d.notas ?? "",
      documento_ref: d.documento_ref ?? "",
    });
    setEditId(d.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErro("");
    try {
      const payload = { ...form, valor: parseFloat(form.valor), centro_custo_id: form.centro_custo_id || null };
      const url = editId ? `/api/despesas/${editId}` : "/api/despesas";
      const method = editId ? "PATCH" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
      setShowForm(false);
      resetForm();
      loadDespesas();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminar esta despesa?")) return;
    await fetch(`/api/despesas/${id}`, { method: "DELETE" });
    loadDespesas();
  };

  const total = despesas.reduce((s, d) => s + Number(d.valor), 0);
  const totaisTipo = TIPOS.map(t => ({
    ...t,
    total: despesas.filter(d => d.tipo === t.value).reduce((s, d) => s + Number(d.valor), 0),
  }));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Despesas</h1>
          <p className="text-sm text-gray-500 mt-1">Registo geral de despesas por centro de custo</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/despesas/scan"
            className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Digitalizar factura
          </Link>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            + Nova despesa
          </button>
        </div>
      </div>

      {/* Resumo por tipo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {totaisTipo.map(t => (
          <div key={t.value} className="bg-white rounded-lg border p-4">
            <p className="text-xs text-gray-500 mb-1">{t.label}</p>
            <p className="text-lg font-bold text-gray-900">{fmt(t.total)}</p>
          </div>
        ))}
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6 flex justify-between items-center">
        <span className="text-sm font-medium text-blue-800">Total no período</span>
        <span className="text-xl font-bold text-blue-900">{fmt(total)}</span>
      </div>

      {/* Filtros */}
      <div className="bg-white border rounded-lg p-4 mb-4 flex flex-wrap gap-3">
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="border rounded px-3 py-1.5 text-sm">
          <option value="">Todos os tipos</option>
          {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={filtroCentro} onChange={e => setFiltroCentro(e.target.value)} className="border rounded px-3 py-1.5 text-sm">
          <option value="">Todos os centros</option>
          {obras.map(o => <option key={o.id} value={o.id}>{o.code} — {o.name}</option>)}
        </select>
        <input type="date" value={filtroFrom} onChange={e => setFiltroFrom(e.target.value)} className="border rounded px-3 py-1.5 text-sm" placeholder="De" />
        <input type="date" value={filtroTo} onChange={e => setFiltroTo(e.target.value)} className="border rounded px-3 py-1.5 text-sm" placeholder="Até" />
        {(filtroTipo || filtroCentro || filtroFrom || filtroTo) && (
          <button onClick={() => { setFiltroTipo(""); setFiltroCentro(""); setFiltroFrom(""); setFiltroTo(""); }} className="text-sm text-red-600 hover:underline">
            Limpar filtros
          </button>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">A carregar...</div>
        ) : despesas.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Sem despesas registadas</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-left">Descrição</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Centro de custo</th>
                <th className="px-4 py-3 text-left">Fornecedor</th>
                <th className="px-4 py-3 text-left">Doc.</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {despesas.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {new Date(d.data_despesa).toLocaleDateString("pt-PT")}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{d.descricao}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${TIPO_CORES[d.tipo] ?? "bg-gray-100 text-gray-700"}`}>
                      {TIPOS.find(t => t.value === d.tipo)?.label ?? d.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {d.centro_custo_code ? `${d.centro_custo_code} — ${d.centro_custo_nome}` : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{d.fornecedor ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{d.documento_ref ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">{fmt(Number(d.valor))}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(d)} className="text-blue-500 hover:text-blue-700 mr-3 text-xs">Editar</button>
                    <button onClick={() => handleDelete(d.id)} className="text-red-400 hover:text-red-600 text-xs">Apagar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="font-semibold text-gray-900">{editId ? "Editar despesa" : "Nova despesa"}</h2>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Data *</label>
                  <input type="date" required value={form.data_despesa} onChange={e => setForm(f => ({ ...f, data_despesa: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tipo *</label>
                  <select required value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                    {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Descrição *</label>
                <input required value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Ex: Cimento Portland 50 sacos" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Valor (€) *</label>
                  <input required type="number" step="0.01" min="0" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Centro de custo</label>
                  <select value={form.centro_custo_id} onChange={e => setForm(f => ({ ...f, centro_custo_id: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">— Geral —</option>
                    {obras.map(o => <option key={o.id} value={o.id}>{o.code} — {o.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fornecedor</label>
                  <input value={form.fornecedor} onChange={e => setForm(f => ({ ...f, fornecedor: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Nome do fornecedor" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nº documento</label>
                  <input value={form.documento_ref} onChange={e => setForm(f => ({ ...f, documento_ref: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Factura / recibo" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notas</label>
                <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
              </div>
              {erro && <p className="text-red-500 text-xs">{erro}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg disabled:opacity-50">
                  {saving ? "A guardar..." : editId ? "Guardar" : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
