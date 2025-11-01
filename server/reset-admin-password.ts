import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetAdminPassword() {
  try {
    const admin = await prisma.user.update({
      where: { username: 'admin' },
      data: { mustChangePassword: true },
    });

    console.log('✅ Usuario admin actualizado:');
    console.log(`   - Username: ${admin.username}`);
    console.log(`   - Must Change Password: ${admin.mustChangePassword}`);
    console.log('\n🔐 Ahora puedes hacer login con admin/admin123 y probar el FirstLoginPage');
  } catch (error) {
    console.error('❌ Error al actualizar el usuario admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAdminPassword();
