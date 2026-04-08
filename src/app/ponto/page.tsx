'use client';

import { useState, useEffect, useCallback } from 'react';

interface Trabalhador {
  id: string;
  nome: string;
  cargo: string | null;
  custoHora: number;
}

interface Obra {
  id: string;
  code: string;
  nome: string;
}

interface Registo {
  id: string;
  trabalhadorId: string;
  obraId: string | null;
  data: string;
  horas: number;
  custo: number | null;
  notas: string | null;
  trabalhadorNome: string;
  obraNome: string | null;
  obraCode: string | null;
}

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];
const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

function getDiasDoMes(ano: number, mes: number): Date[] {
  const dias: Date[] = [];
  const d = new Date(ano, mes - 1, 1);
  while (d.getMonth() === mes - 1) {
    dias.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return dias;
}

function isWeekday(d: Date) {
  const dow = d.getDay();
  return dow !== 0 && dow !== 6;
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function PontoPage() {
  const today = new Date();
  const [ano, setAno] = useState(today.getFullYear());
  const [mes, setMes] = useState(today.getMonth() + 1);

  const [trabalhadores, setTrabalhadores] = useState<Trabalhador[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [registos, setRegistos] = useState<Registo[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupDone, setSetupDone] = useState(false);

  // Modal state
  const [modal, setModal] = useState<{ trabalhador: Trabalhador; data: string } | null>(null);
  const [formObra, setFormObra] = useState('');
  const [formHoras, setFormHoras] = useState('8');
  const [formNotas, setFormNotas] = useState('');
  const [saving, setSaving] = useState(false);

  const mesStr = `${ano}-${String(mes).padStart(2, '0')}`;
  const dias = getDiasDoMes(ano, mes);
  const diasUteis = dias.filter(isWeekday).length;

  const doSetup = useCallback(async () => {
    if (setupDone) return;
    try {
      await fetch('/api/ponto/setup');
      setSetupDone(true);
    } catch { /* silent */ }
  }, [setupDone]);

  const loadData = useCallback(async () => {
    setLoading(true);
    await doSetup();
    try {
      const r = await fetch(`/api/ponto?mes=${mesStr}`);
      if (r.ok) {
        const d = await r.json();
        setTrabalhadores(d.trabalhadores ?? []);
        setObras(d.obras ?? []);
        setRegistos(d.registos ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [mesStr, doSetup]);

  useEffect(() => { loadData(); }, [loadData]);

  // Current registo for open modal cell
  const modalRegisto = modal
    ? registos.find(r => r.trabalhadorId === modal.trabalhador.id && r.data === modal.data) ?? null
    : null;

  // Map: trabalhadorId → date → horas
  const mapaHoras = new Map<string, Map<string, number>>();
  for (const r of registos) {
    if (!mapaHoras.has(r.trabalhadorId)) mapaHoras.set(r.trabalhadorId, new Map());
    mapaHoras.get(r.trabalhadorId)!.set(r.data, r.horas);
  }
  // Map: trabalhadorId → date → obraCode
  const mapaObra = new Map<string, Map<string, string>>();
  for (const r of registos) {
    if (r.obraCode) {
        if (!mapaObra.has(r.trabalhadorId)) mapaObra.set(r.trabalhadorId, new Map());
            mapaObra.get(r.trabalhadorId)!.set(r.data, r.obraCode);
              }
              }

  const totalMes = (trabId: string) => {
    const m = mapaHoras.get(trabId);
    if (!m) return 0;
    let sum = 0;
    for (const v of m.values()) sum += v;
    return sum;
  };

  const openModal = (trabalhador: Trabalhador, dia: Date) => {
    const data = isoDate(dia);
    const reg = registos.find(r => r.trabalhadorId === trabalhador.id && r.data === data);
    setModal({ trabalhador, data });
    setFormObra(reg?.obraId ?? obras[0]?.id ?? '');
    setFormHoras(reg ? String(reg.horas) : '8');
    setFormNotas(reg?.notas ?? '');
  };

  const saveRegisto = async () => {
    if (!modal) return;
    setSaving(true);
    try {
      const r = await fetch('/api/ponto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trabalhadorId: modal.trabalhador.id,
          obraId: formObra || null,
          data: modal.data,
          horas: parseFloat(formHoras) || 8,
          notas: formNotas || null,
        }),
      });
      if (r.ok) { await loadData(); setModal(null); }
    } finally { setSaving(false); }
  };

  const deleteRegisto = async () => {
    if (!modalRegisto) return;
    setSaving(true);
    try {
      await fetch(`/api/ponto?id=${modalRegisto.id}`, { method: 'DELETE' });
      await loadData();
      setModal(null);
    } finally { setSaving(false); }
  };

  const navMes = (dir: number) => {
    let m = mes + dir, a = ano;
    if (m < 1) { m = 12; a--; }
    if (m > 12) { m = 1; a++; }
    setMes(m); setAno(a);
  };

  return (
    <div className="p-4 md:p-6 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Mapa de Ponto</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {MESES[mes - 1]} {ano} · {diasUteis} dias úteis · {trabalhadores.length} trabalhadores
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navMes(-1)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-lg leading-none">‹</button>
          <span className="text-sm font-semibold text-slate-700 px-3">{MESES[mes - 1]} {ano}</span>
          <button onClick={() => navMes(1)} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-lg leading-none">›</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-slate-400 text-sm">A carregar...</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
            <table className="text-xs border-collapse" style={{ minWidth: 'max-content' }}>
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="sticky left-0 z-20 bg-slate-50 border-r border-slate-200 px-3 py-2.5 text-left text-slate-600 font-semibold min-w-[160px]">
                    Trabalhador
                  </th>
                  {dias.map(d => {
                    const wd = isWeekday(d);
                    return (
                      <th key={isoDate(d)} className={`border-r border-slate-200 px-0.5 py-1.5 text-center min-w-[34px] w-[34px] font-medium ${wd ? 'text-slate-600' : 'text-slate-400 bg-slate-100/80'}`}>
                        <div className="text-xs leading-none">{d.getDate()}</div>
                        <div className="text-[8px] leading-none mt-0.5 font-normal opacity-70">{DIAS_SEMANA[d.getDay()]}</div>
                      </th>
                    );
                  })}
                  <th className="border-slate-200 px-3 py-2.5 text-center text-slate-600 font-semibold min-w-[80px]">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {trabalhadores.length === 0 ? (
                  <tr>
                    <td colSpan={dias.length + 2} className="text-center py-16 text-slate-400">
                      Nenhum trabalhador ativo. Adicione trabalhadores em Controlo de Obra.
                    </td>
                  </tr>
                ) : (
                  trabalhadores.map((t, ti) => {
                    const mHoras = mapaHoras.get(t.id) ?? new Map();
                    const mObra = mapaObra.get(t.id) ?? new Map();
                    const total = totalMes(t.id);
                    return (
                      <tr key={t.id} className={`border-b border-slate-200 ${ti % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                        <td className="sticky left-0 z-10 bg-white border-r border-slate-200 px-3 py-2">
                          <div className="font-medium text-slate-800 leading-tight">{t.nome}</div>
                          {t.cargo && <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{t.cargo}</div>}
                        </td>
                        {dias.map(d => {
                          const wd = isWeekday(d);
                          const data = isoDate(d);
                          const h = mHoras.get(data) ?? 0;
                          const obraCode = mObra.get(data) ?? null;
                          let cls = 'border-r border-slate-100 text-center transition-colors select-none ';
                          if (!wd) {
                            cls += 'bg-slate-100/60 text-slate-300';
                          } else if (h === 0) {
                            cls += 'bg-red-50 text-red-400 hover:bg-red-100 cursor-pointer';
                          } else if (h >= 8) {
                            cls += 'bg-green-50 text-green-700 hover:bg-green-100 cursor-pointer';
                          } else {
                            cls += 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 cursor-pointer';
                          }
                          return (
                            <td key={data} className={cls} onClick={() => wd && openModal(t, d)}>
                              <span className="block py-1.5 text-[11px] font-semibold">
                                {!wd ? '' : h > 0 ? (h % 1 === 0 ? h : h.toFixed(1)) : '!'}
                              </span>
                              {wd && h > 0 && obraCode && (
                                              <div className="text-[8px] font-normal opacity-50 leading-none truncate">{obraCode}</div>
                                                          )}
                              </td>
                          );
                        })}
                        <td className="px-3 py-2 text-center font-semibold">
                          <span className={total < diasUteis * 8 ? 'text-amber-600' : 'text-green-700'}>
                            {total % 1 === 0 ? total : total.toFixed(1)}h
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-green-200"></span>≥ 8h OK</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-yellow-200"></span>Parcial (&lt; 8h)</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-red-200"></span>! Sem registo (dia útil)</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-slate-200"></span>Fim de semana</span>
          </div>
        </>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-bold text-slate-800 text-base">{modal.trabalhador.nome}</h2>
                <p className="text-sm text-slate-500">
                  {new Date(modal.data + 'T12:00:00').toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none ml-2">×</button>
            </div>

            {/* Current record */}
            {modalRegisto && (
              <div className="mb-4 bg-blue-50 rounded-xl px-4 py-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-blue-800 text-sm">{modalRegisto.horas}h</span>
                    {modalRegisto.obraNome && (
                      <span className="ml-2 text-blue-600 text-xs">{modalRegisto.obraCode} · {modalRegisto.obraNome}</span>
                    )}
                  </div>
                  <button onClick={deleteRegisto} className="text-xs text-red-400 hover:text-red-600 font-medium">Apagar</button>
                </div>
                {modalRegisto.notas && <p className="text-xs text-blue-500 mt-1">{modalRegisto.notas}</p>}
              </div>
            )}

            {/* Form */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {modalRegisto ? 'Atualizar registo' : 'Novo registo'}
              </p>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Obra</label>
                <select value={formObra} onChange={e => setFormObra(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">— Sem obra —</option>
                  {obras.map(o => <option key={o.id} value={o.id}>{o.code} · {o.nome}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Horas</label>
                <div className="flex gap-2">
                  {['4', '8'].map(h => (
                    <button key={h} type="button" onClick={() => setFormHoras(h)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${formHoras === h ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      {h}h
                    </button>
                  ))}
                  <input type="number" min="0.5" max="24" step="0.5" value={formHoras}
                    onChange={e => setFormHoras(e.target.value)}
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Notas (opcional)</label>
                <input type="text" value={formNotas} onChange={e => setFormNotas(e.target.value)}
                  placeholder="Ausência, trabalho extra..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setModal(null)}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button type="button" onClick={saveRegisto} disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {saving ? 'A guardar…' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
