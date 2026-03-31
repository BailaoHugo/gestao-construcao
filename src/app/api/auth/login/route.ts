import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { signJWT, verifyPassword } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email e password obrigatorios' }, { status: 400 });
    }

    const result = await pool.query(
      'SELECT id, email, nome, password_hash, password_salt FROM utilizadores WHERE email = $1 AND ativo = true',
      [String(email).toLowerCase().trim()]
    );

    const user = result.rows[0];
    if (!user || !verifyPassword(String(password), user.password_hash, user.password_salt)) {
      return NextResponse.json({ error: 'Email ou password incorretos' }, { status: 401 });
    }

    const token = signJWT({
      sub: user.id,
      email: user.email,
      nome: user.nome,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
    });

    const response = NextResponse.json({ ok: true, nome: user.nome });
    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (err: unknown) {
    console.error('[auth/login]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
