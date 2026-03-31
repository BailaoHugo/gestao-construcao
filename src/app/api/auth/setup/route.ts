import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// One-time setup endpoint: creates utilizadores table and admin users.
// /api/auth/setup?token=setup-gestao-2026
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

  // Pre-computed hashes (pbkdf2Sync sha512, 100000 iterations)
  const users = [
    {
      nome: 'Hugo Bailao',
      email: 'hugo.bailao@ennova.pt',
      hash: 'a0d4b1278db0e59433a6f555be48737113edb34e7737b2135219bdf0520127a063910163f4613a1e8faaec74ed8285eb768b6c75a8004d874d22fb8b84234805',
      salt: 'b9aeb89ff8b5b40d8796790aa4936ca9',
    },
    {
      nome: 'Andre Neves',
      email: 'andre.neves@ennova.pt',
      hash: 'c49b3bc7cd1468fe0c9d077c722e5974268a4ddbfca1a3b81dcd0ddc8a77a18c011b43dd23d99370914953b1419087262552a1a33863e190267b970942fd5527',
      salt: '9b874278ac7919ab500151c7edd92152',
    },
  ];

  const created: string[] = [];
  for (const u of users) {
    const existing = await pool.query(
      'SELECT id FROM utilizadores WHERE email = $1',
      [u.email]
    );
    if (existing.rows.length > 0) continue;
    await pool.query(
      'INSERT INTO utilizadores (nome, email, password_hash, password_salt) VALUES ($1, $2, $3, $4)',
      [u.nome, u.email, u.hash, u.salt]
    );
    created.push(u.email);
  }

  return NextResponse.json({
    ok: true,
    message: created.length > 0
      ? 'Utilizadores criados: ' + created.join(', ')
      : 'Todos os utilizadores ja existem.',
  });
}
