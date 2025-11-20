// scripts/reset-admin-password.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Resetting admin password...');

  const newPassword = 'admin123';
  const passwordHash = await bcrypt.hash(newPassword, 12);

  const result = await prisma.user.update({
    where: { username: 'admin' },
    data: {
      passwordHash: passwordHash,
      mustChangePassword: true,
      isActive: true,
    },
  });

  console.log('✅ Admin password reset successfully!');
  console.log('');
  console.log('📝 New credentials:');
  console.log('   Username: admin');
  console.log('   Password: admin123');
  console.log('');
  console.log('⚠️  You MUST change this password on first login!');
}

main()
  .catch((e) => {
    console.error('❌ Error resetting password:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
