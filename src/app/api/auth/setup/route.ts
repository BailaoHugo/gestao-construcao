import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

// One-time setup endpoint: creates utilisadores table and first admin user.
// Protect with a secret token in the query string: /api/auth/setup?token=SETUP_SECRET
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const expected = process.env.SETUP_SECRET || 'setup-gestao-2026';
  if (token !== expected) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS utilizadores (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      ativo BOOLEAN NOT NULL DEFAULT true,
      criado_em TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Check if admin already exists
  const existing = await pool.query(
    'SELECT id FROM utilizadores WHERE email = $1',
    ['hugo.bailao@ennova.pt']
  );
  if (existing.rows.length > 0) {
    return NextResponse.json({ ok: true, message: 'Utilizador ja existe' });
  }

  // Create first admin — password must be changed after first login
  const { hash, salt } = hashPassword('Gestao2026!');
  await pool.query(
    'INSERT INTO utilizadores (nome, email, password_hash, password_salt) VALUES ($1, $2, $3, $4)',
    ['Hugo Bailao', 'hugo.bailao@ennova.pt', hash, salt]
  );

  return NextResponse.json({ ok: true, message: 'Tabela e utilizador admin criados. Password inicial: Gestao2026!' });
}
