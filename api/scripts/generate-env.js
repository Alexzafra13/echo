#!/usr/bin/env node

/**
 * Generate .env file with secure defaults
 * Similar to Jellyfin's approach: auto-generate secrets, use sensible defaults
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Generate a secure random secret
function generateSecret(length = 64) {
  return crypto.randomBytes(length).toString('base64');
}

// Check if .env already exists
const envPath = path.join(__dirname, '..', '.env');

if (fs.existsSync(envPath)) {
  console.log('✅ .env file already exists, skipping generation');
  process.exit(0);
}

console.log('🔧 Generating .env file with secure defaults...');

// Generate secure secrets
const jwtSecret = generateSecret(64);
const jwtRefreshSecret = generateSecret(64);

// Create .env content
const envContent = `# ============================================
# Echo Music Server - Development Environment
# ============================================
# Auto-generated configuration file
# Generated on: ${new Date().toISOString()}
#
# This file contains secure defaults for development.
# For production, review and update the security settings.

# ============================================
# APPLICATION
# ============================================
NODE_ENV=development
PORT=3000

# ============================================
# DATABASE (PostgreSQL)
# ============================================
# These values match docker-compose.dev.yml
# Change to 'postgres' if running inside Docker container
DATABASE_URL=postgresql://music_user:music_password@localhost:5432/music_db?schema=public

# ============================================
# REDIS CACHE
# ============================================
# These values match docker-compose.dev.yml
# Change to 'redis' if running inside Docker container
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=dev_redis_password

# ============================================
# JWT SECURITY
# ============================================
# Auto-generated secure secrets (do not share!)
JWT_SECRET=${jwtSecret}
JWT_REFRESH_SECRET=${jwtRefreshSecret}

# ============================================
# CORS
# ============================================
# In development, allow frontend dev server
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# ============================================
# FILE STORAGE
# ============================================
UPLOAD_PATH=./uploads
COVERS_PATH=./uploads/covers
`;

try {
  fs.writeFileSync(envPath, envContent, 'utf-8');
  console.log('✅ .env file created successfully!');
  console.log('');
  console.log('📝 Configuration summary:');
  console.log('   - Database: postgresql://music_user:***@localhost:5432/music_db');
  console.log('   - Redis: localhost:6379');
  console.log('   - Port: 3000');
  console.log('   - JWT secrets: Auto-generated (secure)');
  console.log('');
  console.log('⚠️  IMPORTANT: Keep your .env file private!');
  console.log('   It contains sensitive security credentials.');
  console.log('');
} catch (error) {
  console.error('❌ Error creating .env file:', error.message);
  process.exit(1);
}
