// scripts/reset-admin-password.js (CommonJS version for production)
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Checking admin user...');

  // Check if admin user exists
  const existingAdmin = await prisma.user.findUnique({
    where: { username: 'admin' },
  });

  if (existingAdmin) {
    // Admin exists - don't reset (user may have changed password already)
    console.log('✅ Admin user already exists - skipping reset');
    console.log('   (Use pnpm admin:reset to manually reset the password)');
  } else {
    // Create new admin user
    const newPassword = 'admin123';
    const passwordHash = await bcrypt.hash(newPassword, 12);

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
