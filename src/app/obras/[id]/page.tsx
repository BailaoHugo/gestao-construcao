"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Tab = "Dados" | "Custos" | "Autos" | "Analise";

type Obra = {
  id: string; nome?: string; name?: string; estado?: string; status?: string;
  morada?: string; address?: string; nipc?: string; cliente_nome?: string;
  data_inicio?: string; data_fim?: string; descricao?: string;
};

type DespesaItem = {
  id: string; data: string; descricao: string; categoria: string;
  valor: string; fornecedor?: string | null; documento_ref?: string | null;
};

type PontoItem = {
  id: string; data: string; descricao: string;
  horas: string; valor: string; trabalhador: string;
};

type CustosData = {
  despesas: DespesaItem[];
  ponto: PontoItem[];
  totalDespesas: number;
  totalMaoObra: number;
  total: number;
};

type Avanco = {
  id: string; numero: number; data: string;
  percentagem: number; valor_executado?: number; observacoes?: string;
};

type Analise = {
  orcamento: { capitulo: string; orcado: string }[];
  custos: { categoria: string; gasto: string }[];
  totalOrcado: number; totalGasto: number;
  saldo: number; percentagemGasto: number;
  ultimoAvanco: Avanco | null;
};

const fmt = (v: number) =>
  (v || 0).toLocaleString("pt-PT", { style: "currency", currency: "EUR" });

const fmtDate = (d?: string) => {
  if (!d) return "—";
  return d.substring(0, 10);
};

