// Setup test environment for E2E tests
// This configures environment variables needed for tests

const workerId = process.env.JEST_WORKER_ID || '0';

// Database configuration
process.env.DATABASE_URL = `postgresql://music_admin:music_password@localhost:5432/music_server_test_${workerId}`;

// JWT secrets for authentication (required by SecuritySecretsService)
// Using fixed test values avoids the need to hit the database during strategy initialization
process.env.JWT_SECRET = 'test-jwt-secret-for-e2e-tests-minimum-32-chars-required';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-for-e2e-tests-minimum-32-chars';

// Redis configuration for tests (use different DBs per worker to avoid conflicts)
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_DB = String(parseInt(workerId) + 10);

console.log(`🧪 Test Worker ${workerId} → music_server_test_${workerId}`);
