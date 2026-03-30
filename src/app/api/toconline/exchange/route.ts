import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) return NextResponse.json({ error: 'code missing' }, { status: 400 });

  const clientId  = process.env.TOCONLINE_CLIENT_ID!;
  const secret    = process.env.TOCONLINE_SECRET!;
  const oauthUrl  = process.env.TOCONLINE_OAUTH_URL!;

  const credentials = Buffer.from(clientId + ':' + secret).toString('base64');
  const resp = await fetch(oauthUrl + '/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + credentials,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      scope: 'commercial',
    }).toString(),
  });

  const data = await resp.json();
  return NextResponse.json({ status: resp.status, data });
}
// updated credentials
