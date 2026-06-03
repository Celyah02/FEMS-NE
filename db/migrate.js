/**
 * Migration runner.
 *
 * Applies every *.sql file in ./migrations in lexical order, exactly once,
 * tracking applied files in a `schema_migrations` table. Idempotent: running
 * it again only applies files that have not been applied yet.
 *
 * Usage:  node migrate.js
 * Config: DATABASE_URL (or PG* env vars) — see ../.env.example
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

function connectionConfig() {
  if (process.env.DATABASE_URL) return { connectionString: process.env.DATABASE_URL };
  return {
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'fems',
    password: process.env.PGPASSWORD || 'fems_password',
    database: process.env.PGDATABASE || 'fems',
  };
}

async function main() {
  const client = new Client(connectionConfig());
  await client.connect();
  console.log('• Connected to PostgreSQL');

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const applied = new Set(
    (await client.query('SELECT filename FROM schema_migrations')).rows.map((r) => r.filename)
  );

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  - skip   ${file} (already applied)`);
      continue;
    }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`  ✓ apply  ${file}`);
      count += 1;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`  ✗ failed ${file}:`, err.message);
      throw err;
    }
  }

  console.log(count ? `• Applied ${count} migration(s).` : '• Database already up to date.');
  await client.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
