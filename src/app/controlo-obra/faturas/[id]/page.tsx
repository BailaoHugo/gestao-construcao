'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

interface DadosExtraidos {
  fornecedorNome?: string;
  fornecedorNif?: string;
  faturaNumero?: string;
  faturaData?: string;
  subtotal?: number;
  iva?: number;
  total?: number;
  observacoes?: string;
  linhas?: { descricao: string; quantidade: number; precoUnitario: number; total: number }[];
}

interface Fatura {
  id: string;
  contratoId: string | null;
  fornecedorId: string | null;
  origem: string;
  estado: string;
  ficheiroNome: string | null;
  ficheiroTipo: string | null;
  emailRemetente: string | null;
  emailAssunto: string | null;
  emailData: string | null;
  dadosExtraidos: DadosExtraidos | null;
  processadoEm: string | null;
  erroProcessamento: string | null;
  notas: string | null;
  criadoEm: string;
  fornecedorNome: string | null;
  contratoNumero: string | null;
  contratoDesignacao: string | null;
}

interface Contrato { id: string; propostaCodigo: string; clienteNome: string; }
interface Fornecedor { id: string; nome: string; nif: string | null; }

function fmt(n: number) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n);
}

const ESTADO_STYLES: Record<string, string> = {
  pendente: 'bg-amber-50 text-amber-700',
  processando: 'bg-blue-50 text-blue-700',
  revisto: 'bg-purple-50 text-purple-700',
  aprovado: 'bg-green-50 text-green-700',
  rejeitado: 'bg-red-50 text-red-700',
};

export default function FaturaReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [fatura, setFatura] = useState<Fatura | null>(null);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [contratoId, setContratoId] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');
  const [notas, setNotas] = useState('');

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`/api/faturas-recebidas/${id}`).then(r => r.json()),
      fetch('/api/contratos').then(r => r.json()),
      fetch('/api/fornecedores').then(r => r.json()),
    ]).then(([f, cs, fs]) => {
      setFatura(f);
      setContratos(Array.isArray(cs) ? cs : []);
      setFornecedores(Array.isArray(fs) ? fs : []);
      setContratoId(f.contratoId ?? '');
      setFornecedorId(f.fornecedorId ?? '');
      setNotas(f.notas ?? '');
    }).finally(() => setLoading(false));
  }, [id]);

  const handleAprovar = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/faturas-recebidas/${id}/aprovar`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contratoId: contratoId || undefined, fornecedorId: fornecedorId || undefined, notas: notas || undefined }),
      });
      if (res.ok) router.push('/controlo-obra/faturas');
    } finally {
      setSaving(false);
    }
  };

  const handleRejeitar = async () => {
    setSaving(true);
    try {
      await fetch(`/api/faturas-recebidas/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ estado: 'rejeitado', notas }),
      });
      router.push('/controlo-obra/faturas');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-sm text-slate-400">A carregar...</div>;
  if (!fatura) return <div className="p-8 text-sm text-red-500">Fatura nÃ£o encontrada.</div>;

  const d = fatura.dadosExtraidos;

  return (
    <div className="min-h-screen bg-surface px-4 py-6 text-slate-900">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header className="no-print flex items-center justify-between rounded-xl bg-white/80 px-6 py-4 shadow-sm ring-1 ring-slate-100">
          <div className="text-sm font-semibold tracking-wide text-slate-800">GestÃ£o ConstruÃ§Ã£o</div>
          <Link href="/controlo-obra/faturas" className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">â Faturas</Link>
        </header>

        <main className="rounded-2xl bg-white/80 p-8 shadow-sm ring-1 ring-slate-100 space-y-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">{fatura.ficheiroNome ?? fatura.emailAssunto ?? 'Fatura'}</h1>
              <p className="text-sm text-slate-500 mt-1">{fatura.origem === 'email' ? `ð§ ${fatura.emailRemetente}` : 'ð Upload'}</p>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${ESTADO_STYLES[fatura.estado] ?? 'bg-slate-100 text-slate-600'}`}>{fatura.estado}</span>
          </div>

          {d && (
            <section>
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Dados ExtraÃ­dos</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {[
                  { label: 'Fornecedor', val: d.fornecedorNome },
                  { label: 'NIF', val: d.fornecedorNif },
                  { label: 'NÂº Fatura', val: d.faturaNumero },
                  { label: 'Data', val: d.faturaData },
                  { label: 'Subtotal', val: d.subtotal != null ? fmt(d.subtotal) : undefined },
                  { label: 'IVA', val: d.iva != null ? fmt(d.iva) : undefined },
                  { label: 'Total', val: d.total != null ? fmt(d.total) : undefined },
                ].filter(x => x.val).map(({ label, val }) => (
                  <div key={label} className="rounded-xl bg-slate-50 px-4 py-3">
                    <p className="text-xs text-slate-400">{label}</p>
                    <p className="text-sm font-semibold text-slate-800">{val}</p>
                  </div>
                ))}
              </div>

              {d.linhas && d.linhas.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                        <th className="pb-2 font-medium">DescriÃ§Ã£o</th>
                        <th className="pb-2 font-medium text-right">Qtd</th>
                        <th className="pb-2 font-medium text-right">PreÃ§o Unit.</th>
                        <th className="pb-2 font-medium text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {d.linhas.map((l, i) => (
                        <tr key={i}>
                          <td className="py-2 text-slate-700">{l.descricao}</td>
                          <td className="py-2 text-right text-slate-500">{l.quantidade}</td>
                          <td className="py-2 text-right text-slate-500">{fmt(l.precoUnitario)}</td>
                          <td className="py-2 text-right font-semibold text-slate-800">{fmt(l.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {fatura.erroProcessamento && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              <strong>Erro de processamento:</strong> {fatura.erroProcessamento}
            </div>
          )}

          {['revisto', 'pendente'].includes(fatura.estado) && (
            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-700">ClassificaÃ§Ã£o</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Contrato</label>
                  <select value={contratoId} onChange={e => setContratoId(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300">
                    <option value="">â Sem contrato â</option>
                    {contratos.map(c => <option key={c.id} value={c.id}>{c.propostaCodigo} â {c.clienteNome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Fornecedor</label>
                  <select value={fornecedorId} onChange={e => setFornecedorId(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300">
                    <option value="">â Sem fornecedor â</option>
                    {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}{f.nif ? ` (${f.nif})` : ''}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Notas</label>
                <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" placeholder="ObservaÃ§Ãµes adicionais..." />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={handleAprovar} disabled={saving} className="flex-1 rounded-full bg-slate-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 transition">
                  {saving ? 'A processar...' : 'Aprovar Fatura'}
                </button>
                <button onClick={handleRejeitar} disabled={saving} className="rounded-full border border-red-200 px-6 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition">
                  Rejeitar
                </button>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
