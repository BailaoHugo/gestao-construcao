"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Obra = {
  id: string; nome: string; morada?: string; nipc?: string;
  estado?: string; data_inicio?: string; data_fim?: string; descricao?: string;
};
type Custo = {
  id: string; data: string; descricao: string; categoria: string;
  fornecedor?: string; numero_fatura?: string; valor: number;
};
type Avanco = {
  id: string; numero: number; data: string;
  percentagem: number; valor_executado: number; observacoes?: string;
};
type Analise = {
  totalOrcado: number; totalGasto: number; saldo: number; percentagemGasto: number;
  orcamento: { capitulo: string; orcado: number }[];
  custos: { categoria: string; gasto: number }[];
  ultimoAvanco: Avanco | null;
};

const TABS = ["Dados", "Custos", "Autos", "Analise"] as const;
type Tab = typeof TABS[number];

const fmt = (v: number) => v.toLocaleString("pt-PT", { style: "currency", currency: "EUR" });
const fmtPct = (v: number) => v.toFixed(1) + "%";

export default function ObraDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("Dados");
  const [obra, setObra] = useState<Obra | null>(null);
  const [custos, setCustos] = useState<Custo[]>([]);
  const [avancos, setAvancos] = useState<Avanco[]>([]);
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [loading, setLoading] = useState(true);

  // Forms
  const [newCusto, setNewCusto] = useState({ data: "", descricao: "", categoria: "mao_obra", fornecedor: "", numero_fatura: "", valor: "" });
  const [newAvanco, setNewAvanco] = useState({ data: "", percentagem: "", valor_executado: "", observacoes: "" });
  const [savingCusto, setSavingCusto] = useState(false);
  const [savingAvanco, setSavingAvanco] = useState(false);

  useEffect(() => {
    fetch(`/api/obras/${id}`)
      .then(r => r.json()).then(setObra).catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (tab === "Custos") fetch(`/api/obras/${id}/custos`).then(r => r.json()).then(setCustos);
    if (tab === "Autos") fetch(`/api/obras/${id}/avancos`).then(r => r.json()).then(setAvancos);
    if (tab === "Analise") fetch(`/api/obras/${id}/analise`).then(r => r.json()).then(setAnalise);
  }, [tab, id]);

  const addCusto = async () => {
    if (!newCusto.descricao || !newCusto.valor) return;
    setSavingCusto(true);
    await fetch(`/api/obras/${id}/custos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newCusto, valor: parseFloat(newCusto.valor) }),
    });
    setNewCusto({ data: "", descricao: "", categoria: "mao_obra", fornecedor: "", numero_fatura: "", valor: "" });
    const r = await fetch(`/api/obras/${id}/custos`);
    setCustos(await r.json());
    setSavingCusto(false);
  };

  const deleteCusto = async (custoId: string) => {
    await fetch(`/api/obras/${id}/custos?custoId=${custoId}`, { method: "DELETE" });
    setCustos(c => c.filter(x => x.id !== custoId));
  };

  const addAvanco = async () => {
    if (!newAvanco.percentagem) return;
    setSavingAvanco(true);
    await fetch(`/api/obras/${id}/avancos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newAvanco, percentagem: parseFloat(newAvanco.percentagem), valor_executado: parseFloat(newAvanco.valor_executado || "0") }),
    });
    setNewAvanco({ data: "", percentagem: "", valor_executado: "", observacoes: "" });
    const r = await fetch(`/api/obras/${id}/avancos`);
    setAvancos(await r.json());
    setSavingAvanco(false);
  };

  const deleteAvanco = async (avancoId: string) => {
    await fetch(`/api/obras/${id}/avancos?avancoId=${avancoId}`, { method: "DELETE" });
    setAvancos(a => a.filter(x => x.id !== avancoId));
  };

  if (loading) return <div className="p-8 text-gray-500">A carregar...</div>;
  if (!obra) return <div className="p-8 text-red-500">Obra nao encontrada.</div>;

  const totalCustos = custos.reduce((s, c) => s + Number(c.valor), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <button onClick={() => router.push("/obras")} className="text-gray-400 hover:text-gray-600 text-sm">← Obras</button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{obra.nome}</h1>
          {obra.morada && <p className="text-sm text-gray-500">{obra.morada}</p>}
        </div>
        <span className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${obra.estado === "em_curso" ? "bg-green-100 text-green-700" : obra.estado === "concluida" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>
          {obra.estado?.replace("_", " ") || "em curso"}
        </span>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b px-6">
        <nav className="flex gap-0">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              {t === "Analise" ? "Analise" : t}
            </button>
          ))}
        </nav>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">

        {/* TAB: DADOS */}
        {tab === "Dados" && (
          <div className="bg-white rounded-lg border p-6 grid grid-cols-2 gap-4">
            <div><label className="text-xs text-gray-500 uppercase">Nome</label><p className="font-medium mt-1">{obra.nome}</p></div>
            <div><label className="text-xs text-gray-500 uppercase">Estado</label><p className="font-medium mt-1">{obra.estado || "em curso"}</p></div>
            <div><label className="text-xs text-gray-500 uppercase">Morada</label><p className="font-medium mt-1">{obra.morada || "—"}</p></div>
            <div><label className="text-xs text-gray-500 uppercase">NIF/NIPC</label><p className="font-medium mt-1">{obra.nipc || "—"}</p></div>
            <div><label className="text-xs text-gray-500 uppercase">Data Inicio</label><p className="font-medium mt-1">{obra.data_inicio || "—"}</p></div>
            <div><label className="text-xs text-gray-500 uppercase">Data Fim</label><p className="font-medium mt-1">{obra.data_fim || "—"}</p></div>
            {obra.descricao && <div className="col-span-2"><label className="text-xs text-gray-500 uppercase">Descricao</label><p className="font-medium mt-1">{obra.descricao}</p></div>}
          </div>
        )}

        {/* TAB: CUSTOS */}
        {tab === "Custos" && (
          <div className="space-y-4">
            {/* Add form */}
            <div className="bg-white rounded-lg border p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Registar Custo</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input type="date" placeholder="Data" value={newCusto.data} onChange={e => setNewCusto(p => ({ ...p, data: e.target.value }))}
                  className="border rounded px-3 py-2 text-sm" />
                <select value={newCusto.categoria} onChange={e => setNewCusto(p => ({ ...p, categoria: e.target.value }))}
                  className="border rounded px-3 py-2 text-sm">
                  <option value="mao_obra">Mao de Obra</option>
                  <option value="materiais">Materiais</option>
                  <option value="subempreitada">Subempreitada</option>
                  <option value="equipamento">Equipamento</option>
                  <option value="outro">Outro</option>
                </select>
                <input placeholder="Descricao *" value={newCusto.descricao} onChange={e => setNewCusto(p => ({ ...p, descricao: e.target.value }))}
                  className="border rounded px-3 py-2 text-sm col-span-2" />
                <input placeholder="Fornecedor" value={newCusto.fornecedor} onChange={e => setNewCusto(p => ({ ...p, fornecedor: e.target.value }))}
                  className="border rounded px-3 py-2 text-sm" />
                <input placeholder="N. Fatura" value={newCusto.numero_fatura} onChange={e => setNewCusto(p => ({ ...p, numero_fatura: e.target.value }))}
                  className="border rounded px-3 py-2 text-sm" />
                <input type="number" placeholder="Valor (EUR) *" value={newCusto.valor} onChange={e => setNewCusto(p => ({ ...p, valor: e.target.value }))}
                  className="border rounded px-3 py-2 text-sm" />
                <button onClick={addCusto} disabled={savingCusto}
                  className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {savingCusto ? "A guardar..." : "Adicionar"}
                </button>
              </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-lg border overflow-hidden">
              <div className="px-4 py-3 border-b flex justify-between items-center">
                <h3 className="text-sm font-semibold text-gray-700">Custos Registados</h3>
                <span className="text-sm font-semibold text-gray-900">{fmt(totalCustos)}</span>
              </div>
              {custos.length === 0 ? (
                <p className="p-6 text-center text-sm text-gray-400">Sem custos registados.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-4 py-2 text-left">Data</th>
                      <th className="px-4 py-2 text-left">Descricao</th>
                      <th className="px-4 py-2 text-left">Categoria</th>
                      <th className="px-4 py-2 text-left">Fornecedor</th>
                      <th className="px-4 py-2 text-right">Valor</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {custos.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-600">{c.data?.slice(0,10)}</td>
                        <td className="px-4 py-2 font-medium">{c.descricao}</td>
                        <td className="px-4 py-2 text-gray-500">{c.categoria}</td>
                        <td className="px-4 py-2 text-gray-500">{c.fornecedor || "—"}</td>
                        <td className="px-4 py-2 text-right font-medium">{fmt(Number(c.valor))}</td>
                        <td className="px-4 py-2 text-right">
                          <button onClick={() => deleteCusto(c.id)} className="text-red-400 hover:text-red-600 text-xs">remover</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* TAB: AUTOS */}
        {tab === "Autos" && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg border p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Registar Auto de Medicao</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input type="date" placeholder="Data" value={newAvanco.data} onChange={e => setNewAvanco(p => ({ ...p, data: e.target.value }))}
                  className="border rounded px-3 py-2 text-sm" />
                <input type="number" placeholder="% Execucao *" value={newAvanco.percentagem} onChange={e => setNewAvanco(p => ({ ...p, percentagem: e.target.value }))}
                  className="border rounded px-3 py-2 text-sm" min="0" max="100" />
                <input type="number" placeholder="Valor Executado (EUR)" value={newAvanco.valor_executado} onChange={e => setNewAvanco(p => ({ ...p, valor_executado: e.target.value }))}
                  className="border rounded px-3 py-2 text-sm" />
                <input placeholder="Observacoes" value={newAvanco.observacoes} onChange={e => setNewAvanco(p => ({ ...p, observacoes: e.target.value }))}
                  className="border rounded px-3 py-2 text-sm" />
                <button onClick={addAvanco} disabled={savingAvanco}
                  className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 col-span-2">
                  {savingAvanco ? "A guardar..." : "Registar Auto"}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg border overflow-hidden">
              <div className="px-4 py-3 border-b">
                <h3 className="text-sm font-semibold text-gray-700">Historico de Autos</h3>
              </div>
              {avancos.length === 0 ? (
                <p className="p-6 text-center text-sm text-gray-400">Sem autos registados.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-4 py-2 text-left">Auto</th>
                      <th className="px-4 py-2 text-left">Data</th>
                      <th className="px-4 py-2 text-right">% Execucao</th>
                      <th className="px-4 py-2 text-right">Valor Executado</th>
                      <th className="px-4 py-2 text-left">Obs.</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {avancos.map(a => (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">#{a.numero}</td>
                        <td className="px-4 py-2 text-gray-600">{a.data?.slice(0,10)}</td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-1.5">
                              <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, a.percentagem)}%` }} />
                            </div>
                            <span>{fmtPct(Number(a.percentagem))}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right font-medium">{fmt(Number(a.valor_executado))}</td>
                        <td className="px-4 py-2 text-gray-500 text-xs">{a.observacoes || "—"}</td>
                        <td className="px-4 py-2 text-right">
                          <button onClick={() => deleteAvanco(a.id)} className="text-red-400 hover:text-red-600 text-xs">remover</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* TAB: ANALISE */}
        {tab === "Analise" && (
          <div className="space-y-4">
            {!analise ? (
              <p className="text-center text-sm text-gray-400 py-8">A carregar analise...</p>
            ) : (
              <>
                {/* KPIs */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg border p-4">
                    <p className="text-xs text-gray-500 uppercase">Orcado</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(analise.totalOrcado)}</p>
                  </div>
                  <div className="bg-white rounded-lg border p-4">
                    <p className="text-xs text-gray-500 uppercase">Gasto Real</p>
                    <p className={`text-2xl font-bold mt-1 ${analise.totalGasto > analise.totalOrcado ? "text-red-600" : "text-green-600"}`}>
                      {fmt(analise.totalGasto)}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg border p-4">
                    <p className="text-xs text-gray-500 uppercase">Saldo</p>
                    <p className={`text-2xl font-bold mt-1 ${analise.saldo < 0 ? "text-red-600" : "text-green-600"}`}>
                      {fmt(analise.saldo)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{fmtPct(analise.percentagemGasto)} do orcamento gasto</p>
                  </div>
                </div>

                {/* Progresso */}
                {analise.ultimoAvanco && (
                  <div className="bg-white rounded-lg border p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Ultimo Auto de Medicao</h3>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 bg-gray-200 rounded-full h-3">
                        <div className="bg-blue-500 h-3 rounded-full transition-all"
                          style={{ width: `${Math.min(100, analise.ultimoAvanco.percentagem)}%` }} />
                      </div>
                      <span className="text-sm font-semibold">{fmtPct(Number(analise.ultimoAvanco.percentagem))}</span>
                      <span className="text-sm text-gray-500">Auto #{analise.ultimoAvanco.numero} — {analise.ultimoAvanco.data?.slice(0,10)}</span>
                    </div>
                  </div>
                )}

                {/* Custos por categoria */}
                {analise.custos.length > 0 && (
                  <div className="bg-white rounded-lg border p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Custos por Categoria</h3>
                    <div className="space-y-2">
                      {analise.custos.map(c => (
                        <div key={c.categoria} className="flex items-center gap-3">
                          <span className="text-sm text-gray-600 w-32 capitalize">{c.categoria.replace("_", " ")}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div className="bg-orange-400 h-2 rounded-full"
                              style={{ width: analise.totalGasto > 0 ? `${(Number(c.gasto) / analise.totalGasto) * 100}%` : "0%" }} />
                          </div>
                          <span className="text-sm font-medium w-24 text-right">{fmt(Number(c.gasto))}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Orcamento por capitulo */}
                {analise.orcamento.length > 0 && (
                  <div className="bg-white rounded-lg border p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Orcamento por Capitulo</h3>
                    <table className="w-full text-sm">
                      <thead className="text-xs text-gray-500 uppercase">
                        <tr>
                          <th className="py-1 text-left">Capitulo</th>
                          <th className="py-1 text-right">Orcado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {analise.orcamento.map(o => (
                          <tr key={o.capitulo}>
                            <td className="py-2 text-gray-600">{o.capitulo}</td>
                            <td className="py-2 text-right font-medium">{fmt(Number(o.orcado))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
