import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const code = req.nextUrl.searchParams.get('code');
    const redirectUri = req.nextUrl.searchParams.get('redirect_uri') || 'https://oauth.pstmn.io/v1/callback';
    if (!code) return NextResponse.json({ error: 'code missing' }, { status: 400 });

  const clientId  = process.env.TOCONLINE_CLIENT_ID!;
    const secret    = process.env.TOCONLINE_SECRET!;
    const oauthUrl  = process.env.TOCONLINE_OAUTH_URL!;

  const resp = await fetch(oauthUrl + '/token', {
        method: 'POST',
        headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json',
        },
        body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                client_id: clientId,
                client_secret: secret,
                redirect_uri: redirectUri,
                scope: 'commercial',
        }).toString(),
  });

  const data = await resp.json();
    return NextResponse.json({ status: resp.status, data });
}
