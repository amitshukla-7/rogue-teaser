import { NextResponse } from 'next/server';
import { addPreRegistration } from '@/lib/db';
import { isInstitutionalEmail } from '@/lib/email-validation';
import { sendErrorAlert } from '@/lib/alert';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${url.origin}/api/auth/google/callback`;

  if (!code) {
    return NextResponse.redirect(`${url.origin}/?error=${encodeURIComponent('Google authentication code missing.')}`);
  }

  if (!clientId || !clientSecret) {
    await sendErrorAlert('OAuth Config Missing', 'GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing in server environment');
    return NextResponse.redirect(`${url.origin}/?error=${encodeURIComponent('OAuth credentials missing on server.')}`);
  }

  let userEmail = '';
  let name = '';
  let googleId = '';

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId.trim(),
        client_secret: clientSecret.trim(),
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokenData: any = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      await sendErrorAlert('Google Token Exchange Failed', tokenData?.error_description || JSON.stringify(tokenData));
      return NextResponse.redirect(`${url.origin}/?error=${encodeURIComponent('Google authentication failed. Please try again.')}`);
    }

    const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const profile: any = await userinfoRes.json();
    if (userinfoRes.ok && profile.email) {
      userEmail = profile.email.trim().toLowerCase();
      name = profile.name || userEmail.split('@')[0];
      googleId = profile.sub;
    }
  } catch (err: any) {
    await sendErrorAlert('Google OAuth Exception', err);
    return NextResponse.redirect(`${url.origin}/?error=${encodeURIComponent('Authentication server error. Please try again.')}`);
  }

  if (!userEmail) {
    return NextResponse.redirect(`${url.origin}/?error=${encodeURIComponent('Could not verify Google email address.')}`);
  }

  if (!isInstitutionalEmail(userEmail)) {
    return NextResponse.redirect(`${url.origin}/?error=${encodeURIComponent('Registration is restricted strictly to verified college email addresses (e.g., @mits.ac.in or .ac.in / .edu). Personal emails (Gmail, Yahoo, Outlook) are not allowed.')}`);
  }

  // Save verified user to pre-registration DB
  try {
    const user = await addPreRegistration(userEmail, name, googleId);
    const response = NextResponse.redirect(`${url.origin}/?registered=true&email=${encodeURIComponent(userEmail)}&position=${user.position}`);
    response.cookies.set('pre_reg_email', userEmail, { path: '/', httpOnly: false, maxAge: 60 * 60 * 24 * 30 });
    return response;
  } catch (err: any) {
    await sendErrorAlert('Database Registration Failed', err, { email: userEmail });
    return NextResponse.redirect(`${url.origin}/?error=${encodeURIComponent('Failed to save registration. Please try again.')}`);
  }
}
