import { NextResponse } from 'next/server';
import { claimUserHandle, getUserHandle } from '@/lib/db';
import { sendErrorAlert } from '@/lib/alert';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const handle = (body.handle || '').trim();

    if (!email) {
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 });
    }

    if (!handle) {
      return NextResponse.json({ error: 'Please enter your preferred @handle.' }, { status: 400 });
    }

    const reservedHandle = await claimUserHandle(email, handle);

    return NextResponse.json({
      success: true,
      handle: reservedHandle,
      message: `@${reservedHandle} successfully claimed!`
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to reserve @handle.' }, { status: 400 });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get('email');

  if (!email) {
    return NextResponse.json({ handle: null });
  }

  const handle = await getUserHandle(email);
  return NextResponse.json({ handle });
}
