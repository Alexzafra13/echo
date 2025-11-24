import { PrismaClient } from '@prisma/client';

/**
 * Script to verify artist image paths in V2 schema
 *
 * V2 schema uses filenames (profile.jpg, background.jpg, etc.) instead of full paths or URLs.
 * This script checks if any artists have invalid path formats and can clean them up.
 *
 * @deprecated This script is for V1 to V2 migration. Use the SQL migration instead.
 */

const prisma = new PrismaClient();

async function migrateImageUrls() {
  console.log('🔄 Checking artist image paths (V2 schema)...\n');

  try {
    // Get all artists with external images
    const artists = await prisma.artist.findMany({
      where: {
        OR: [
          { externalProfilePath: { not: null } },
          { externalBackgroundPath: { not: null } },
          { externalBannerPath: { not: null } },
          { externalLogoPath: { not: null } },
        ],
      },
      select: {
        id: true,
        name: true,
        externalProfilePath: true,
        externalBackgroundPath: true,
        externalBannerPath: true,
        externalLogoPath: true,
      },
    });

    console.log(`📊 Found ${artists.length} artists with images\n`);

    let validCount = 0;
    let invalidCount = 0;

    for (const artist of artists) {
      const issues: string[] = [];

      // V2 schema expects just filenames (profile.jpg, background.jpg, etc.), not full paths
      // Check each field to ensure it's just a filename
      const validatePath = (path: string | null, expectedFilename: string, fieldName: string) => {
        if (!path) return true;

        // Should be just a filename, not a full path or URL
        if (path.includes('/') || path.includes('\\') || path.startsWith('http') || path.startsWith('file:')) {
          issues.push(`${fieldName}: "${path}" (expected: "${expectedFilename}")`);
          return false;
        }
        return true;
      };

      validatePath(artist.externalProfilePath, 'profile.jpg', 'externalProfilePath');
      validatePath(artist.externalBackgroundPath, 'background.jpg', 'externalBackgroundPath');
      validatePath(artist.externalBannerPath, 'banner.png', 'externalBannerPath');
      validatePath(artist.externalLogoPath, 'logo.png', 'externalLogoPath');

      if (issues.length > 0) {
        invalidCount++;
        console.log(`❌ ${artist.name} has invalid paths:`);
        issues.forEach(issue => console.log(`   - ${issue}`));
      } else {
        validCount++;
        console.log(`✅ ${artist.name} - all paths valid`);
      }
    }

    console.log(`\n✨ Verification completed!`);
    console.log(`   Valid: ${validCount} artists`);
    console.log(`   Invalid: ${invalidCount} artists`);

    if (invalidCount > 0) {
      console.log(`\n⚠️  Note: Run the SQL migration to fix invalid paths automatically.`);
    }
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
