"use client";

import { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";

interface FaturaVenda {
  id: string;
  toconline_id: string | null;
  numero: string;
  tipo_documento: string | null;
  data: string;
  data_vencimento: string | null;
  cliente_nome: string | null;
  cliente_nif: string | null;
  valor_sem_iva: string | null;
  valor_iva: string | null;
  total: string;
  obra_id: string | null;
  obra_nome: string | null;
  obra_code: string | null;
  notas: string | null;
  estado: string;
}

function fmt(v: number | string | null, decimals = 2) {
  if (v == null || v === "") return "—";
  const n = parseFloat(String(v));
  if (isNaN(n)) return "—";
  return n.toLocaleString("pt-PT", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("pt-PT");
}

export default function VendasPage() {
  const [rows, setRows] = useState<FaturaVenda[]>([]);
  const [total, setTotal] = useState(0);
  const [totalSemIva, setTotalSemIva] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ from, to }).toString();
      const res = await fetch(`/api/vendas?${qs}`);
      const data = await res.json();
      setRows(data.rows ?? []);
      setTotal(data.total ?? 0);
      setTotalSemIva(data.totalSemIva ?? 0);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch(`/api/vendas/sync?from=${from}&to=${to}`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setSyncMsg(`✓ Sincronizado: ${data.upserted} fatura(s)`);
        await load();
      } else {
        setSyncMsg(`Erro: ${data.error}`);
      }
    } catch (e) {
      setSyncMsg(`Erro: ${(e as Error).message}`);
    } finally {
      setSyncing(false);
    }
  };

  const estadoBadge = (estado: string) => {
    if (estado === "paga") return "bg-green-50 text-green-700";
    if (estado === "anulada") return "bg-red-50 text-red-700";
    return "bg-amber-50 text-amber-700";
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Vendas</h1>
            <p className="text-sm text-slate-500 mt-0.5">Faturas emitidas a clientes</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-slate-400 text-sm">–</span>
            <input
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {syncing ? "A sincronizar…" : "⟳ TOC Online"}
            </button>
          </div>
        </div>

        {syncMsg && (
          <div className={`rounded-lg px-4 py-2 text-sm ${syncMsg.startsWith("Erro") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
            {syncMsg}
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Faturas</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">{rows.length}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total s/ IVA</p>
            <p className="mt-1 text-2xl font-bold text-blue-700">{fmt(totalSemIva)} €</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total c/ IVA</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">{fmt(total)} €</p>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
              A carregar…
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <p className="text-sm font-medium">Nenhuma fatura encontrada no período</p>
              <p className="text-xs mt-1">Use &quot;⟳ TOC Online&quot; para sincronizar faturas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Data</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Nº Fatura</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Obra</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">S/ IVA</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">C/ IVA</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmtDate(r.data)}</td>
                      <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{r.numero || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="text-slate-700">{r.cliente_nome || "—"}</div>
                        {r.cliente_nif && (
                          <div className="text-xs text-slate-400">NIF {r.cliente_nif}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.obra_nome ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                            {r.obra_code && <span className="text-blue-400">{r.obra_code}</span>}
                            {r.obra_nome}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Sem obra</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600">{fmt(r.valor_sem_iva)} €</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800">{fmt(r.total)} €</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${estadoBadge(r.estado)}`}>
                          {r.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                  <tr>
                    <td colSpan={4} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Total ({rows.length} faturas)
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-700">{fmt(totalSemIva)} €</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{fmt(total)} €</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
