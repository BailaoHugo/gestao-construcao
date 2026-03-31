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
