import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const clientId = process.env.GOOGLE_CLIENT_ID;

  if (!clientId || clientId.trim() === '') {
    return NextResponse.json(
      { error: 'Google OAuth Client ID is not configured in server environment.' },
      { status: 500 }
    );
  }

  const origin = url.origin;
  const redirectUri = `${origin}/api/auth/google/callback`;

  // Direct production Google OAuth consent URL
  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.append('client_id', clientId.trim());
  googleAuthUrl.searchParams.append('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.append('response_type', 'code');
  googleAuthUrl.searchParams.append('scope', 'openid email profile');
  googleAuthUrl.searchParams.append('prompt', 'select_account');

  return NextResponse.redirect(googleAuthUrl.toString());
}
