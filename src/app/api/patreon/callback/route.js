import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  if (error || !code || !state) {
    return NextResponse.redirect(`${siteUrl}/profile?patreon=error`);
  }

  let userJwt;
  try {
    userJwt = Buffer.from(state, 'base64').toString('utf8');
  } catch {
    return NextResponse.redirect(`${siteUrl}/profile?patreon=error`);
  }

  const tokenRes = await fetch('https://www.patreon.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: process.env.PATREON_CLIENT_ID,
      client_secret: process.env.PATREON_CLIENT_SECRET,
      redirect_uri: process.env.PATREON_REDIRECT_URI,
    }),
  });

  if (!tokenRes.ok) {
    console.error('Token exchange failed:', await tokenRes.text());
    return NextResponse.redirect(`${siteUrl}/profile?patreon=error`);
  }

  const tokens = await tokenRes.json();

  const identityRes = await fetch(
    'https://www.patreon.com/api/oauth2/v2/identity?fields[user]=full_name,email',
    { headers: { Authorization: `Bearer ${tokens.access_token}` } }
  );

  if (!identityRes.ok) {
    console.error('Identity fetch failed:', await identityRes.text());
    return NextResponse.redirect(`${siteUrl}/profile?patreon=error`);
  }

  const identity = await identityRes.json();
  const patreonUserId = identity?.data?.id;

  if (!patreonUserId) {
    return NextResponse.redirect(`${siteUrl}/profile?patreon=error`);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  const { data: { user }, error: userErr } = await supabase.auth.getUser(userJwt);
  if (userErr || !user) {
    console.error('JWT verification failed:', userErr);
    return NextResponse.redirect(`${siteUrl}/profile?patreon=error`);
  }

  await supabase.auth.admin.updateUserById(user.id, {
    app_metadata: {
      ...user.app_metadata,
      patreon_access_token: tokens.access_token,
      patreon_refresh_token: tokens.refresh_token,
      patreon_user_id: patreonUserId,
    },
  });

  await supabase
    .from('profiles')
    .update({ patreon_user_id: patreonUserId })
    .eq('id', user.id);

  return NextResponse.redirect(`${siteUrl}/profile?patreon=connected`);
}