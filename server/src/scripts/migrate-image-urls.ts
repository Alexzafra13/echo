import { PrismaClient } from '@prisma/client';

/**
 * Script to migrate artist image URLs from local file paths to API URLs
 *
 * Converts:
 *   file:///C:/Users/.../storage/metadata/artists/{id}/profile-large.jpg
 * To:
 *   /api/images/artists/{id}/profile-large
 */

const prisma = new PrismaClient();

async function migrateImageUrls() {
  console.log('🔄 Starting artist image URL migration...\n');

  try {
    // Get all artists with image URLs
    const artists = await prisma.artist.findMany({
      where: {
        OR: [
          { smallImageUrl: { not: null } },
          { mediumImageUrl: { not: null } },
          { largeImageUrl: { not: null } },
          { backgroundImageUrl: { not: null } },
          { bannerImageUrl: { not: null } },
          { logoImageUrl: { not: null } },
        ],
      },
      select: {
        id: true,
        name: true,
        smallImageUrl: true,
        mediumImageUrl: true,
        largeImageUrl: true,
        backgroundImageUrl: true,
        bannerImageUrl: true,
        logoImageUrl: true,
      },
    });

    console.log(`📊 Found ${artists.length} artists with images\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const artist of artists) {
      const updates: any = {};
      let needsUpdate = false;

      // Check and convert each image URL
      if (artist.smallImageUrl && !artist.smallImageUrl.startsWith('/api/')) {
        updates.smallImageUrl = `/api/images/artists/${artist.id}/profile-small`;
        needsUpdate = true;
      }

      if (artist.mediumImageUrl && !artist.mediumImageUrl.startsWith('/api/')) {
        updates.mediumImageUrl = `/api/images/artists/${artist.id}/profile-medium`;
        needsUpdate = true;
      }

      if (artist.largeImageUrl && !artist.largeImageUrl.startsWith('/api/')) {
        updates.largeImageUrl = `/api/images/artists/${artist.id}/profile-large`;
        needsUpdate = true;
      }

      if (artist.backgroundImageUrl && !artist.backgroundImageUrl.startsWith('/api/')) {
        updates.backgroundImageUrl = `/api/images/artists/${artist.id}/background`;
        needsUpdate = true;
      }

      if (artist.bannerImageUrl && !artist.bannerImageUrl.startsWith('/api/')) {
        updates.bannerImageUrl = `/api/images/artists/${artist.id}/banner`;
        needsUpdate = true;
      }

      if (artist.logoImageUrl && !artist.logoImageUrl.startsWith('/api/')) {
        updates.logoImageUrl = `/api/images/artists/${artist.id}/logo`;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await prisma.artist.update({
          where: { id: artist.id },
          data: updates,
        });
        updatedCount++;
        console.log(`✅ Updated: ${artist.name}`);
      } else {
        skippedCount++;
        console.log(`⏭️  Skipped: ${artist.name} (already using API URLs)`);
      }
    }

    console.log(`\n✨ Migration completed!`);
    console.log(`   Updated: ${updatedCount} artists`);
    console.log(`   Skipped: ${skippedCount} artists`);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateImageUrls()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error:', error);
    process.exit(1);
  });
