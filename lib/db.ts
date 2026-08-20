import { Pool } from 'pg';

export interface PreRegUser {
  id: string;
  name: string;
  email: string;
  position: number;
  created_at: string;
  founder_badge: string;
  google_id?: string;
  ref_code?: string;
  referred_by?: string;
  referral_count?: number;
  handle?: string;
}

// Global serverless connection singleton to prevent pool exhaustion on Supabase
const globalForPg = globalThis as unknown as { pgPool?: Pool };

export const pool: Pool | null = process.env.DATABASE_URL
  ? globalForPg.pgPool ||
    new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10, // Max connections per serverless instance
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  : null;

if (process.env.NODE_ENV !== 'production' && pool) {
  globalForPg.pgPool = pool;
}

function getBadgeLabel(position: number): string {
  return position <= 100
    ? `Founding Member #${String(position).padStart(3, '0')}`
    : `Early Access #${String(position).padStart(3, '0')}`;
}

async function ensureReferralColumns() {
  if (!pool) return;
  try {
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS ref_code TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS handle TEXT;
    `);
  } catch (err) {
    console.error('PostgreSQL ensureReferralColumns note:', err);
  }
}

export async function getPreRegistrationCount(): Promise<number> {
  if (pool) {
    try {
      const res = await pool.query('SELECT COUNT(*)::int AS count FROM users');
      return res.rows[0]?.count ?? 0;
    } catch (err) {
      console.error('PostgreSQL getPreRegistrationCount error:', err);
    }
  }
  return 0;
}

export async function getPreRegistrations(): Promise<PreRegUser[]> {
  if (pool) {
    try {
      await ensureReferralColumns();
      const res = await pool.query(`
        SELECT 
          u.id, 
          u.name, 
          u.email, 
          u.google_id, 
          u.created_at, 
          u.referred_by, 
          u.ref_code,
          u.handle,
          (
            SELECT COUNT(*)::int 
            FROM users r 
            WHERE LOWER(r.referred_by) = LOWER(u.email) 
               OR (u.ref_code IS NOT NULL AND LOWER(r.referred_by) = LOWER(u.ref_code))
          ) AS referral_count
        FROM users u
        ORDER BY created_at ASC 
        LIMIT 500
      `);

      return res.rows.map((row, index) => {
        const position = index + 1;
        const generatedCode = row.ref_code || `ROGUE-${row.email.split('@')[0].toUpperCase().replace(/[^A-Z0-9]/g, '')}`;
        return {
          id: row.id,
          name: row.name || row.email.split('@')[0],
          email: row.email,
          position,
          created_at: row.created_at,
          founder_badge: getBadgeLabel(position),
          google_id: row.google_id,
          ref_code: generatedCode,
          referred_by: row.referred_by || 'Direct / Organic',
          referral_count: parseInt(row.referral_count || '0', 10),
          handle: row.handle || undefined
        };
      });
    } catch (err) {
      console.error('PostgreSQL getPreRegistrations error:', err);
    }
  }
  return [];
}

export async function addPreRegistration(email: string, name?: string, googleId?: string, referredBy?: string, collegeVerified: boolean = true): Promise<PreRegUser> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name || cleanEmail.split('@')[0].replace('.', ' ');
  const cleanRefCode = `ROGUE-${cleanEmail.split('@')[0].toUpperCase().replace(/[^A-Z0-9]/g, '')}`;
  const cleanReferredBy = referredBy ? referredBy.trim() : null;

  if (pool) {
    try {
      await ensureReferralColumns();

      // Check existing user
      const checkRes = await pool.query(
        'SELECT id, name, email, google_id, created_at, referred_by, ref_code FROM users WHERE LOWER(email) = $1',
        [cleanEmail]
      );

      if (checkRes.rows.length > 0) {
        const existing = checkRes.rows[0];
        // If existing user has no referred_by, update it if a new referral code came in
        if (!existing.referred_by && cleanReferredBy) {
          await pool.query('UPDATE users SET referred_by = $1 WHERE id = $2', [cleanReferredBy, existing.id]);
        }
        if (!existing.ref_code) {
          await pool.query('UPDATE users SET ref_code = $1 WHERE id = $2', [cleanRefCode, existing.id]);
        }

        const posRes = await pool.query(
          'SELECT COUNT(*)::int AS position FROM users WHERE created_at < $1 OR (created_at = $1 AND id <= $2)',
          [existing.created_at, existing.id]
        );
        const position = Math.max(1, posRes.rows[0]?.position || 1);

        return {
          id: existing.id,
          name: existing.name || cleanName,
          email: existing.email,
          position,
          created_at: existing.created_at,
          founder_badge: getBadgeLabel(position),
          google_id: existing.google_id,
          ref_code: existing.ref_code || cleanRefCode,
          referred_by: existing.referred_by || cleanReferredBy || 'Direct / Organic'
        };
      }

      // Insert new user into PostgreSQL with atomic ON CONFLICT handling
      let newUserRow;
      try {
        const insertRes = await pool.query(
          `INSERT INTO users (email, name, google_id, college_verified, referred_by, ref_code)
           VALUES ($1, $2, $3, $6, $4, $5)
           ON CONFLICT (email) DO UPDATE
             SET google_id = COALESCE(EXCLUDED.google_id, users.google_id),
                 name = COALESCE(users.name, EXCLUDED.name),
                 referred_by = COALESCE(users.referred_by, EXCLUDED.referred_by),
                 ref_code = COALESCE(users.ref_code, EXCLUDED.ref_code)
           RETURNING id, created_at, referred_by, ref_code`,
          [cleanEmail, cleanName, googleId || `google_${Date.now()}`, cleanReferredBy, cleanRefCode, collegeVerified]
        );
        newUserRow = insertRes.rows[0];
      } catch (insertErr) {
        // Fallback for schemas without UNIQUE constraint on email
        const retryCheck = await pool.query(
          'SELECT id, name, email, google_id, created_at, referred_by, ref_code FROM users WHERE LOWER(email) = $1',
          [cleanEmail]
        );
        if (retryCheck.rows.length > 0) {
          newUserRow = retryCheck.rows[0];
        } else {
          throw insertErr;
        }
      }

      const countRes = await pool.query(
        'SELECT COUNT(*)::int AS position FROM users WHERE created_at < $1 OR (created_at = $1 AND id <= $2)',
        [newUserRow.created_at, newUserRow.id]
      );
      const position = Math.max(1, countRes.rows[0]?.position || 1);

      return {
        id: newUserRow.id,
        name: cleanName,
        email: cleanEmail,
        position,
        created_at: newUserRow.created_at,
        founder_badge: getBadgeLabel(position),
        google_id: googleId,
        ref_code: newUserRow.ref_code || cleanRefCode,
        referred_by: newUserRow.referred_by || cleanReferredBy || 'Direct / Organic'
      };
    } catch (err) {
      console.error('PostgreSQL addPreRegistration error:', err);
      throw new Error('Database registration failed. Please try again.');
    }
  }

  // Fallback if no database is connected
  return {
    id: `pre_${Date.now()}`,
    name: cleanName,
    email: cleanEmail,
    position: 1,
    created_at: new Date().toISOString(),
    founder_badge: getBadgeLabel(1),
    google_id: googleId
  };
}

export async function claimUserHandle(email: string, rawHandle: string): Promise<string> {
  const cleanEmail = email.trim().toLowerCase();
  let cleanHandle = rawHandle.trim().toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_]/g, '');

  if (!cleanHandle || cleanHandle.length < 3) {
    throw new Error('Username must be at least 3 characters long.');
  }

  if (cleanHandle.length > 20) {
    throw new Error('Username cannot exceed 20 characters.');
  }

  if (pool) {
    await ensureReferralColumns();
    // Check if handle is already taken by a DIFFERENT user
    const checkRes = await pool.query(
      'SELECT id, email FROM users WHERE LOWER(handle) = $1 AND LOWER(email) != $2',
      [cleanHandle, cleanEmail]
    );

    if (checkRes.rows.length > 0) {
      throw new Error(`@${cleanHandle} is already reserved by another student! Please pick another one.`);
    }

    // Update handle for this user
    await pool.query(
      'UPDATE users SET handle = $1 WHERE LOWER(email) = $2',
      [cleanHandle, cleanEmail]
    );

    return cleanHandle;
  }

  return cleanHandle;
}

export async function getUserHandle(email: string): Promise<string | null> {
  if (pool) {
    try {
      await ensureReferralColumns();
      const res = await pool.query('SELECT handle FROM users WHERE LOWER(email) = $1', [email.trim().toLowerCase()]);
      return res.rows[0]?.handle || null;
    } catch (err) {
      console.error('PostgreSQL getUserHandle error:', err);
    }
  }
  return null;
}

export async function createTeaserPost(data: {
  email: string;
  name?: string;
  title: string;
  content: string;
  topic?: string;
  is_anonymous?: boolean;
  poll?: any;
}): Promise<any> {
  const cleanEmail = data.email.trim().toLowerCase();
  const cleanName = data.name?.trim() || cleanEmail.split('@')[0];
  const cleanHandle = cleanEmail.split('@')[0].replace(/[^a-z0-9_]/g, '');
  const postTitle = data.title.trim() || data.content.trim().slice(0, 60);
  const postContent = data.content.trim() || postTitle;
  const postTopic = data.topic || 'General';
  const isAnon = !!data.is_anonymous;

  if (pool) {
    // 1. Enforce strict 1 post limit per email for all users
    try {
      const countRes = await pool.query(
        `SELECT COUNT(*)::int AS count FROM posts p JOIN users u ON p.author_id::text = u.id::text WHERE LOWER(u.email) = $1`,
        [cleanEmail]
      );
      if ((countRes.rows[0]?.count || 0) >= 1) {
        throw new Error('You have already submitted your 1 teaser post! Additional posts can be created on launch day.');
      }
    } catch (err: any) {
      if (err.message?.includes('already submitted')) throw err;
    }

    // 2. Ensure schema columns exist in PostgreSQL
    try {
      await pool.query(`
        ALTER TABLE posts ADD COLUMN IF NOT EXISTS topic TEXT DEFAULT 'General';
        ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false;
        ALTER TABLE posts ADD COLUMN IF NOT EXISTS poll JSONB;
      `);
    } catch (e) {}

    // 3. Ensure user exists in users table
    let userId = `user_${Date.now()}`;
    try {
      const userRes = await pool.query(
        `INSERT INTO users (email, name, handle, college_verified)
         VALUES ($1, $2, $3, true)
         ON CONFLICT (email) DO UPDATE SET name = COALESCE(users.name, EXCLUDED.name)
         RETURNING id`,
        [cleanEmail, cleanName, cleanHandle]
      );
      if (userRes.rows[0]?.id) {
        userId = userRes.rows[0].id;
      }
    } catch (e) {
      const existing = await pool.query(`SELECT id FROM users WHERE LOWER(email) = $1`, [cleanEmail]);
      if (existing.rows[0]?.id) userId = existing.rows[0].id;
    }

    // 4. Parse poll data if provided
    let pollData = null;
    if (data.poll && data.poll.question && Array.isArray(data.poll.options) && data.poll.options.length >= 2) {
      const duration = data.poll.duration || 'always';
      let expires_at: string | null = null;
      if (duration === '8h') {
        expires_at = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
      } else if (duration === '24h') {
        expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      }

      pollData = {
        id: `poll-${Date.now()}`,
        question: data.poll.question,
        duration,
        expires_at,
        options: data.poll.options.map((opt: any, idx: number) => ({
          id: `opt-${idx + 1}`,
          text: typeof opt === 'string' ? opt.trim() : opt.text.trim(),
          votes: 0
        })),
        total_votes: 0,
        votes_by_user: {}
      };
    }

    // 5. Insert post into PostgreSQL
    const postId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO posts (id, author_id, title, content, topic, is_anonymous, poll, upvotes, downvotes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, NOW())`,
      [postId, userId, postTitle, postContent, postTopic, isAnon, pollData ? JSON.stringify(pollData) : null]
    );

    return {
      id: postId,
      title: postTitle,
      content: postContent,
      topic: postTopic,
      is_anonymous: isAnon,
      poll: pollData
    };
  }

  return { id: `mock_${Date.now()}`, title: postTitle, content: postContent };
}

