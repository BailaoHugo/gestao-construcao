'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function RecuperarPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/recuperar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erro ao enviar email');
      } else {
        setSent(true);
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
          <h1 className="text-2xl font-bold text-slate-800">Recuperar password</h1>
          <p className="text-sm text-slate-500 mt-1">Indica o teu email e enviamos um link para definires uma nova password.</p>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="text-4xl mb-3">📧</div>
            <p className="text-slate-700 font-medium">Email enviado!</p>
            <p className="text-sm text-slate-500 mt-1">Verifica a tua caixa de entrada e segue o link para recuperar a password.</p>
            <Link href="/login" className="mt-6 inline-block text-sm text-blue-600 hover:underline">
              ← Voltar ao login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="o.teu@email.com"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition-colors"
            >
              {loading ? 'A enviar…' : 'Enviar link de recuperação'}
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
