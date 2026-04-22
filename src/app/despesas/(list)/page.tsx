"use client";
import Link from "next/link";
import { ObraCombobox } from "@/components/ObraCombobox";
import { useEffect, useState, useCallback } from "react"

type Obra = { id: string; code: string; nome: string };

type DespesaLinha = {
  id?: string;
  descricao: string;
  referencia?: string;
  quantidade: number;
  unidade: string;
  preco_unit_sem_iva: number;
  taxa_iva: number
  desconto_pct: number;
  total_sem_iva: number;
};

type Despesa = {
  id: string;
  data_despesa: string;
  descricao: string;
  tipo: string;
  valor: number;
  valor_sem_iva: number | null;
  valor_iva: number | null;
  valor_total_civa: number | null;
  numero_fatura: string | null;
  centro_custo_id: string | null;
  centro_custo_nome: string | null;
  centro_custo_code: string | null;
  fornecedor: string | null;
  notas: string | null;
  documento_ref: string | null;
  toconline_id: string | null;
  linhas: DespesaLinha[];
};

const TIPOS = [
  { value: "materiais", label: "Materiais" },
  { value: "subempreitada", label: "Subempreitada" },
  { value: "equipamentos", label: "Equipamentos" },
  { value: "mao_de_obra", label: "Mão de Obra" },
  { value: "outros", label: "Outros" },
];

const TIPO_CORES: Record<string, string> = {
  materiais: "bg-blue-100 text-blue-800",
  subempreitada: "bg-emerald-100 text-emerald-800",
  equipamentos: "bg-purple-100 text-purple-800",
  mao_de_obra: "bg-orange-100 text-orange-800",
  outros: "bg-gray-100 text-gray-700",
};

const fmt = (v: number) =>
  v.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
const fmtN = (v: number | null | undefined) =>
  v != null
    ? v.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €"
    : "—";
const today = () => new Date().toISOString().slice(0, 10);

const emptyLinha = (): DespesaLinha => ({
  descricao: "",
  referencia: "",
  quantidade: 1,
  unidade: "un",
  preco_unit_sem_iva: 0,
  taxa_iva: 23,
  desconto_pct: 0,
  total_sem_iva: 0,
});

function calcTotal(l: DespesaLinha) {
  const bruto = (l.quantidade || 0) * (l.preco_unit_sem_iva || 0);
  return Math.round(bruto * (1 - (l.desconto_pct || 0) / 100) * 100) / 100;
}

