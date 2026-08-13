import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

async function ensurePosterEventsTable() {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS poster_events (
      id          SERIAL PRIMARY KEY,
      email       TEXT NOT NULL,
      action      TEXT NOT NULL CHECK (action IN ('download', 'share')),
      poster_theme TEXT NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_poster_events_email ON poster_events(email);
    CREATE INDEX IF NOT EXISTS idx_poster_events_created_at ON poster_events(created_at DESC);
  `);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, action, poster_theme } = body;

    if (!email || !action || !poster_theme) {
      return NextResponse.json({ error: 'email, action, and poster_theme are required' }, { status: 400 });
    }

    if (!['download', 'share'].includes(action)) {
      return NextResponse.json({ error: 'action must be download or share' }, { status: 400 });
    }

    if (!pool) {
      // No DB configured — silently succeed so the front-end isn't disrupted
      return NextResponse.json({ success: true, tracked: false });
    }

    await ensurePosterEventsTable();

    await pool.query(
      `INSERT INTO poster_events (email, action, poster_theme) VALUES ($1, $2, $3)`,
      [email.trim().toLowerCase(), action, poster_theme]
    );

    return NextResponse.json({ success: true, tracked: true });
  } catch (err: any) {
    console.error('poster-event error:', err);
    // Don't fail the user-facing action if tracking fails
    return NextResponse.json({ success: true, tracked: false });
  }
}

// GET — for admin use: returns all poster events (latest 500)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret');

  // Basic secret protection (uses the ADMIN_SECRET env var)
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!pool) {
    return NextResponse.json([]);
  }

  try {
    await ensurePosterEventsTable();

    const result = await pool.query(`
      SELECT
        pe.id,
        pe.email,
        u.name,
        u.handle,
        pe.action,
        pe.poster_theme,
        pe.created_at
      FROM poster_events pe
      LEFT JOIN users u ON LOWER(u.email) = LOWER(pe.email)
      ORDER BY pe.created_at DESC
      LIMIT 500
    `);

    return NextResponse.json(result.rows);
  } catch (err: any) {
    console.error('poster-event GET error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
