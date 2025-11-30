/**
 * Setup test environment
 *
 * This file configures environment variables for tests.
 * Values from CI/CD (if present) take priority over defaults.
 *
 * Local development: Uses worker-based DB selection for parallel tests
 * CI/CD: Uses DATABASE_URL provided by the pipeline
 */

const workerId = process.env.JEST_WORKER_ID || '1';

// Database: Use CI-provided URL or generate worker-specific URL for parallelism
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `postgresql://music_admin:music_password@localhost:5432/music_server_test_${workerId}`;
}

// JWT secrets: Use CI-provided or defaults for local testing
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-for-e2e-tests-minimum-32-chars-required';
}
if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-for-e2e-tests-minimum-32-chars';
}

// Redis: Use CI-provided or defaults with worker-based DB selection
if (!process.env.REDIS_HOST) {
  process.env.REDIS_HOST = 'localhost';
}
if (!process.env.REDIS_PORT) {
  process.env.REDIS_PORT = '6379';
}
if (!process.env.REDIS_DB) {
  process.env.REDIS_DB = String(parseInt(workerId) + 10);
}

// Extract DB name from URL for logging
const dbName = process.env.DATABASE_URL.split('/').pop()?.split('?')[0] || 'unknown';
console.log(`🧪 Test Worker ${workerId} → ${dbName}`);
