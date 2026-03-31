import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import crypto from 'crypto';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: 'Email obrigatório' }, { status: 400 });

    const emailClean = String(email).toLowerCase().trim();

    // Check if user exists
    const userResult = await pool.query(
      'SELECT id, nome FROM utilizadores WHERE email = $1 AND ativo = true',
      [emailClean]
    );

    // Always return ok to avoid email enumeration
    if (userResult.rows.length === 0) {
      return NextResponse.json({ ok: true });
    }

    const user = userResult.rows[0];

    // Create reset tokens table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES utilizadores(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Delete any previous tokens for this user
    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [user.id]);

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, token, expiresAt]
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gestao2026.vercel.app';
    const resetLink = `${appUrl}/recuperar-password/reset?token=${token}`;

    await resend.emails.send({
      from: 'Gestão de Obra <noreply@ennova.pt>',
      to: emailClean,
      subject: 'Recuperar password — Gestão de Obra',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #1e3a5f;">Recuperar password</h2>
          <p>Olá, ${user.nome}!</p>
          <p>Recebemos um pedido para recuperar a password da tua conta.</p>
          <p>Clica no botão abaixo para definir uma nova password. O link é válido durante <strong>1 hora</strong>.</p>
          <a href="${resetLink}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#1e3a5f;color:#fff;text-decoration:none;border-radius:6px;font-weight:600;">
            Definir nova password
          </a>
          <p style="color:#666;font-size:0.85em;">Se não pediste a recuperação da password, podes ignorar este email.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
          <p style="color:#999;font-size:0.8em;">Gestão de Obra — Ennova</p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('recuperar-password error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
