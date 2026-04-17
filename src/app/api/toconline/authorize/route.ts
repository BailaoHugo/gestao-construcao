import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const clientId = process.env.TOCONLINE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'TOCONLINE_CLIENT_ID não configurado' }, { status: 500 });
  }

  // Build redirect_uri dynamically from request URL so it always matches the deployment
  const reqUrl = new URL(request.url);
  const redirectUri = `${reqUrl.protocol}//${reqUrl.host}/api/toconline/callback`;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'commercial',
  });

  const authUrl = new URL('https://app.toconline.pt/oauth/authorize');
  authUrl.search = params.toString();

  return NextResponse.redirect(authUrl.toString());
}
