'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { FaturaTipo } from '@/faturas/domain';

interface ContratoOption {
  id: string;
  clienteNome: string;
  propostaCodigo: string;
}

interface Capitulo {
  capitulo: string;
  descricao: string;
  valorContrato: number;
  percentagemAnterior: number;
  percentagemAtual: number;
}

export default function NovaFaturaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preContratoId = searchParams.get('contratoId') ?? '';

  const [contratos, setContratos] = useState<ContratoOption[]>([]);
  const [contratoId, setContratoId] = useState(preContratoId);
  const [tipo, setTipo] = useState<FaturaTipo>('adjudicacao');
  const [percentagemAdjudicacao, setPercentagemAdjudicacao] = useState(30);
  const [taxaIva, setTaxaIva] = useState(23);
  const [notas, setNotas] = useState('');
  const [capitulos, setCapitulos] = useState<Capitulo[]>([
    { capitulo: '', descricao: '', valorContrato: 0, percentagemAnterior: 0, percentagemAtual: 0 },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/contratos')
      .then(r => r.json())
      .then(data => {
        const list = (Array.isArray(data) ? data : []).map((c: any) => ({
          id: c.id, clienteNome: c.clienteNome, propostaCodigo: c.propostaCodigo,
        }));
        setContratos(list);
        if (!contratoId && list.length > 0) setContratoId(list[0].id);
      })
      .catch(() => setError('Erro ao carregar contratos.'));
  }, []);

  function addCapitulo() {
    setCapitulos(prev => [...prev, { capitulo: '', descricao: '', valorContrato: 0, percentagemAnterior: 0, percentagemAtual: 0 }]);
  }

  function removeCapitulo(i: number) {
    setCapitulos(prev => prev.filter((_, idx) => idx !== i));
  }

  function updateCapitulo(i: number, field: keyof Capitulo, value: string | number) {
    setCapitulos(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const body = {
        contratoId, tipo, percentagemAdjudicacao, taxaIva,
        notas: notas.trim(),
        ...(tipo === 'auto' ? { capitulos } : {}),
      };
      const r = await fetch('/api/faturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) { const err = await r.json(); throw new Error(err.error ?? 'Erro'); }
      const fatura = await r.json();
      router.push(`/faturas/${fatura.id}`);
    } catch (err: any) {
      setError(err.message ?? 'Erro ao criar fatura.');
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center gap-3">
          <Link href="/faturas" className="text-gray-400 hover:text-gray-600 text-sm">← Faturas</Link>
          <span className="text-gray-300">|</span>
          <h1 className="text-xl font-semibold text-gray-800">Nova Fatura</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>}

          <Section title="Contrato">
            <label className="block">
              <span className="lbl">Contrato</span>
              <select className="inp" value={contratoId} onChange={e => setContratoId(e.target.value)} required>
                <option value="">Selecione um contrato…</option>
                {contratos.map(c => <option key={c.id} value={c.id}>{c.propostaCodigo} – {c.clienteNome}</option>)}
              </select>
            </label>
          </Section>

          <Section title="Tipo de Fatura">
            <div className="flex gap-6">
              {(['adjudicacao', 'auto'] as FaturaTipo[]).map(t => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="tipo" value={t} checked={tipo === t} onChange={() => setTipo(t)} />
                  <span className="text-sm text-gray-700">{t === 'adjudicacao' ? 'Fatura de Adjudicação' : 'Auto de Medição'}</span>
                </label>
              ))}
            </div>
          </Section>

          <Section title="Configuração">
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="lbl">% Adjudicação</span>
                <input type="number" className="inp" value={percentagemAdjudicacao} min={0} max={100} step={0.01}
                  onChange={e => setPercentagemAdjudicacao(parseFloat(e.target.value))} required />
              </label>
              <label className="block">
                <span className="lbl">Taxa IVA (%)</span>
                <input type="number" className="inp" value={taxaIva} min={0} max={100} step={0.01}
                  onChange={e => setTaxaIva(parseFloat(e.target.value))} required />
              </label>
            </div>
          </Section>

          {tipo === 'auto' && (
            <Section title="Avanço por Capítulo">
              <div className="space-y-2">
                {capitulos.map((cap, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <input className="inp col-span-1 text-center" placeholder="Cap." value={cap.capitulo} onChange={e => updateCapitulo(i, 'capitulo', e.target.value)} />
                    <input className="inp col-span-4" placeholder="Descrição" value={cap.descricao} onChange={e => updateCapitulo(i, 'descricao', e.target.value)} />
                    <input type="number" className="inp col-span-2" placeholder="Valor €" value={cap.valorContrato || ''} min={0} step={0.01} onChange={e => updateCapitulo(i, 'valorContrato', parseFloat(e.target.value) || 0)} />
                    <input type="number" className="inp col-span-2" placeholder="% Ant." value={cap.percentagemAnterior || ''} min={0} max={100} step={0.01} onChange={e => updateCapitulo(i, 'percentagemAnterior', parseFloat(e.target.value) || 0)} />
                    <input type="number" className="inp col-span-2" placeholder="% Atual" value={cap.percentagemAtual || ''} min={0} max={100} step={0.01} onChange={e => updateCapitulo(i, 'percentagemAtual', parseFloat(e.target.value) || 0)} />
                    <button type="button" onClick={() => removeCapitulo(i)} className="col-span-1 text-gray-400 hover:text-red-500 text-xl leading-none">×</button>
                  </div>
                ))}
                <button type="button" onClick={addCapitulo} className="text-sm text-blue-600 hover:text-blue-800 font-medium mt-1">+ Adicionar capítulo</button>
              </div>
            </Section>
          )}

          <Section title="Notas">
            <textarea className="inp h-24 resize-none" placeholder="Observações opcionais…" value={notas} onChange={e => setNotas(e.target.value)} />
          </Section>

          <div className="flex justify-end gap-3 pt-2">
            <Link href="/faturas" className="border border-gray-300 text-gray-700 text-sm font-medium px-5 py-2 rounded-lg hover:border-gray-400 transition-colors">Cancelar</Link>
            <button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
              {saving ? 'A criar…' : 'Criar Fatura'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .lbl { display: block; font-size: 0.75rem; font-weight: 500; color: #6b7280; margin-bottom: 4px; }
        .inp { width: 100%; border: 1px solid #d1d5db; border-radius: 6px; padding: 6px 10px; font-size: 0.875rem; color: #111827; background: #fff; }
        .inp:focus { outline: 2px solid #3b82f6; border-color: transparent; }
      `}</style>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="font-semibold text-gray-800 mb-4">{title}</h2>
      {children}
    </div>
  );
}
