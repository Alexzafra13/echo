// prisma/seed-settings-only.ts
// Seeds ONLY default settings, NOT admin user (admin is created via setup wizard)

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding default settings...');

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
    { key: 'metadata.download.save_in_album_folder', value: 'false', category: 'external_metadata', type: 'boolean', description: 'Save covers in album folder' },

    // Storage Settings (using new /app/data path)
    { key: 'metadata.storage.location', value: 'centralized', category: 'external_metadata', type: 'string', description: 'Storage location: centralized or portable' },
    { key: 'metadata.storage.path', value: '/app/data/metadata', category: 'external_metadata', type: 'string', description: 'Base path for metadata storage' },
    { key: 'metadata.storage.max_size_mb', value: '500', category: 'external_metadata', type: 'number', description: 'Max storage per artist (MB)' },

    // Embed Settings
    { key: 'metadata.embed.enabled', value: 'false', category: 'external_metadata', type: 'boolean', description: 'Allow embedding covers in audio' },
    { key: 'metadata.embed.auto', value: 'false', category: 'external_metadata', type: 'boolean', description: 'Auto-embed without confirmation' },
    { key: 'metadata.embed.backup', value: 'true', category: 'external_metadata', type: 'boolean', description: 'Backup files before embedding' },

    // Conflict Resolution
    { key: 'metadata.conflict.strategy', value: 'ask', category: 'external_metadata', type: 'string', description: 'Strategy when conflict: keep, replace, ask' },

    // Auto-enrich Settings
    { key: 'metadata.auto_enrich.enabled', value: 'true', category: 'external_metadata', type: 'boolean', description: 'Auto-enrich during library scan' },
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
  console.log('ℹ️  Admin user will be created via setup wizard');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding settings:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
