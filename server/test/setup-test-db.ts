const workerId = process.env.JEST_WORKER_ID || '0';
process.env.DATABASE_URL = `postgresql://music_admin:music_password@localhost:5432/music_server_test_${workerId}`;

console.log(`í·ª Test Worker ${workerId} â†’ music_server_test_${workerId}`);
