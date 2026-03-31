'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function ResetForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) setError('Link inválido. Solicita um novo email de recuperação.');
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('As passwords não coincidem.');
      return;
    }
    if (password.length < 6) {
      setError('A password deve ter pelo menos 6 caracteres.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao redefinir password');
      } else {
        setDone(true);
        setTimeout(() => router.push('/login'), 3000);
      }
    } catch {
      setError('Erro de ligação. Tenta novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-800">Nova password</h1>
          <p className="text-sm text-slate-500 mt-1">Escolhe uma nova password para a tua conta.</p>
        </div>

        {done ? (
          <div className="text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-slate-700 font-medium">Password atualizada!</p>
            <p className="text-sm text-slate-500 mt-1">Vais ser redirecionado para o login em instantes…</p>
            <Link href="/login" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
              Ir para o login agora
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nova password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar password</label>
              <input
                type="password"
                required
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repete a nova password"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition-colors"
            >
              {loading ? 'A guardar…' : 'Definir nova password'}
            </button>

            <div className="text-center">
              <Link href="/login" className="text-sm text-slate-500 hover:text-slate-700">
                ← Voltar ao login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
