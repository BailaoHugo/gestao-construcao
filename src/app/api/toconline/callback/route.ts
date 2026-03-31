import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL(`/admin/toconline?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/admin/toconline?error=missing_code', request.url)
    );
  }

  const clientId = process.env.TOCONLINE_CLIENT_ID!;
  const clientSecret = process.env.TOCONLINE_SECRET!;
  const oauthUrl = process.env.TOCONLINE_OAUTH_URL!;
  const redirectUri = `${process.env.NEXTAUTH_URL || 'https://gestao2026.vercel.app'}/api/toconline/callback`;

  try {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    });

    const resp = await fetch(oauthUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const data = await resp.json();

    if (!resp.ok || data.error) {
      const errMsg = data.error_description || data.error || 'token_exchange_failed';
      return NextResponse.redirect(
        new URL(`/admin/toconline?error=${encodeURIComponent(errMsg)}`, request.url)
      );
    }

    // Persist tokens to DB
    await pool.query(
      `CREATE TABLE IF NOT EXISTS app_config (key TEXT PRIMARY KEY, value TEXT NOT NULL)`
    );
    if (data.refresh_token) {
      await pool.query(
        `INSERT INTO app_config (key, value) VALUES ('toconline_refresh_token', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [data.refresh_token]
      );
    }
    if (data.access_token) {
      await pool.query(
        `INSERT INTO app_config (key, value) VALUES ('toconline_access_token', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [data.access_token]
      );
    }

    return NextResponse.redirect(
      new URL('/admin/toconline?status=connected', request.url)
    );
  } catch (err) {
    console.error('TOConline callback error:', err);
    return NextResponse.redirect(
      new URL('/admin/toconline?error=server_error', request.url)
    );
  }
}
