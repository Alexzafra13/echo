// scripts/reset-admin-password.js
// Resets admin password to a secure random password - for recovery only
// Usage: node scripts/reset-admin-password.js

const { drizzle } = require('drizzle-orm/node-postgres');
const { eq } = require('drizzle-orm');
const { pgTable, uuid, varchar, boolean, timestamp } = require('drizzle-orm/pg-core');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const { randomBytes } = require('crypto');

/**
 * Generate a secure random password
 * Ensures at least 1 uppercase, 1 lowercase, 1 digit, 1 special char
 */
function generateSecurePassword() {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const special = '@$!%*?&';
  const all = upper + lower + digits + special;

  // Ensure at least one of each required type
  const bytes = randomBytes(12);
  let password = [
    upper[bytes[0] % upper.length],
    lower[bytes[1] % lower.length],
    digits[bytes[2] % digits.length],
    special[bytes[3] % special.length],
  ];

  // Fill remaining with random characters
  for (let i = 4; i < 12; i++) {
    password.push(all[bytes[i] % all.length]);
  }

  // Fisher-Yates shuffle
  for (let i = password.length - 1; i > 0; i--) {
    const j = randomBytes(1)[0] % (i + 1);
    [password[i], password[j]] = [password[j], password[i]];
  }

  return password.join('');
}

// Define users table inline (to avoid TypeScript import issues)
// Must match the actual schema in src/infrastructure/database/schema/users.ts
const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 100 }),
  isAdmin: boolean('is_admin').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  theme: varchar('theme', { length: 20 }).default('dark').notNull(),
  language: varchar('language', { length: 10 }).default('es').notNull(),
  mustChangePassword: boolean('must_change_password').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;

  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool);

  console.log('🔄 Checking admin user...');

  const temporaryPassword = generateSecurePassword();

  try {
    // Check if admin user exists
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.username, 'admin'))
      .limit(1);

    if (existingAdmin.length > 0) {
      const admin = existingAdmin[0];

      // Reset password to secure random password
      const passwordHash = await bcrypt.hash(temporaryPassword, 12);

      await db
        .update(users)
        .set({
          passwordHash: passwordHash,
          mustChangePassword: true,
          updatedAt: new Date()
        })
        .where(eq(users.username, 'admin'));

      console.log('✅ Admin password reset successfully!');
      console.log('');
      console.log('📝 Credentials:');
      console.log('   Username: admin');
      console.log(`   Password: ${temporaryPassword}`);
      console.log('');
      console.log('⚠️  You MUST change this password on first login!');
      console.log('⚠️  Copy the password now - it will NOT be shown again!');
    } else {
      // Create new admin user
      const passwordHash = await bcrypt.hash(temporaryPassword, 12);

      await db.insert(users).values({
        username: 'admin',
        passwordHash: passwordHash,
        name: 'Administrator',
        isAdmin: true,
        isActive: true,
        theme: 'dark',
        language: 'es',
        mustChangePassword: true,
      });

      console.log('✅ Admin user created successfully!');
      console.log('');
      console.log('📝 Credentials:');
      console.log('   Username: admin');
      console.log(`   Password: ${temporaryPassword}`);
      console.log('');
      console.log('⚠️  You MUST change this password on first login!');
      console.log('⚠️  Copy the password now - it will NOT be shown again!');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
