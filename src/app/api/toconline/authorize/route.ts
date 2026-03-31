import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const clientId = process.env.TOCONLINE_CLIENT_ID!;
  const redirectUri = `${process.env.NEXTAUTH_URL || 'https://gestao2026.vercel.app'}/api/toconline/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'commercial',
  });

  const authUrl = `https://app.toconline.pt/oauth/authorize?${params.toString()}`;
  return NextResponse.redirect(authUrl);
}
