'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Fatura } from '@/faturas/domain';
import { fmtEur, fmtData, fmtEstado, fmtTipo } from '@/faturas/format';

export default function FaturaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [fatura, setFatura] = useState<Fatura | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emitindo, setEmitindo] = useState(false);

  async function fetchFatura() {
    try {
      const r = await fetch(`/api/faturas/${id}`);
      if (!r.ok) throw new Error('not found');
      setFatura(await r.json());
    } catch {
      setError('Fatura não encontrada.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchFatura(); }, [id]);

  async function handleEmitir() {
    if (!confirm('Confirma a emissão desta fatura? Esta ação não pode ser desfeita.')) return;
    setEmitindo(true);
    try {
      const r = await fetch(`/api/faturas/${id}/emitir`, { method: 'POST' });
      if (!r.ok) throw new Error();
      setFatura(await r.json());
    } catch {
      alert('Erro ao emitir fatura.');
    } finally {
      setEmitindo(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400">A carregar...</p></div>;

  if (error || !fatura) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-600 mb-4">{error ?? 'Fatura não encontrada'}</p>
        <Link href="/faturas" className="text-blue-600 hover:underline">← Voltar às faturas</Link>
      </div>
    </div>
  );

  const estado = fmtEstado(fatura.estado);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/faturas" className="text-gray-400 hover:text-gray-600 text-sm">← Faturas</Link>
            <span className="text-gray-300">|</span>
            <span className="text-gray-700 font-medium">{fatura.numero}</span>
            <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded" style={{ backgroundColor: estado.bg, color: estado.text }}>{estado.label}</span>
          </div>
          <div className="flex items-center gap-3">
            <a href={`/api/faturas/${fatura.id}/pdf`} target="_blank" rel="noopener noreferrer"
              className="border border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              📄 Ver PDF
            </a>
            {fatura.estado === 'RASCUNHO' && (
              <button onClick={handleEmitir} disabled={emitindo}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                {emitindo ? 'A emitir...' : 'Emitir Fatura'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <InfoCard label="Tipo" value={fmtTipo(fatura.tipo, fatura.numeroAuto)} />
          <InfoCard label="Cliente" value={fatura.clienteNome} bold />
          <InfoCard label="Proposta" value={fatura.propostaCodigo} />
          <InfoCard label="Data de Emissão" value={fatura.dataEmissao ? fmtData(fatura.dataEmissao) : '—'} />
          <InfoCard label="Vencimento" value={fatura.dataVencimento ? fmtData(fatura.dataVencimento) : '—'} />
          <InfoCard label="Taxa IVA" value={`${fatura.taxaIva}%`} />
        </div>

        {fatura.tipo === 'auto' && fatura.capitulos.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100"><h2 className="font-semibold text-gray-800">Avanço por Capítulo</h2></div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Cap.</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Descrição</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Valor Obra</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">% Ant.</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">% Atual</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Valor Auto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {fatura.capitulos.map((cap, i) => {
                  const valorAuto = cap.valorContrato * (cap.percentagemAtual - cap.percentagemAnterior) / 100;
                  return (
                    <tr key={cap.id} className={i % 2 === 1 ? 'bg-gray-50' : ''}>
                      <td className="px-5 py-3 font-mono text-gray-600">{cap.capitulo}</td>
                      <td className="px-5 py-3 text-gray-800">{cap.descricao}</td>
                      <td className="px-5 py-3 text-right text-gray-600">{fmtEur(cap.valorContrato)}</td>
                      <td className="px-5 py-3 text-right text-gray-500">{cap.percentagemAnterior}%</td>
                      <td className="px-5 py-3 text-right font-medium text-gray-800">{cap.percentagemAtual}%</td>
                      <td className="px-5 py-3 text-right font-medium text-gray-800">{fmtEur(valorAuto)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {fatura.tipo === 'adjudicacao' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100"><h2 className="font-semibold text-gray-800">Detalhe da Fatura</h2></div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Descrição</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Percentagem</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Valor</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-5 py-3 text-gray-800">Adjudicação de obra — adiantamento inicial</td>
                  <td className="px-5 py-3 text-right text-gray-600">{fatura.percentagemAdjudicacao}%</td>
                  <td className="px-5 py-3 text-right font-medium text-gray-800">{fmtEur(fatura.valorBase)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end">
          <div className="w-80 bg-white rounded-xl border border-gray-200 overflow-hidden">
            {fatura.tipo === 'auto' && (
              <>
                <TotalsRow label="Valor dos Trabalhos" value={fmtEur(fatura.valorTrabalhosBruto)} />
                <TotalsRow label={`Desconto Adjudicação (${fatura.percentagemAdjudicacao}%)`} value={`– ${fmtEur(fatura.descontoAdjudicacao)}`} />
              </>
            )}
            <TotalsRow label="Base Tributável" value={fmtEur(fatura.valorBase)} sep />
            <TotalsRow label={`IVA (${fatura.taxaIva}%)`} value={fmtEur(fatura.valorIva)} />
            <div className="bg-blue-600 px-5 py-4 flex justify-between items-center">
              <span className="font-bold text-white">TOTAL A PAGAR</span>
              <span className="font-bold text-white text-lg">{fmtEur(fatura.valorTotal)}</span>
            </div>
          </div>
        </div>

        {fatura.notas && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-800 mb-2">Notas</h2>
            <p className="text-gray-600 text-sm whitespace-pre-wrap">{fatura.notas}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCard({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-gray-800 ${bold ? 'font-semibold' : ''}`}>{value}</p>
    </div>
  );
}

function TotalsRow({ label, value, sep }: { label: string; value: string; sep?: boolean }) {
  return (
    <div className={`px-5 py-3 flex justify-between text-sm ${sep ? 'border-t border-gray-200' : ''}`}>
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}
