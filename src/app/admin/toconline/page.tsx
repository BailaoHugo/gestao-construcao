'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ToconlineAdminContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const error = searchParams.get('error');

  return (
    <div style={{ maxWidth: 480, margin: '80px auto', padding: '0 24px', fontFamily: 'sans-serif' }}>
      <div style={{ marginBottom: 32 }}>
        <a href='/' style={{ color: '#666', textDecoration: 'none', fontSize: 14 }}>← Dashboard</a>
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>TOConline</h1>
      <p style={{ color: '#666', marginBottom: 32 }}>Autorização OAuth para PDFs e sincronização</p>
      {status === 'connected' && (
        <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 8, padding: 16, marginBottom: 24, color: '#065f46' }}>
          ✅ Ligação estabelecida com sucesso! PDFs e sincronizações activos.
        </div>
      )}
      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: 16, marginBottom: 24, color: '#991b1b' }}>
          ❌ Erro: {decodeURIComponent(error)}
        </div>
      )}
      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Autorizar acesso</h2>
        <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20, lineHeight: 1.6 }}>
          Clica no botão abaixo para autorizar. Serás redireccionado para o TOConline e voltarás automaticamente.
        </p>
        <a
          href='/api/toconline/authorize'
          style={{ display: 'inline-block', background: '#2563eb', color: '#fff', padding: '12px 24px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 15 }}
        >
          Conectar TOConline →
        </a>
      </div>
    </div>
  );
}

export default function ToconlineAdminPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>A carregar...</div>}>
      <ToconlineAdminContent />
    </Suspense>
  );
}
