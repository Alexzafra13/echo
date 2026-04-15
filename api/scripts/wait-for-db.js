#!/usr/bin/env node
/**
 * Verifies PostgreSQL is actually accepting connections with our
 * credentials — not just that the TCP port is open. Exits 0 on a
 * successful auth+query, 1 otherwise. Used by docker-entrypoint.sh
 * after the TCP-level wait loop.
 */
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 3000,
});

client
  .connect()
  .then(() => client.query('SELECT 1'))
  .then(() => client.end())
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