export default function ObraControlePage() {
  const params = useParams();
  const id = params?.id as string;

  const [tab, setTab] = useState<Tab>("Dados");
  const [obra, setObra] = useState<Obra | null>(null);
  const [custos, setCustos] = useState<CustosData>({
    despesas: [], ponto: [], totalDespesas: 0, totalMaoObra: 0, total: 0,
  });
  const [avancos, setAvancos] = useState<Avanco[]>([]);
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [newAvanco, setNewAvanco] = useState({
    data: "", percentagem: "", valor_executado: "", observacoes: "",
  });
  const [loading, setLoading] = useState(true);

  // Fetch obra on mount
  useEffect(() => {
    if (!id) return;
    fetch(`/api/obras/${id}`)
      .then(r => r.json())
      .then(d => setObra(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  // Fetch tab data on tab change
  useEffect(() => {
    if (!id) return;
    if (tab === "Custos") {
      fetch(`/api/obras/${id}/custos`)
        .then(r => r.json())
        .then(d => setCustos(d))
        .catch(console.error);
    }
    if (tab === "Autos") {
      fetch(`/api/obras/${id}/avancos`)
        .then(r => r.json())
        .then(d => setAvancos(Array.isArray(d) ? d : d.rows ?? []))
        .catch(console.error);
    }
    if (tab === "Analise") {
      fetch(`/api/obras/${id}/analise`)
        .then(r => r.json())
        .then(d => setAnalise(d))
        .catch(console.error);
    }
  }, [tab, id]);

  const handleAddAvanco = async () => {
    if (!newAvanco.percentagem) return;
    const res = await fetch(`/api/obras/${id}/avancos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: newAvanco.data || new Date().toISOString().slice(0, 10),
        percentagem: parseFloat(newAvanco.percentagem),
        valor_executado: newAvanco.valor_executado ? parseFloat(newAvanco.valor_executado) : null,
        observacoes: newAvanco.observacoes || null,
      }),
    });
    if (res.ok) {
      const added = await res.json();
      setAvancos(prev => [added, ...prev]);
      setNewAvanco({ data: "", percentagem: "", valor_executado: "", observacoes: "" });
    }
  };

  const handleDeleteAvanco = async (aid: string) => {
    await fetch(`/api/obras/${id}/avancos/${aid}`, { method: "DELETE" });
    setAvancos(prev => prev.filter(a => a.id !== aid));
  };

  if (loading) return <p className="p-8 text-slate-500">A carregar...</p>;
  if (!obra) return <p className="p-8 text-red-500">Obra não encontrada.</p>;

  const nomeFinal = obra.nome || obra.name || "—";
  const estadoFinal = obra.estado || obra.status || "—";

  const TABS: Tab[] = ["Dados", "Custos", "Autos", "Analise"];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => history.back()}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Obras
        </button>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            estadoFinal === "ativo" || estadoFinal === "Ativa"
              ? "bg-green-100 text-green-700"
              : estadoFinal === "concluido" || estadoFinal === "Concluída"
              ? "bg-blue-100 text-blue-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {estadoFinal}
        </span>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── TAB DADOS ─────────────────────────────────────────── */}
      {tab === "Dados" && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            ["Nome", nomeFinal],
            ["Estado", estadoFinal],
            ["Morada", obra.morada || obra.address || "—"],
            ["NIF/NIPC", obra.nipc || "—"],
            ["Data Inicio", fmtDate(obra.data_inicio)],
            ["Data Fim", fmtDate(obra.data_fim)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border p-3">
              <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
              <p className="mt-1 font-medium text-slate-800">{value}</p>
            </div>
          ))}
          {obra.descricao && (
            <div className="col-span-2 rounded-lg border p-3">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Descrição</p>
              <p className="mt-1 text-slate-700">{obra.descricao}</p>
            </div>
          )}
        </div>
      )}

      {/* ── TAB CUSTOS ────────────────────────────────────────── */}
      {tab === "Custos" && (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border p-4">
              <p className="text-xs font-medium text-slate-500 uppercase">Despesas</p>
              <p className="mt-1 text-xl font-bold text-red-600">{fmt(custos.totalDespesas)}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-xs font-medium text-slate-500 uppercase">Mão de Obra</p>
              <p className="mt-1 text-xl font-bold text-orange-500">{fmt(custos.totalMaoObra)}</p>
            </div>
            <div className="rounded-xl border p-4">
              <p className="text-xs font-medium text-slate-500 uppercase">Total</p>
              <p className="mt-1 text-xl font-bold text-slate-800">{fmt(custos.total)}</p>
            </div>
          </div>

          {/* Despesas table */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">
              Despesas{" "}
              <span className="text-xs font-normal text-slate-400">(módulo Despesas)</span>
            </h3>
            {custos.despesas.length === 0 ? (
              <p className="text-sm italic text-slate-400">Sem despesas registadas para esta obra.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-slate-500">
                    <th className="py-1.5 text-left">Data</th>
                    <th className="py-1.5 text-left">Descrição</th>
                    <th className="py-1.5 text-left">Tipo</th>
                    <th className="py-1.5 text-left">Fornecedor</th>
                    <th className="py-1.5 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {custos.despesas.map(d => (
                    <tr key={d.id} className="border-b hover:bg-slate-50">
                      <td className="py-1.5">{fmtDate(d.data)}</td>
                      <td className="py-1.5">{d.descricao}</td>
                      <td className="py-1.5">
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">
                          {d.categoria}
                        </span>
                      </td>
                      <td className="py-1.5 text-slate-500">{d.fornecedor || "—"}</td>
                      <td className="py-1.5 text-right font-medium">
                        {fmt(parseFloat(d.valor))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Ponto table */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-700">
              Mão de Obra{" "}
              <span className="text-xs font-normal text-slate-400">(módulo Ponto)</span>
            </h3>
            {custos.ponto.length === 0 ? (
              <p className="text-sm italic text-slate-400">Sem registos de ponto para esta obra.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-slate-500">
                    <th className="py-1.5 text-left">Data</th>
                    <th className="py-1.5 text-left">Trabalhador</th>
                    <th className="py-1.5 text-right">Horas</th>
                    <th className="py-1.5 text-right">Custo</th>
                  </tr>
                </thead>
                <tbody>
                  {custos.ponto.map(r => (
                    <tr key={r.id} className="border-b hover:bg-slate-50">
                      <td className="py-1.5">{fmtDate(r.data)}</td>
                      <td className="py-1.5">{r.trabalhador}</td>
                      <td className="py-1.5 text-right">{r.horas}h</td>
                      <td className="py-1.5 text-right font-medium">
                        {fmt(parseFloat(r.valor))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── TAB AUTOS ─────────────────────────────────────────── */}
      {tab === "Autos" && (
        <div className="space-y-6">
          <div className="rounded-xl border p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Registar Auto de Medicao</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <input
                type="date"
                placeholder="Data"
                value={newAvanco.data}
                onChange={e => setNewAvanco(p => ({ ...p, data: e.target.value }))}
                className="rounded border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="% Execucao *"
                value={newAvanco.percentagem}
                onChange={e => setNewAvanco(p => ({ ...p, percentagem: e.target.value }))}
                className="rounded border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Valor Executado (EUR)"
                value={newAvanco.valor_executado}
                onChange={e => setNewAvanco(p => ({ ...p, valor_executado: e.target.value }))}
                className="rounded border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Observacoes"
                value={newAvanco.observacoes}
                onChange={e => setNewAvanco(p => ({ ...p, observacoes: e.target.value }))}
                className="rounded border px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleAddAvanco}
              className="mt-3 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Registar Auto
            </button>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-700">Historico de Autos</h3>
            {avancos.length === 0 ? (
              <p className="text-sm italic text-slate-400">Sem autos registados.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-slate-500">
                    <th className="py-1.5 text-left">Auto</th>
                    <th className="py-1.5 text-left">Data</th>
                    <th className="py-1.5 text-left">% Execucao</th>
                    <th className="py-1.5 text-left">Valor Executado</th>
                    <th className="py-1.5 text-left">Obs.</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {avancos.map(a => (
                    <tr key={a.id} className="border-b hover:bg-slate-50">
                      <td className="py-1.5 font-medium">#{a.numero}</td>
                      <td className="py-1.5">{fmtDate(a.data)}</td>
                      <td className="py-1.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-blue-500"
                              style={{ width: `${Math.min(a.percentagem, 100)}%` }}
                            />
                          </div>
                          {a.percentagem}%
                        </div>
                      </td>
                      <td className="py-1.5">
                        {a.valor_executado != null ? fmt(a.valor_executado) : "—"}
                      </td>
                      <td className="py-1.5 text-slate-500">{a.observacoes || "—"}</td>
                      <td className="py-1.5 text-right">
                        <button
                          onClick={() => handleDeleteAvanco(a.id)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          remover
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── TAB ANALISE ───────────────────────────────────────── */}
      {tab === "Analise" && (
        <div className="space-y-6">
          {!analise ? (
            <p className="text-sm text-slate-400">A carregar analise...</p>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "ORCADO", value: fmt(analise.totalOrcado), color: "text-slate-800" },
                  { label: "GASTO REAL", value: fmt(analise.totalGasto), color: "text-red-600" },
                  { label: "SALDO", value: fmt(analise.saldo), color: analise.saldo >= 0 ? "text-green-600" : "text-red-600" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-xl border p-4">
                    <p className="text-xs font-medium text-slate-400 uppercase">{label}</p>
                    <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
                  </div>
                ))}
              </div>

              {/* % gasto bar */}
              <div>
                <p className="mb-1 text-xs text-slate-500">
                  {analise.percentagemGasto.toFixed(1)}% do orcamento gasto
                </p>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${Math.min(analise.percentagemGasto, 100)}%` }}
                  />
                </div>
              </div>

              {/* Ultimo avanco */}
              {analise.ultimoAvanco && (
                <div className="rounded-xl border p-4">
                  <p className="mb-2 text-xs font-medium text-slate-500 uppercase">
                    Ultimo Auto de Medicao
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-green-500"
                        style={{
                          width: `${Math.min(analise.ultimoAvanco.percentagem, 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold">
                      {analise.ultimoAvanco.percentagem}%
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Auto #{analise.ultimoAvanco.numero} — {fmtDate(analise.ultimoAvanco.data)}
                  </p>
                </div>
              )}

              {/* Custos por categoria */}
              {analise.custos.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-slate-700">Custos por Categoria</h3>
                  <div className="space-y-2">
                    {analise.custos.map(c => {
                      const gasto = parseFloat(c.gasto || "0");
                      const pct = analise.totalGasto > 0 ? (gasto / analise.totalGasto) * 100 : 0;
                      return (
                        <div key={c.categoria}>
                          <div className="flex justify-between text-xs text-slate-500 mb-0.5">
                            <span className="capitalize">{c.categoria.replace(/_/g, " ")}</span>
                            <span>{fmt(gasto)}</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-red-400"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Orcamento por capitulo */}
              {analise.orcamento.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-slate-700">
                    Orcamento por Capitulo
                  </h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-slate-500">
                        <th className="py-1.5 text-left">Capitulo</th>
                        <th className="py-1.5 text-right">Orcado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analise.orcamento.map(r => (
                        <tr key={r.capitulo} className="border-b hover:bg-slate-50">
                          <td className="py-1.5">{r.capitulo}</td>
                          <td className="py-1.5 text-right font-medium">
                            {fmt(parseFloat(r.orcado))}
                          </td>
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
  );
}
