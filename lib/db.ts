import { Pool } from 'pg';

export interface PreRegUser {
  id: string;
  name: string;
  email: string;
  position: number;
  created_at: string;
  founder_badge: string;
  google_id?: string;
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
      const res = await pool.query('SELECT id, name, email, google_id, created_at FROM users ORDER BY created_at ASC LIMIT 500');
      return res.rows.map((row, index) => {
        const position = index + 1;
        return {
          id: row.id,
          name: row.name || row.email.split('@')[0],
          email: row.email,
          position,
          created_at: row.created_at,
          founder_badge: getBadgeLabel(position),
          google_id: row.google_id
        };
      });
    } catch (err) {
      console.error('PostgreSQL getPreRegistrations error:', err);
    }
  }
  return [];
}

export async function addPreRegistration(email: string, name?: string, googleId?: string): Promise<PreRegUser> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name || cleanEmail.split('@')[0].replace('.', ' ');

  if (pool) {
    try {
      // Check existing user
      const checkRes = await pool.query(
        'SELECT id, name, email, google_id, created_at FROM users WHERE LOWER(email) = $1',
        [cleanEmail]
      );

      if (checkRes.rows.length > 0) {
        const existing = checkRes.rows[0];
        // Calculate position via indexed COUNT query
        const posRes = await pool.query(
          'SELECT COUNT(*)::int AS position FROM users WHERE created_at <= $1',
          [existing.created_at]
        );
        const position = Math.max(1, posRes.rows[0]?.position || 1);

        return {
          id: existing.id,
          name: existing.name || cleanName,
          email: existing.email,
          position,
          created_at: existing.created_at,
          founder_badge: getBadgeLabel(position),
          google_id: existing.google_id
        };
      }

      // Insert new user into PostgreSQL with atomic ON CONFLICT handling
      let newUserRow;
      try {
        const insertRes = await pool.query(
          `INSERT INTO users (email, name, google_id, college_verified)
           VALUES ($1, $2, $3, true)
           ON CONFLICT (email) DO UPDATE
             SET google_id = COALESCE(EXCLUDED.google_id, users.google_id),
                 name = COALESCE(users.name, EXCLUDED.name)
           RETURNING id, created_at`,
          [cleanEmail, cleanName, googleId || `google_${Date.now()}`]
        );
        newUserRow = insertRes.rows[0];
      } catch (insertErr) {
        // Fallback for schemas without UNIQUE constraint on email
        const retryCheck = await pool.query(
          'SELECT id, name, email, google_id, created_at FROM users WHERE LOWER(email) = $1',
          [cleanEmail]
        );
        if (retryCheck.rows.length > 0) {
          newUserRow = retryCheck.rows[0];
        } else {
          throw insertErr;
        }
      }

      const countRes = await pool.query(
        'SELECT COUNT(*)::int AS position FROM users WHERE created_at <= $1',
        [newUserRow.created_at]
      );
      const position = Math.max(1, countRes.rows[0]?.position || 1);

      return {
        id: newUserRow.id,
        name: cleanName,
        email: cleanEmail,
        position,
        created_at: newUserRow.created_at,
        founder_badge: getBadgeLabel(position),
        google_id: googleId
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
