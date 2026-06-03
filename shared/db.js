/**
 * Shared PostgreSQL connection pool.
 *
 * All FEMS services share a single Postgres instance (pragmatic for a demo and
 * for the cross-cutting Reporting service). In a full production split each
 * service would own its schema/database; the access pattern here is already
 * table-scoped so that split is mechanical.
 */
const { Pool } = require('pg');

function buildConfig() {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL };
  }
  return {
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'fems',
    password: process.env.PGPASSWORD || 'fems_password',
    database: process.env.PGDATABASE || 'fems',
    max: Number(process.env.PG_POOL_MAX || 10),
    idleTimeoutMillis: 30000,
  };
}

const pool = new Pool(buildConfig());

pool.on('error', (err) => {
  // Log and keep the process alive; a dropped idle client should not crash us.
  console.error('[db] unexpected idle client error', err.message);
});

module.exports = {
  pool,
  /** Convenience query helper. */
  query: (text, params) => pool.query(text, params),
  /** Run fn inside a transaction with a dedicated client. */
  async withTransaction(fn) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};
