'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { FaturaResumo } from '@/faturas/domain';
import { fmtEur, fmtData, fmtEstado, fmtTipo } from '@/faturas/format';

export default function FaturasPage() {
  const [faturas, setFaturas] = useState<FaturaResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/faturas')
      .then(r => r.json())
      .then(data => {
        setFaturas(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setError('Erro ao carregar faturas.');
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-600 text-sm">
              ← Início
            </Link>
            <span className="text-gray-300">|</span>
            <h1 className="text-xl font-semibold text-gray-800">Faturação</h1>
          </div>
          <Link
            href="/faturas/nova"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Nova Fatura
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading && <div className="text-center py-20 text-gray-400">A carregar...</div>}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
        )}

        {!loading && !error && faturas.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg mb-2">Nenhuma fatura encontrada</p>
            <p className="text-gray-400 text-sm">Crie a primeira fatura para começar.</p>
          </div>
        )}

        {!loading && faturas.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Número</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Tipo</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Cliente</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Proposta</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Total</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Emissão</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Estado</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {faturas.map(f => {
                  const estado = fmtEstado(f.estado);
                  return (
                    <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-mono text-gray-700">{f.numero}</td>
                      <td className="px-5 py-3 text-gray-600">{fmtTipo(f.tipo, f.numeroAuto)}</td>
                      <td className="px-5 py-3 font-medium text-gray-800">{f.clienteNome}</td>
                      <td className="px-5 py-3 text-gray-500">{f.propostaCodigo}</td>
                      <td className="px-5 py-3 text-right font-medium text-gray-800">{fmtEur(f.valorTotal)}</td>
                      <td className="px-5 py-3 text-gray-500">{f.dataEmissao ? fmtData(f.dataEmissao) : '—'}</td>
                      <td className="px-5 py-3">
                        <span
                          className="inline-block text-xs font-semibold px-2 py-0.5 rounded"
                          style={{ backgroundColor: estado.bg, color: estado.text }}
                        >
                          {estado.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link href={`/faturas/${f.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                          Ver →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
