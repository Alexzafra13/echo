// scripts/reset-admin-password.js
// Resets admin password to default - for development/recovery only
// Usage: node scripts/reset-admin-password.js

const { drizzle } = require('drizzle-orm/node-postgres');
const { eq } = require('drizzle-orm');
const { pgTable, uuid, varchar, boolean, timestamp } = require('drizzle-orm/pg-core');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Define users table inline (to avoid TypeScript import issues)
const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 100 }),
  isAdmin: boolean('is_admin').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  theme: varchar('theme', { length: 20 }).default('dark'),
  language: varchar('language', { length: 10 }).default('en'),
  mustChangePassword: boolean('must_change_password').default(false),
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

  const DEFAULT_PASSWORD = 'admin123';

  try {
    // Check if admin user exists
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.username, 'admin'))
      .limit(1);

    if (existingAdmin.length > 0) {
      const admin = existingAdmin[0];

      // Reset password to default
      const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

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
      console.log('   Password: admin123');
      console.log('');
      console.log('⚠️  You MUST change this password on first login!');
    } else {
      // Create new admin user
      const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

      await db.insert(users).values({
        username: 'admin',
        email: 'admin@musicserver.local',
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
      console.log('   Password: admin123');
      console.log('');
      console.log('⚠️  You MUST change this password on first login!');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
