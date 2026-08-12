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

export async function addPreRegistration(email: string, name?: string, googleId?: string, referredBy?: string): Promise<PreRegUser> {
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
           VALUES ($1, $2, $3, true, $4, $5)
           ON CONFLICT (email) DO UPDATE
             SET google_id = COALESCE(EXCLUDED.google_id, users.google_id),
                 name = COALESCE(users.name, EXCLUDED.name),
                 referred_by = COALESCE(users.referred_by, EXCLUDED.referred_by),
                 ref_code = COALESCE(users.ref_code, EXCLUDED.ref_code)
           RETURNING id, created_at, referred_by, ref_code`,
          [cleanEmail, cleanName, googleId || `google_${Date.now()}`, cleanReferredBy, cleanRefCode]
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

