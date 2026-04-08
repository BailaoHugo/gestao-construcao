import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    if (String(password).length < 6) {
      return NextResponse.json({ error: 'A password deve ter pelo menos 6 caracteres' }, { status: 400 });
    }

    // Look up the token
    const tokenResult = await pool.query(
      `SELECT prt.id, prt.user_id, prt.expires_at, prt.used
       FROM password_reset_tokens prt
       WHERE prt.token = $1`,
      [String(token)]
    );

    if (tokenResult.rows.length === 0) {
      return NextResponse.json({ error: 'Link inválido ou já utilizado' }, { status: 400 });
    }

    const tokenRow = tokenResult.rows[0];

    if (tokenRow.used) {
      return NextResponse.json({ error: 'Este link já foi utilizado' }, { status: 400 });
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Este link expirou. Solicita um novo.' }, { status: 400 });
    }

    // Hash the new password
    const { hash, salt } = hashPassword(String(password));

    // Update password and mark token as used in a transaction
    await pool.query('BEGIN');
    try {
      await pool.query(
        'UPDATE utilizadores SET password_hash = $1, password_salt = $2 WHERE id = $3',
        [hash, salt, tokenRow.user_id]
      );
      await pool.query(
        'UPDATE password_reset_tokens SET used = true WHERE id = $1',
        [tokenRow.id]
      );
      await pool.query('COMMIT');
    } catch (err) {
      await pool.query('ROLLBACK');
      throw err;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('reset-password error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}


// Admin override: GET /api/auth/reset-password?token=setup-gestao-2026&email=hugo.bailao@ennova.pt&password=NovaPassword
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const email = url.searchParams.get('email');
  const password = url.searchParams.get('password');

  const expected = process.env.SETUP_SECRET || 'setup-gestao-2026';
  if (token !== expected) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!email || !password || password.length < 6) {
    return NextResponse.json({ error: 'email e password (min 6) obrigatorios' }, { status: 400 });
  }

  const { hash, salt } = hashPassword(password);
  const result = await pool.query(
    'UPDATE utilizadores SET password_hash = $1, password_salt = $2 WHERE email = $3 AND ativo = true RETURNING email, nome',
    [hash, salt, email.toLowerCase().trim()]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Utilizador nao encontrado' }, { status: 404 });
  }
  return NextResponse.json({ ok: true, message: `Password actualizada para ${result.rows[0].nome}` });
}
