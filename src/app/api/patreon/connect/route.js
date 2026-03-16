import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(new URL('/profile', request.url));
  }

  const clientId = process.env.PATREON_CLIENT_ID;
  const redirectUri = process.env.PATREON_REDIRECT_URI;

  const state = Buffer.from(token).toString('base64');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'identity identity[email] identity.memberships',
    state,
  });

  return NextResponse.redirect(
    `https://www.patreon.com/oauth2/authorize?${params.toString()}`
  );
}