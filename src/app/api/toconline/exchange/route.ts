import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(request: NextRequest) {
  const body = await request.json() as { code: string; redirect_uri: string };
  const { code, redirect_uri } = body;

  const oauthUrl = process.env.TOCONLINE_OAUTH_URL;
  const clientId = process.env.TOCONLINE_CLIENT_ID;
  const clientSecret = process.env.TOCONLINE_SECRET;

  if (!oauthUrl || !clientId || !clientSecret) {
    return NextResponse.json({ error: 'TOConline env vars não configuradas' }, { status: 500 });
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const resp = await fetch(oauthUrl + '/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
    body: params.toString(),
  });

  const data = await resp.json() as Record<string, unknown>;

  if (resp.ok && data.access_token) {
    // Persist tokens to DB so they survive serverless cold starts
    const client = await pool.connect();
    try {
      const expiresAt = data.expires_in
        ? new Date(Date.now() + (data.expires_in as number) * 1000).toISOString()
        : null;
      await client.query(`
        INSERT INTO app_config (key, value) VALUES
          ('toconline_access_token', $1),
          ('toconline_refresh_token', $2),
          ('toconline_expires_at', $3),
          ('toconline_needs_reauth', 'false')
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      `, [data.access_token, data.refresh_token ?? null, expiresAt]);
    } finally {
      client.release();
    }
  }

  return NextResponse.json({ status: resp.status, data });
}
