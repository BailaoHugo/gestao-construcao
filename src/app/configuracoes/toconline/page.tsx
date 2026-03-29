'use client';
import { useState, useEffect, useCallback } from 'react';

interface SyncStats {
  fornecedores: number;
  clientes: number;
  centrosCusto: number;
}

interface LastSync {
  iniciado_em: string;
  concluido_em: string | null;
  estado: string;
  resultado: Record<string, { upserted?: number; error?: string }> | null;
}

interface Status {
  connected: boolean;
  reason?: string;
  error?: string;
  stats?: SyncStats;
  lastSync?: LastSync | null;
}

export default function ToconlinePage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<Record<string, { upserted?: number; error?: string }> | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/toconline/status');
      setStatus(await r.json());
    } catch {
      setStatus({ connected: false, reason: 'network_error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const r = await fetch('/api/toconline/sync', { method: 'POST' });
      const data = await r.json();
      setSyncResult(data.results);
      await fetchStatus();
    } finally {
      setSyncing(false);
    }
  };

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleString('pt-PT') : '—';

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">TOConline</h1>
        <p className="text-sm text-gray-500 mt-1">
          Sincronize fornecedores, clientes e centros de custo com o TOConline.
        </p>
      </div>

      {/* Estado da ligacao */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Estado da ligacao</h2>

        {loading ? (
          <div className="text-sm text-gray-400 animate-pulse">A verificar...</div>
        ) : status?.connected ? (
          <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            Ligado com sucesso
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-red-600 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              {status?.reason === 'not_configured'
                ? 'Credenciais nao configuradas'
                : status?.reason === 'auth_failed'
                ? 'Falha de autenticacao'
                : 'Sem ligacao'}
            </div>
            {status?.reason === 'not_configured' && (
              <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 font-mono space-y-1">
                <p className="text-gray-700 font-sans font-medium mb-2">
                  Adicione estas variaveis no Vercel → Settings → Environment Variables:
                </p>
                {['TOCONLINE_CLIENT_ID', 'TOCONLINE_SECRET', 'TOCONLINE_OAUTH_URL', 'TOCONLINE_API_URL'].map(v => (
                  <div key={v} className="text-blue-700">{v}</div>
                ))}
              </div>
            )}
            {status?.error && (
              <p className="text-xs text-red-500 bg-red-50 rounded p-2">{status.error}</p>
            )}
          </div>
        )}

        {status?.connected && status.stats && (
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { label: 'Fornecedores', value: status.stats.fornecedores },
              { label: 'Clientes', value: status.stats.clientes },
              { label: 'Centros de Custo', value: status.stats.centrosCusto },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-gray-900">{value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        )}

        {status?.connected && status.lastSync && (
          <div className="text-xs text-gray-400 border-t pt-3">
            Ultima sincronizacao:{' '}
            <span className="text-gray-600">{formatDate(status.lastSync.concluido_em)}</span>
            {' — '}
            <span className={status.lastSync.estado === 'ok' ? 'text-green-600' : 'text-yellow-600'}>
              {status.lastSync.estado}
            </span>
          </div>
        )}
      </div>

      {/* Botao de sync */}
      {status?.connected && (
        <button
          onClick={handleSync}
          disabled={syncing}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {syncing ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              A sincronizar...
            </>
          ) : (
            '↻  Sincronizar agora'
          )}
        </button>
      )}

      {/* Resultado do sync */}
      {syncResult && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="font-semibold text-gray-800">Resultado</h2>
          {Object.entries(syncResult).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between text-sm">
              <span className="text-gray-600 capitalize">{key.replace('_', ' ')}</span>
              {'error' in val ? (
                <span className="text-red-500 text-xs max-w-xs text-right">{val.error}</span>
              ) : (
                <span className="text-green-600 font-medium">{val.upserted} registos</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Instrucoes */}
      <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800 space-y-2">
        <p className="font-semibold">Como configurar</p>
        <ol className="list-decimal list-inside space-y-1 text-blue-700">
          <li>No TOConline, va a Configuracoes → API e gere as credenciais</li>
          <li>No Vercel, adicione as 4 variaveis de ambiente indicadas acima</li>
          <li>Execute a migracao SQL em Supabase → SQL Editor (ficheiro <code className="bg-blue-100 px-1 rounded">supabase/migrations/20260329_toconline.sql</code>)</li>
          <li>Clique em "Sincronizar agora" para importar os dados</li>
        </ol>
        <p className="text-xs text-blue-500 pt-1">
          A sincronizacao automatica diaria sera configurada em breve.
        </p>
      </div>
    </div>
  );
}
