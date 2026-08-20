import { NextResponse } from 'next/server';
import { createTeaserPost } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, title, content, topic, is_anonymous, poll } = body;

    if (!email || (!title?.trim() && !content?.trim())) {
      return NextResponse.json({ error: 'Email, title, and post content are required.' }, { status: 400 });
    }

    const postResult = await createTeaserPost({
      email,
      name,
      title,
      content,
      topic,
      is_anonymous,
      poll
    });

    return NextResponse.json({
      success: true,
      message: 'Your post is safely stored under your account. It will automatically publish live to the main campus feed the moment Rogue goes live!',
      post: postResult
    });
  } catch (err: any) {
    console.error('Next.js teaser route error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to submit teaser post.' },
      { status: err.message?.includes('already submitted') ? 400 : 500 }
    );
  }
}
