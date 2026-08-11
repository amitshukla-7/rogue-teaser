import { NextResponse } from 'next/server';
import { getPreRegistrationCount, addPreRegistration } from '@/lib/db';

import { isInstitutionalEmail } from '@/lib/email-validation';

import { sendErrorAlert } from '@/lib/alert';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const name = (body.name || email.split('@')[0] || 'MITS Student').trim();

    if (!email) {
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });
    }

    if (!isInstitutionalEmail(email)) {
      return NextResponse.json(
        { error: 'Registration is restricted strictly to verified college email addresses (e.g., @mits.ac.in or .ac.in / .edu). Personal emails (Gmail, Yahoo, Outlook) are not allowed.' },
        { status: 400 }
      );
    }

    const newReg = await addPreRegistration(email, name);
    const totalCount = await getPreRegistrationCount();

    return NextResponse.json({
      success: true,
      position: newReg.position,
      total: totalCount
    });
  } catch (err: any) {
    await sendErrorAlert('Waitlist API Exception', err);
    return NextResponse.json({ error: err.message || 'Failed to submit pre-registration.' }, { status: 500 });
  }
}

export async function GET() {
  const count = await getPreRegistrationCount();
  return NextResponse.json({
    count
  });
}
