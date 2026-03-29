'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

interface FaturaRecebida {
  id: string;
  contratoId: string | null;
  fornecedorId: string | null;
  origem: string;
  estado: string;
  ficheiroNome: string | null;
  emailRemetente: string | null;
  emailAssunto: string | null;
  emailData: string | null;
  dadosExtraidos: Record<string, unknown> | null;
  processadoEm: string | null;
  erroProcessamento: string | null;
  criadoEm: string;
  fornecedorNome: string | null;
  contratoNumero: string | null;
  contratoDesignacao: string | null;
}

const ESTADO_STYLES: Record<string, string> = {
  pendente: 'bg-amber-50 text-amber-700',
  processando: 'bg-blue-50 text-blue-700',
  revisto: 'bg-purple-50 text-purple-700',
  aprovado: 'bg-green-50 text-green-700',
  rejeitado: 'bg-red-50 text-red-700',
};

function FaturasContent() {
  const searchParams = useSearchParams();
  const contratoId = searchParams.get('contratoId');

  const [faturas, setFaturas] = useState<FaturaRecebida[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');

  const load = () => {
    const url = filtroEstado ? `/api/faturas-recebidas?estado=${filtroEstado}` : '/api/faturas-recebidas';
    fetch(url)
      .then(r => r.json())
      .then(data => setFaturas(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filtroEstado]);

  const filtered = contratoId ? faturas.filter(f => f.contratoId === contratoId) : faturas;

  return (
    <div className="min-h-screen bg-surface px-4 py-6 text-slate-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="no-print flex items-center justify-between rounded-xl bg-white/80 px-6 py-4 shadow-sm ring-1 ring-slate-100">
          <div className="text-sm font-semibold tracking-wide text-slate-800">Gestão Construção</div>
          <div className="flex gap-3">
            <Link href="/controlo-obra" className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">← Contratos</Link>
          </div>
        </header>

        <main className="rounded-2xl bg-white/80 p-8 shadow-sm ring-1 ring-slate-100">
          <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Faturas Recebidas</h1>
              <p className="text-sm text-slate-500">{contratoId ? 'Filtrado por contrato' : 'Todas as faturas recebidas por email ou upload.'}</p>
            </div>
            <div className="flex gap-2">
              {['', 'pendente', 'revisto', 'aprovado', 'rejeitado'].map(e => (
                <button
                  key={e}
                  onClick={() => setFiltroEstado(e)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition ${filtroEstado === e ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  {e || 'Todas'}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-slate-400">A carregar...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhuma fatura encontrada.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(f => (
                <Link key={f.id} href={`/controlo-obra/faturas/${f.id}`} className="block hover:bg-slate-50/50 -mx-2 px-2 py-4 rounded-xl transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_STYLES[f.estado] ?? 'bg-slate-100 text-slate-600'}`}>{f.estado}</span>
                        <span className="text-xs text-slate-400">{f.origem === 'email' ? 'ð§ Email' : 'ð Upload'}</span>
                        {f.fornecedorNome && <span className="text-xs text-slate-500">{f.fornecedorNome}</span>}
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-800 truncate">{f.ficheiroNome ?? f.emailAssunto ?? '(sem nome)'}</p>
                      {f.emailRemetente && <p className="text-xs text-slate-400 mt-0.5">{f.emailRemetente}</p>}
                      {f.contratoNumero && <p className="text-xs text-slate-400 mt-0.5">Contrato: {f.contratoNumero}</p>}
                      {f.erroProcessamento && <p className="text-xs text-red-500 mt-0.5 truncate">Erro: {f.erroProcessamento}</p>}
                    </div>
                    <div className="text-right text-xs text-slate-400 shrink-0">
                      {f.processadoEm ? new Date(f.processadoEm).toLocaleDateString('pt-PT') : new Date(f.criadoEm).toLocaleDateString('pt-PT')}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function FaturasPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-400">A carregar...</div>}>
      <FaturasContent />
    </Suspense>
  );
}
