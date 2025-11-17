// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ============================================
  // 1. CREAR USUARIO ADMIN
  // ============================================
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
  } else {
    // Crear admin inicial
    const defaultPassword = 'admin123'; // Contraseña genérica inicial
    const passwordHash = await bcrypt.hash(defaultPassword, 12);

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
        mustChangePassword: true, // Debe cambiar en primer login
      },
    });

    console.log('✅ Admin user created successfully!');
  }

  // ============================================
  // 2. CREAR SETTINGS POR DEFECTO
  // ============================================
  console.log('');
  console.log('⚙️  Creating default settings...');

  const defaultSettings = [
    // External Metadata Providers
    { key: 'metadata.coverart.enabled', value: 'true', category: 'external_metadata', type: 'boolean', description: 'Enable Cover Art Archive (no API key required)' },
    { key: 'metadata.lastfm.enabled', value: 'false', category: 'external_metadata', type: 'boolean', description: 'Enable Last.fm' },
    { key: 'metadata.lastfm.api_key', value: '', category: 'external_metadata', type: 'string', description: 'Last.fm API Key' },
    { key: 'metadata.fanart.enabled', value: 'false', category: 'external_metadata', type: 'boolean', description: 'Enable Fanart.tv' },
    { key: 'metadata.fanart.api_key', value: '', category: 'external_metadata', type: 'string', description: 'Fanart.tv API Key' },

    // Download Settings
    { key: 'metadata.download.enabled', value: 'true', category: 'external_metadata', type: 'boolean', description: 'Download images locally' },
    { key: 'metadata.download.album_covers', value: 'true', category: 'external_metadata', type: 'boolean', description: 'Download album covers' },
    { key: 'metadata.download.artist_images', value: 'true', category: 'external_metadata', type: 'boolean', description: 'Download artist images' },
    { key: 'metadata.download.save_in_album_folder', value: 'true', category: 'external_metadata', type: 'boolean', description: 'Save covers in album folder' },

    // Storage Settings
    { key: 'metadata.storage.location', value: 'centralized', category: 'external_metadata', type: 'string', description: 'Storage location: centralized or portable' },
    { key: 'metadata.storage.path', value: '/storage/metadata', category: 'external_metadata', type: 'string', description: 'Base path for metadata storage' },
    { key: 'metadata.storage.max_size_mb', value: '500', category: 'external_metadata', type: 'number', description: 'Max storage per artist (MB)' },

    // Embed Settings
    { key: 'metadata.embed.enabled', value: 'false', category: 'external_metadata', type: 'boolean', description: 'Allow embedding covers in audio' },
    { key: 'metadata.embed.auto', value: 'false', category: 'external_metadata', type: 'boolean', description: 'Auto-embed without confirmation' },
    { key: 'metadata.embed.backup', value: 'true', category: 'external_metadata', type: 'boolean', description: 'Backup files before embedding' },

    // Conflict Resolution
    { key: 'metadata.conflict.strategy', value: 'ask', category: 'external_metadata', type: 'string', description: 'Strategy when conflict: keep, replace, ask' },

    // Auto-enrich Settings
    { key: 'metadata.auto_enrich.enabled', value: 'false', category: 'external_metadata', type: 'boolean', description: 'Auto-enrich during library scan' },
    { key: 'metadata.auto_enrich.batch_size', value: '10', category: 'external_metadata', type: 'number', description: 'Items to enrich per batch' },
  ];

  let settingsCreated = 0;
  let settingsSkipped = 0;

  for (const setting of defaultSettings) {
    const existing = await prisma.setting.findUnique({
      where: { key: setting.key },
    });

    if (!existing) {
      await prisma.setting.create({
        data: {
          key: setting.key,
          value: setting.value,
          category: setting.category,
          type: setting.type,
          description: setting.description,
          isPublic: false,
        },
      });
      settingsCreated++;
    } else {
      settingsSkipped++;
    }
  }

  console.log(`✅ Settings: ${settingsCreated} created, ${settingsSkipped} already existed`);
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