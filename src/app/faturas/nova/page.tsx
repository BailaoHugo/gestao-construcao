'use client';
import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface Contrato {
  id: string;
  propostaCodigo: string;
  clienteNome: string;
  totalVenda: number;
}

interface CapituloRow {
  capitulo: string;
  descricao: string;
  valor_contrato: number;
  percentagem_anterior: number;
  percentagem_atual: number;
}

function NovaFaturaForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const preContratoId = searchParams.get('contrato') ?? '';

  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [contratoId, setContratoId] = useState(preContratoId);
  const [tipo, setTipo] = useState<'adjudicacao' | 'auto'>('adjudicacao');
  const [percentagemAdj, setPercentagemAdj] = useState(30);
  const [taxaIva, setTaxaIva] = useState(23);
  const [notas, setNotas] = useState('');
  const [capitulos, setCapitulos] = useState<CapituloRow[]>([
    { capitulo: '', descricao: '', valor_contrato: 0, percentagem_anterior: 0, percentagem_atual: 0 },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/contratos')
      .then(r => r.json())
      .then(data => setContratos(Array.isArray(data) ? data : (data.contratos ?? [])))
      .catch(() => {});
  }, []);

  const addCapitulo = () =>
    setCapitulos(prev => [...prev, { capitulo: '', descricao: '', valor_contrato: 0, percentagem_anterior: 0, percentagem_atual: 0 }]);

  const removeCapitulo = (idx: number) =>
    setCapitulos(prev => prev.filter((_, i) => i !== idx));

  const updateCapitulo = (idx: number, field: keyof CapituloRow, value: string | number) =>
    setCapitulos(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contratoId) { setError('Selecione um contrato.'); return; }
    setSaving(true);
    setError('');
    try {
      const body: Record<string, unknown> = {
        contratoId,
        tipo,
        percentagemAdjudicacao: percentagemAdj,
        taxaIva,
        notas,
      };
      if (tipo === 'auto') body.capitulos = capitulos;
      const res = await fetch('/api/faturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const fatura = await res.json();
      router.push(`/faturas/${fatura.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar fatura');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <a href="/faturas" className="text-sm text-blue-600 hover:underline">← Voltar às faturas</a>
        <h1 className="text-2xl font-bold mt-2">Nova Fatura</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-xl border p-6 shadow-sm">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

        {/* Contrato */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contrato</label>
          <select
            value={contratoId}
            onChange={e => setContratoId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Selecionar contrato…</option>
            {contratos.map(c => (
              <option key={c.id} value={c.id}>
                {c.propostaCodigo} — {c.clienteNome}
              </option>
            ))}
          </select>
        </div>

        {/* Tipo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Fatura</label>
          <div className="flex gap-4">
            {(['adjudicacao', 'auto'] as const).map(t => (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="tipo"
                  value={t}
                  checked={tipo === t}
                  onChange={() => setTipo(t)}
                  className="text-blue-600"
                />
                <span className="text-sm">{t === 'adjudicacao' ? 'Adjudicação' : 'Auto de Medição'}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Percentagem Adjudicação */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">% Adjudicação</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={percentagemAdj}
              onChange={e => setPercentagemAdj(Number(e.target.value))}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Taxa IVA (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={taxaIva}
              onChange={e => setTaxaIva(Number(e.target.value))}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Capítulos (só Auto) */}
        {tipo === 'auto' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Capítulos</label>
              <button type="button" onClick={addCapitulo} className="text-sm text-blue-600 hover:underline">+ Adicionar</button>
            </div>
            <div className="space-y-3">
              {capitulos.map((cap, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded p-2">
                  <input
                    placeholder="Cap."
                    value={cap.capitulo}
                    onChange={e => updateCapitulo(idx, 'capitulo', e.target.value)}
                    className="col-span-1 border rounded px-2 py-1 text-xs"
                  />
                  <input
                    placeholder="Descrição"
                    value={cap.descricao}
                    onChange={e => updateCapitulo(idx, 'descricao', e.target.value)}
                    className="col-span-4 border rounded px-2 py-1 text-xs"
                  />
                  <input
                    type="number"
                    placeholder="Valor contrato"
                    value={cap.valor_contrato}
                    onChange={e => updateCapitulo(idx, 'valor_contrato', Number(e.target.value))}
                    className="col-span-2 border rounded px-2 py-1 text-xs"
                  />
                  <input
                    type="number"
                    placeholder="% Ant."
                    value={cap.percentagem_anterior}
                    onChange={e => updateCapitulo(idx, 'percentagem_anterior', Number(e.target.value))}
                    className="col-span-2 border rounded px-2 py-1 text-xs"
                  />
                  <input
                    type="number"
                    placeholder="% Atual"
                    value={cap.percentagem_atual}
                    onChange={e => updateCapitulo(idx, 'percentagem_atual', Number(e.target.value))}
                    className="col-span-2 border rounded px-2 py-1 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => removeCapitulo(idx)}
                    className="col-span-1 text-red-500 hover:text-red-700 text-xs"
                  >✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
          <textarea
            value={notas}
            onChange={e => setNotas(e.target.value)}
            rows={3}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex justify-end gap-3">
          <a href="/faturas" className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</a>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'A guardar…' : 'Criar Fatura'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NovaFaturaPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-500">A carregar…</div>}>
      <NovaFaturaForm />
    </Suspense>
  );
}
