import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const clientId = process.env.TOCONLINE_CLIENT_ID;
  const oauthUrl = process.env.TOCONLINE_OAUTH_URL;

  if (!clientId || !oauthUrl) {
    return NextResponse.json({
      error: 'Env vars em falta',
      hasClientId: !!clientId,
      hasOauthUrl: !!oauthUrl,
    }, { status: 500 });
  }

  // Build redirect_uri dynamically from request URL
  const reqUrl = new URL(request.url);
  const redirectUri = `${reqUrl.protocol}//${reqUrl.host}/api/toconline/callback`;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'commercial',
  });

  const authEndpoint = oauthUrl + '/authorize';

  // Debug mode: return JSON instead of redirecting
  if (reqUrl.searchParams.get('debug') === '1') {
    return NextResponse.json({ authEndpoint, params: Object.fromEntries(params) });
  }

  const fullUrl = authEndpoint + '?' + params.toString();
  return NextResponse.redirect(fullUrl);
}