export default function DespesasPage() {
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroCentro, setFiltroCentro] = useState("");
  const [filtroFrom, setFiltroFrom] = useState("");
  const [filtroTo, setFiltroTo] = useState("");
  const [filtroFornecedor, setFiltroFornecedor] = useState("");

  const [form, setForm] = useState({
    data_despesa: today(),
    descricao: "",
    tipo: "materiais",
    valor: "",
    valor_sem_iva: "",
    valor_iva: "",
    valor_total_civa: "",
    numero_fatura: "",
    centro_custo_id: "",
    fornecedor: "",
    notas: "",
    documento_ref: "",
  });
  const [linhas, setLinhas] = useState<DespesaLinha[]>([]);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [erro, setErro] = useState("");
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  // Totais calculados das linhas
  const totalSemIva = linhas.reduce((s, l) => s + l.total_sem_iva, 0);
  const totalIva = linhas.reduce(
    (s, l) => s + Math.round(l.total_sem_iva * (l.taxa_iva / 100) * 100) / 100,
    0
  );
  const totalCIva = Math.round((totalSemIva + totalIva) * 100) / 100;
  const hasLinhas = linhas.length > 0;

  const loadObras = useCallback(async () => {
    const r = await fetch("/api/obras?limit=200");
    const d = await r.json();
    setObras(d.data ?? d.items ?? d.rows ?? []);
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
    setForm({
      data_despesa: today(), descricao: "", tipo: "materiais",
      valor: "", valor_sem_iva: "", valor_iva: "", valor_total_civa: "",
      numero_fatura: "", centro_custo_id: "",
      fornecedor: "", notas: "", documento_ref: "",
    });
    setLinhas([]);
    setEditId(null);
    setErro("");
  };

  const openEdit = (d: Despesa) => {
    setForm({
      data_despesa: d.data_despesa.slice(0, 10),
      descricao: d.descricao,
      tipo: d.tipo,
      valor: String(d.valor),
      valor_sem_iva: d.valor_sem_iva != null ? String(d.valor_sem_iva) : "",
      valor_iva: d.valor_iva != null ? String(d.valor_iva) : "",
      valor_total_civa: d.valor_total_civa != null ? String(d.valor_total_civa) : "",
      numero_fatura: d.numero_fatura ?? "",
      centro_custo_id: d.centro_custo_id ?? "",
      fornecedor: d.fornecedor ?? "",
      notas: d.notas ?? "",
      documento_ref: d.documento_ref ?? "",
    });
    setLinhas(d.linhas ?? []);
    setEditId(d.id);
    setShowForm(true);
  };

  const updateLinha = (idx: number, field: keyof DespesaLinha, value: string | number) => {
    setLinhas((ls) =>
      ls.map((l, i) => {
        if (i !== idx) return l;
        const next = { ...l, [field]: value };
        if (["quantidade", "preco_unit_sem_iva", "desconto_pct"].includes(field as string)) {
          next.total_sem_iva = calcTotal(next);
        }
        return next;
      })
    );
  };

  const handleSync = async () => {
    setSyncing(true); setSyncMsg("");
    try {
      const r = await fetch("/api/despesas/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: "2026-01-01", endDate: new Date().toISOString().slice(0, 10) }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Erro");
      setSyncMsg(`✓ ${j.upserted} despesas importadas`);
      loadDespesas();
    } catch (e) {
      setSyncMsg("Erro: " + (e instanceof Error ? e.message : String(e)));
    } finally { setSyncing(false); }
  };

  const handleUpload = async (despesa: Despesa, file: File) => {
    setUploadingId(despesa.id);
    try {
      const dt = despesa.data_despesa.slice(0, 7);
      const forn = (despesa.fornecedor ?? 'DOC').replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').toUpperCase();
      const nr = (despesa.numero_fatura ?? despesa.id.slice(0, 8)).replace(/[^a-zA-Z0-9]/g, '-');
      const ext = file.name.split('.').pop() ?? 'pdf';
      const namedFile = new File([file], dt + '_' + forn + '_' + nr + '.' + ext, { type: file.type });
      const fd = new FormData();
      fd.append("file", namedFile);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      if (!r.ok) throw new Error("Upload falhou");
      const { url } = await r.json();
      await fetch(`/api/despesas/${despesa.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data_despesa: despesa.data_despesa.slice(0, 10),
          descricao: despesa.descricao, tipo: despesa.tipo, valor: despesa.valor,
          centro_custo_id: despesa.centro_custo_id, fornecedor: despesa.fornecedor,
          notas: despesa.notas, documento_ref: url,
          numero_fatura: despesa.numero_fatura,
          valor_sem_iva: despesa.valor_sem_iva, valor_iva: despesa.valor_iva,
          valor_total_civa: despesa.valor_total_civa,
        }),
      });
      loadDespesas();
    } catch (e) {
      alert("Erro no upload: " + (e instanceof Error ? e.message : String(e)));
    } finally { setUploadingId(null); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setErro("");
    try {
      const payload = {
        ...form,
        valor: hasLinhas ? totalSemIva : parseFloat(form.valor),
        valor_sem_iva: hasLinhas ? totalSemIva : (form.valor_sem_iva ? parseFloat(form.valor_sem_iva) : parseFloat(form.valor)),
        valor_iva: hasLinhas ? totalIva : (form.valor_iva ? parseFloat(form.valor_iva) : null),
        valor_total_civa: hasLinhas ? totalCIva : (form.valor_total_civa ? parseFloat(form.valor_total_civa) : null),
        centro_custo_id: form.centro_custo_id || null,
        linhas: hasLinhas ? linhas : [],
      };
      const url = editId ? `/api/despesas/${editId}` : "/api/despesas";
      const method = editId ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) { const e = await r.json(); throw new Error(e.error); }
      setShowForm(false); resetForm(); loadDespesas();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminar esta despesa?")) return;
    await fetch(`/api/despesas/${id}`, { method: "DELETE" });
    loadDespesas();
  };

  const despesasFiltradas = filtroFornecedor
    ? despesas.filter(d => (d.fornecedor ?? '').toLowerCase().includes(filtroFornecedor.toLowerCase()))
    : despesas;
  const total = despesasFiltradas.reduce((s, d) => s + Number(d.valor_sem_iva ?? d.valor), 0);
  const totaisTipo = TIPOS.map((t) => ({
    ...t,
    total: despesasFiltradas
      .filter((d) => d.tipo === t.value)
      .reduce((s, d) => s + Number(d.valor_sem_iva ?? d.valor), 0),
  }));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Despesas</h1>
          <p className="text-sm text-gray-500 mt-1">Registo geral de despesas por centro de custo</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-2">
            <button onClick={handleSync} disabled={syncing}
              className="flex items-center gap-1 bg-gray-700 hover:bg-gray-800 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg text-sm font-medium">
              {syncing ? "⟳ A importar..." : "⟳ TOC Online"}
            </button>
            <Link href="/despesas/scan"
              className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              Digitalizar factura
            </Link>
            <button onClick={() => { resetForm(); setShowForm(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              + Nova despesa
            </button>
          </div>
          {syncMsg && (
            <p className={`text-xs ${syncMsg.startsWith("Erro") ? "text-red-500" : "text-green-600"}`}>
              {syncMsg}
            </p>
          )}
        </div>
      </div>

      {/* Resumo por tipo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {totaisTipo.map((t) => (
          <div key={t.value} className="bg-white rounded-lg border p-4">
            <p className="text-xs text-gray-500 mb-1">{t.label}</p>
            <p className="text-lg font-bold text-gray-900">{fmt(t.total)}</p>
          </div>
        ))}
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-6 flex justify-between items-center">
        <span className="text-sm font-medium text-blue-800">Total s/IVA no período</span>
        <span className="text-xl font-bold text-blue-900">{fmt(total)}</span>
      </div>

      {/* Filtros */}
      <div className="bg-white border rounded-lg p-4 mb-4 flex flex-wrap gap-3">
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm">
          <option value="">Todos os tipos</option>
          {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <ObraCombobox obras={obras} value={filtroCentro} onChange={setFiltroCentro} emptyLabel="Todos os centros" />
        <input type="date" value={filtroFrom} onChange={(e) => setFiltroFrom(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm" />
        <input type="date" value={filtroTo} onChange={(e) => setFiltroTo(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm" />
        <input type="text" value={filtroFornecedor} onChange={(e) => setFiltroFornecedor(e.target.value)}
          placeholder="Fornecedor..." className="border rounded px-3 py-1.5 text-sm w-44" />
        {(filtroTipo || filtroCentro || filtroFrom || filtroTo || filtroFornecedor) && (
          <button onClick={() => { setFiltroTipo(""); setFiltroCentro(""); setFiltroFrom(""); setFiltroTo(""); setFiltroFornecedor(""); }}
            className="text-sm text-red-600 hover:underline">
            Limpar filtros
          </button>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white border rounded-lg overflow-x-auto overflow-y-auto max-h-[calc(100vh-260px)]">
        {loading ? (
          <div className="p-8 text-center text-gray-400">A carregar...</div>
        ) : despesas.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Sem despesas registadas</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase sticky top-0 z-10">
              <tr>
                <th className="px-2 py-3 w-5"></th>
                <th className="px-3 py-3 text-left">Data</th>
                <th className="px-3 py-3 text-left">N.º Fatura</th>
                <th className="px-3 py-3 text-left">Descrição</th>
                <th className="px-3 py-3 text-left">Tipo</th>
                <th className="px-3 py-3 text-left">Centro</th>
                <th className="px-3 py-3 text-left">Fornecedor</th>
                <th className="px-3 py-3 text-left">Doc.</th>
                <th className="px-3 py-3 text-right">S/IVA</th>
                <th className="px-3 py-3 text-right">C/IVA</th>
                <th className="px-3 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {despesasFiltradas.flatMap((d) => {
                const hasDetail = d.linhas && d.linhas.length > 0;
                const isOpen = expandedId === d.id;
                return [
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-2 py-3 text-center">
                      {hasDetail && (
                        <button onClick={() => setExpandedId(isOpen ? null : d.id)}
                          className="text-gray-400 hover:text-gray-700 text-xs font-mono">
                          {isOpen ? "▼" : "▶"}
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap text-xs">
                      {new Date(d.data_despesa).toLocaleDateString("pt-PT")}
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {d.numero_fatura ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-3 font-medium text-gray-900 text-sm">
                      {d.descricao}
                      {hasDetail && (
                        <span className="ml-2 text-xs text-gray-400 font-normal">
                          ({d.linhas.length} linha{d.linhas.length !== 1 ? "s" : ""})
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${TIPO_CORES[d.tipo] ?? "bg-gray-100 text-gray-700"}`}>
                        {TIPOS.find((t) => t.value === d.tipo)?.label ?? d.tipo}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-600 text-xs">
                      {d.centro_custo_code ? (<><span className="font-medium">{d.centro_custo_code}</span>{d.centro_custo_nome && <span className="text-gray-400 ml-1">· {d.centro_custo_nome}</span>}</>) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-3 text-gray-600 text-xs">
                      {d.fornecedor ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        {d.documento_ref?.startsWith("http") ? (
                          <a href={`/api/despesas/${d.id}/documento`} target="_blank" rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm" title="Ver documento">
                            📎
                          </a>
                        ) : d.toconline_id ? (
                          <span className="text-teal-600 text-xs" title="TOC Online">🔗</span>
                        ) : uploadingId === d.id ? (
                          <span className="text-xs text-gray-400 animate-pulse">...</span>
                        ) : (
                          <label className="cursor-pointer text-gray-300 hover:text-blue-500 text-xs" title="Anexar ficheiro">
                            ＋📎
                            <input type="file" className="hidden" accept="image/*,.pdf"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleUpload(d, f);
                                e.target.value = "";
                              }} />
                          </label>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-gray-900 whitespace-nowrap text-sm">
                      {fmt(Number(d.valor_sem_iva ?? d.valor))}
                    </td>
                    <td className="px-3 py-3 text-right text-gray-500 text-xs whitespace-nowrap">
                      {d.valor_total_civa != null
                        ? fmt(Number(d.valor_total_civa))
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <button onClick={() => openEdit(d)}
                        className="text-blue-500 hover:text-blue-700 mr-2 text-xs">Editar</button>
                      <button onClick={() => handleDelete(d.id)}
                        className="text-red-400 hover:text-red-600 text-xs">Apagar</button>
                    </td>
                  </tr>,
                  ...(isOpen && hasDetail
                    ? [
                        <tr key={`${d.id}-detail`}>
                          <td colSpan={11} className="bg-slate-50 px-8 py-3 border-b border-slate-200">
                            <table className="w-full text-xs text-gray-700">
                              <thead>
                                <tr className="text-gray-400 uppercase text-[10px] border-b border-gray-200">
                                  <th className="text-left pb-1.5 pr-3">Ref.</th>
                                  <th className="text-left pb-1.5 pr-3">Descrição</th>
                                  <th className="text-right pb-1.5 pr-3">Qtd</th>
                                  <th className="text-left pb-1.5 pr-3">Un.</th>
                                  <th className="text-right pb-1.5 pr-3">P.Unit s/IVA</th>
                                  <th className="text-right pb-1.5 pr-3">IVA%</th>
                                  <th className="text-right pb-1.5 pr-3">Desc%</th>
                                  <th className="text-right pb-1.5">Total s/IVA</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {d.linhas.map((l, i) => (
                                  <tr key={i}>
                                    <td className="py-1.5 pr-3 text-gray-400">{l.referencia || "—"}</td>
                                    <td className="py-1.5 pr-3">{l.descricao}</td>
                                    <td className="py-1.5 pr-3 text-right">{l.quantidade}</td>
                                    <td className="py-1.5 pr-3 text-gray-500">{l.unidade}</td>
                                    <td className="py-1.5 pr-3 text-right">{fmtN(l.preco_unit_sem_iva)}</td>
                                    <td className="py-1.5 pr-3 text-right">{l.taxa_iva}%</td>
                                    <td className="py-1.5 pr-3 text-right">
                                      {l.desconto_pct ? `${l.desconto_pct}%` : "—"}
                                    </td>
                                    <td className="py-1.5 text-right font-semibold">
                                      {fmtN(Number(l.total_sem_iva))}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="border-t border-gray-200 font-semibold text-gray-700">
                                  <td colSpan={7} className="pt-1.5 text-right pr-3">Total s/IVA</td>
                                  <td className="pt-1.5 text-right">
                                    {fmtN(d.linhas.reduce((s, l) => s + Number(l.total_sem_iva), 0))}
                                  </td>
                                </tr>
                                {d.valor_iva != null && (
                                  <tr className="text-gray-500">
                                    <td colSpan={7} className="pt-0.5 text-right pr-3">IVA</td>
                                    <td className="pt-0.5 text-right">{fmtN(d.valor_iva)}</td>
                                  </tr>
                                )}
                                {d.valor_total_civa != null && (
                                  <tr className="font-bold text-gray-800">
                                    <td colSpan={7} className="pt-0.5 text-right pr-3">Total c/IVA</td>
                                    <td className="pt-0.5 text-right">{fmtN(d.valor_total_civa)}</td>
                                  </tr>
                                )}
                              </tfoot>
                            </table>
                          </td>
                        </tr>,
                      ]
                    : []),
                ];
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-6">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="font-semibold text-gray-900">
                {editId ? "Editar despesa" : "Nova despesa"}
              </h2>
              <button onClick={() => { setShowForm(false); resetForm(); }}
                className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Linha 1: Data / Tipo / N.º Fatura */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Data *</label>
                  <input type="date" required value={form.data_despesa}
                    onChange={(e) => setForm((f) => ({ ...f, data_despesa: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-705 mb-1">Tipo *</label>
                  <select required value={form.tipo}
                    onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">N.º Fatura</label>
                  <input value={form.numero_fatura}
                    onChange={(e) => setForm((f) => ({ ...f, numero_fatura: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="FT 2026/001" />
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Descrição *</label>
                <input required value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Ex: Materiais Leroy Merlin" />
              </div>

              {/* Fornecedor / Centro */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fornecedor</label>
                  <input value={form.fornecedor}
                    onChange={(e) => setForm((f) => ({ ...f, fornecedor: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Centro de custo</label>
                  <ObraCombobox obras={obras} value={form.centro_custo_id} onChange={(id) => setForm(f => ({ ...f, centro_custo_id: id }))} emptyLabel="— Geral —" className="w-full" />
                </div>
              </div>

              {/* Linhas de fatura */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-medium text-gray-700">Linhas de fatura</label>
                  <button type="button" onClick={() => setLinhas((ls) => [...ls, emptyLinha()])}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                    + Adicionar linha
                  </button>
                </div>
                {linhas.length > 0 && (
                  <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 text-gray-400 uppercase text-[10px]">
                        <tr>
                          <th className="px-2 py-2 text-left min-w-[140px]">Descrição</th>
                          <th className="px-2 py-2 text-left w-20">Ref.</th>
                          <th className="px-2 py-2 text-right w-14">Qtd</th>
                          <th className="px-2 py-2 text-left w-12">Un.</th>
                          <th className="px-2 py-2 text-right w-20">P.Unit €</th>
                          <th className="px-2 py-2 text-right w-14">IVA%</th>
                          <th className="px-2 py-2 text-right w-14">Desc%</th>
                          <th className="px-2 py-2 text-right w-20">Total</th>
                          <th className="w-6"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {linhas.map((l, i) => (
                          <tr key={i} className="bg-white">
                            <td className="px-2 py-1.5">
                              <input value={l.descricao}
                                onChange={(e) => updateLinha(i, "descricao", e.target.value)}
                                className="w-full border-0 outline-none text-xs bg-transparent"
                                placeholder="Artigo..." />
                            </td>
                            <td className="px-2 py-1.5">
                              <input value={l.referencia ?? ""}
                                onChange={(e) => updateLinha(i, "referencia", e.target.value)}
                                className="w-full border-0 outline-none text-xs bg-transparent"
                                placeholder="—" />
                            </td>
                            <td className="px-2 py-1.5">
                              <input type="number" value={l.quantidade} min="0" step="any"
                                onChange={(e) => updateLinha(i, "quantidade", parseFloat(e.target.value) || 0)}
                                className="w-full border-0 outline-none text-xs text-right bg-transparent" />
                            </td>
                            <td className="px-2 py-1.5">
                              <input value={l.unidade}
                                onChange={(e) => updateLinha(i, "unidade", e.target.value)}
                                className="w-full border-0 outline-none text-xs bg-transparent" />
                            </td>
                            <td className="px-2 py-1.5">
                              <input type="number" value={l.preco_unit_sem_iva} min="0" step="0.001"
                                onChange={(e) => updateLinha(i, "preco_unit_sem_iva", parseFloat(e.target.value) || 0)}
                                className="w-full border-0 outline-none text-xs text-right bg-transparent" />
                            </td>
                            <td className="px-2 py-1.5">
                              <input type="number" value={l.taxa_iva} min="0" step="1"
                                onChange={(e) => updateLinha(i, "taxa_iva", parseFloat(e.target.value) || 0)}
                                className="w-full border-0 outline-none text-xs text-right bg-transparent" />
                            </td>
                            <td className="px-2 py-1.5">
                              <input type="number" value={l.desconto_pct} min="0" max="100" step="any"
                                onChange={(e) => updateLinha(i, "desconto_pct", parseFloat(e.target.value) || 0)}
                                className="w-full border-0 outline-none text-xs text-right bg-transparent" />
                            </td>
                            <td className="px-2 py-1.5 text-right font-semibold text-gray-700">
                              {l.total_sem_iva.toFixed(2)}
                            </td>
                            <td className="px-1 py-1.5">
                              <button type="button"
                                onClick={() => setLinhas((ls) => ls.filter((_, j) => j !== i))}
                                className="text-red-400 hover:text-red-600 font-bold">×</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Totais */}
              <div className="grid grid-cols-3 gap-3 bg-gray-50 rounded-lg p-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Total s/IVA *{" "}
                    {hasLinhas && <span className="text-blue-400 font-normal">(calculado)</span>}
                  </label>
                  <input required type="number" step="0.01" min="0"
                    value={hasLinhas ? totalSemIva.toFixed(2) : form.valor}
                    readOnly={hasLinhas}
                    onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                    className={`w-full border rounded-lg px-3 py-2 text-sm font-semibold ${hasLinhas ? "bg-gray-100 text-gray-500" : ""}`} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    IVA{" "}
                    {hasLinhas && <span className="text-blue-400 font-normal">(calculado)</span>}
                  </label>
                  <input type="number" step="0.01" min="0"
                    value={hasLinhas ? totalIva.toFixed(2) : form.valor_iva}
                    readOnly={hasLinhas}
                    onChange={(e) => setForm((f) => ({ ...f, valor_iva: e.target.value }))}
                    className={`w-full border rounded-lg px-3 py-2 text-sm ${hasLinhas ? "bg-gray-100 text-gray-500" : ""}`} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Total c/IVA{" "}
                    {hasLinhas && <span className="text-blue-400 font-normal">(calculado)</span>}
                  </label>
                  <input type="number" step="0.01" min="0"
                    value={hasLinhas ? totalCIva.toFixed(2) : form.valor_total_civa}
                    readOnly={hasLinhas}
                    onChange={(e) => setForm((f) => ({ ...f, valor_total_civa: e.target.value }))}
                    className={`w-full border rounded-lg px-3 py-2 text-sm ${hasLinhas ? "bg-gray-100 text-gray-500" : ""}`} />
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notas</label>
                <textarea value={form.notas}
                  onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
              </div>

              {/* Anexo */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Anexo (PDF / imagem)</label>
                {form.documento_ref?.startsWith("http") ? (
                  <div className="flex items-center gap-2">
                    <a href={`/api/despesas/${editId}/documento`} target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-xs">📎 Ver anexo actual</a>
                    <button type="button"
                      onClick={() => setForm((f) => ({ ...f, documento_ref: "" }))}
                      className="text-red-400 hover:text-red-600 text-xs">Remover</button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 cursor-pointer border border-dashed rounded-lg px-3 py-2 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors">
                    <span>📎 {form.documento_ref || "Clica para anexar ficheiro"}</span>
                    <input type="file" className="hidden" accept="image/*,.pdf"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const dt2 = form.data_despesa.slice(0, 7);
                const forn2 = (form.fornecedor || 'DOC').replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').toUpperCase();
                const nr2 = (form.numero_fatura || 'DOC').replace(/[^a-zA-Z0-9]/g, '-');
                const ext2 = file.name.split('.').pop() ?? 'pdf';
                const namedFile2 = new File([file], dt2 + '_' + forn2 + '_' + nr2 + '.' + ext2, { type: file.type });
                const fd = new FormData();
                fd.append("file", namedFile2);
                setSaving(true);
                        try {
                          const r = await fetch("/api/upload", { method: "POST", body: fd });
                          const { url } = await r.json();
                          setForm((f) => ({ ...f, documento_ref: url }));
                        } catch { setErro("Erro no upload do ficheiro"); }
                        finally { setSaving(false); }
                        e.target.value = "";
                      }} />
                  </label>
                )}
              </div>

              {erro && <p className="text-red-500 text-xs">{erro}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg disabled:opacity-50">
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
