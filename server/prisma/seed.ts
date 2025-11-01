// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Verificar si ya existe el admin
  const existingAdmin = await prisma.user.findUnique({
    where: { username: 'admin' },
  });

  if (existingAdmin) {
    console.log('✅ Admin user already exists');

    // Actualizar mustChangePassword para poder probar el flujo de first login
    await prisma.user.update({
      where: { username: 'admin' },
      data: { mustChangePassword: true },
    });

    console.log('🔄 Updated mustChangePassword flag to true');
    console.log('');
    console.log('📝 You can now test the first login flow:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('');
    return;
  }

  // Crear admin inicial
  const defaultPassword = 'admin123'; // Contraseña genérica inicial
  const passwordHash = await bcrypt.hash(defaultPassword, 12);

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@musicserver.local',
      passwordHash: passwordHash,
      name: 'Administrator',
      isAdmin: true,
      isActive: true,
      theme: 'dark',
      language: 'es',
      mustChangePassword: true, // Debe cambiar en primer login
    },
  });

  console.log('✅ Admin user created successfully!');
  console.log('');
  console.log('📝 Initial credentials:');
  console.log('   Username: admin');
  console.log('   Password: admin123');
  console.log('');
  console.log('⚠️  IMPORTANT: You MUST change this password on first login!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });