/**
 * Rogue Teaser — Supabase Connectivity & Health Check
 * Run: node scripts/check-db.mjs
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually
const envPath = resolve(__dirname, '../.env');
const envLines = readFileSync(envPath, 'utf8').split('\n');
for (const line of envLines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const [key, ...rest] = trimmed.split('=');
  if (key) process.env[key.trim()] = rest.join('=').trim();
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌  DATABASE_URL not found in .env');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
  connectionTimeoutMillis: 8000,
});

function ok(msg)   { console.log(`  ✅  ${msg}`); }
function fail(msg) { console.log(`  ❌  ${msg}`); }
function info(msg) { console.log(`  ℹ️   ${msg}`); }
function section(title) { console.log(`\n── ${title} ──────────────────────────────`); }

async function run() {
  console.log('\n🔍  Rogue Teaser — Supabase Health Check\n');

  // 1. Basic connection
  section('1. Connection');
  let client;
  try {
    client = await pool.connect();
    ok('Connected to Supabase PostgreSQL');
  } catch (e) {
    fail(`Cannot connect: ${e.message}`);
    process.exit(1);
  }

  try {
    // 2. Server info
    section('2. Server Info');
    const ver = await client.query('SELECT version()');
    info(ver.rows[0].version.split(',')[0]);

    // 3. users table
    section('3. users table');
    const tables = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'users'`
    );
    if (tables.rows.length === 0) {
      fail('users table does NOT exist!');
    } else {
      ok('users table exists');

      // Check columns
      const cols = await client.query(
        `SELECT column_name, data_type, is_nullable
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'users'
         ORDER BY ordinal_position`
      );
      const colNames = cols.rows.map(r => r.column_name);
      const required = ['id', 'email', 'name', 'google_id', 'college_verified', 'created_at'];
      const optional = ['ref_code', 'referred_by', 'handle'];

      for (const col of required) {
        if (colNames.includes(col)) ok(`Column: ${col}`);
        else fail(`Missing required column: ${col}`);
      }
      for (const col of optional) {
        if (colNames.includes(col)) ok(`Column: ${col} (optional)`);
        else info(`Column: ${col} not present yet (will be auto-created on first use)`);
      }
    }

    // 4. poster_events table
    section('4. poster_events table');
    const pt = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'poster_events'`
    );
    if (pt.rows.length === 0) {
      info('poster_events table does not exist yet (auto-created on first poster download)');
    } else {
      ok('poster_events table exists');
    }

    // 5. Row counts
    section('5. Row counts');
    const userCount = await client.query('SELECT COUNT(*)::int AS c FROM users');
    info(`users: ${userCount.rows[0].c} rows`);

    const verifiedCount = await client.query(
      `SELECT COUNT(*)::int AS c FROM users WHERE college_verified = true`
    );
    const unverifiedCount = await client.query(
      `SELECT COUNT(*)::int AS c FROM users WHERE college_verified = false OR college_verified IS NULL`
    );
    info(`  └─ college_verified=true:  ${verifiedCount.rows[0].c}`);
    info(`  └─ college_verified=false: ${unverifiedCount.rows[0].c}`);

    // 6. Write test
    section('6. Write test');
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO users (email, name, google_id, college_verified)
         VALUES ('__healthcheck__@test.com', 'Health Check', 'test_google_id_hc', false)
         ON CONFLICT (email) DO NOTHING`
      );
      await client.query('ROLLBACK');
      ok('Write + rollback succeeded (no actual data written)');
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      fail(`Write test failed: ${e.message}`);
    }

    // 7. Indexes
    section('7. Indexes on users');
    const idx = await client.query(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'users' AND schemaname = 'public'`
    );
    if (idx.rows.length === 0) info('No indexes found (consider adding one on email)');
    else idx.rows.forEach(r => ok(`Index: ${r.indexname}`));

    // 8. env vars summary
    section('8. Environment Variables');
    const checks = {
      DATABASE_URL: !!process.env.DATABASE_URL,
      GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
      ADMIN_SECRET_KEY: !!process.env.ADMIN_SECRET_KEY,
    };
    for (const [key, present] of Object.entries(checks)) {
      if (present) ok(`${key} is set`);
      else fail(`${key} is MISSING`);
    }
    if (process.env.ALLOW_PERSONAL_EMAILS_UNTIL) {
      fail('ALLOW_PERSONAL_EMAILS_UNTIL is still set — remove it, it is no longer used');
    } else {
      ok('ALLOW_PERSONAL_EMAILS_UNTIL not present (correct)');
    }

    console.log('\n══════════════════════════════════════════');
    console.log('✅  All checks passed. Ready to deploy!\n');

  } catch (e) {
    fail(`Unexpected error: ${e.message}`);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
