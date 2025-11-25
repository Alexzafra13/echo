// scripts/reset-admin-password.js (CommonJS version for production)
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Checking admin user...');

  const DEFAULT_PASSWORD = 'admin123';

  // Check if admin user exists
  const existingAdmin = await prisma.user.findUnique({
    where: { username: 'admin' },
    select: { passwordHash: true, mustChangePassword: true },
  });

  if (existingAdmin) {
    // Admin exists - check if they're still using default password
    const isUsingDefaultPassword = await bcrypt.compare(DEFAULT_PASSWORD, existingAdmin.passwordHash);

    if (isUsingDefaultPassword && !existingAdmin.mustChangePassword) {
      // Has default password but mustChangePassword is false → force password change
      await prisma.user.update({
        where: { username: 'admin' },
        data: { mustChangePassword: true },
      });
      console.log('⚠️  Admin still using default password - forcing password change on next login');
    } else if (!isUsingDefaultPassword && existingAdmin.mustChangePassword) {
      // User changed password but mustChangePassword is still true → clear flag
      await prisma.user.update({
        where: { username: 'admin' },
        data: { mustChangePassword: false },
      });
      console.log('✅ Admin password already changed - clearing first-login flag');
    } else {
      // Everything is consistent - no changes needed
      console.log('✅ Admin user OK (no changes needed)');
    }
  } else {
    // Create new admin user with default password
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

    await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@musicserver.local',
        passwordHash: passwordHash,
        name: 'Administrator',
        isAdmin: true,
        isActive: true,
        theme: 'dark',
        language: 'es',
        mustChangePassword: true,
      },
    });
    console.log('✅ Admin user created successfully!');
    console.log('');
    console.log('📝 Credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('');
    console.log('⚠️  You MUST change this password on first login!');
  }
}

main()
  .catch((e) => {
    console.error('❌ Error resetting password:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
