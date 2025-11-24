import { PrismaClient } from '@prisma/client';

/**
 * Script to normalize path separators in custom image records
 *
 * Problem: Old records may have Windows backslashes (\) in filePath
 * Solution: Replace all backslashes with forward slashes (/)
 *
 * Usage: npx ts-node src/scripts/normalize-custom-image-paths.ts
 */

const prisma = new PrismaClient();

async function normalizeCustomImagePaths() {
  console.log('🔍 Finding custom artist images with backslashes...');

  const artistImages = await prisma.customArtistImage.findMany({
    where: {
      filePath: {
        contains: '\\',
      },
    },
  });

  console.log(`Found ${artistImages.length} artist images to normalize`);

  for (const image of artistImages) {
    const normalizedPath = image.filePath.replace(/\\/g, '/');
    console.log(`  Updating ${image.id}: ${image.filePath} -> ${normalizedPath}`);

    await prisma.customArtistImage.update({
      where: { id: image.id },
      data: { filePath: normalizedPath },
    });
  }

  console.log('🔍 Finding custom album covers with backslashes...');

  const albumCovers = await prisma.customAlbumCover.findMany({
    where: {
      filePath: {
        contains: '\\',
      },
    },
  });

  console.log(`Found ${albumCovers.length} album covers to normalize`);

  for (const cover of albumCovers) {
    const normalizedPath = cover.filePath.replace(/\\/g, '/');
    console.log(`  Updating ${cover.id}: ${cover.filePath} -> ${normalizedPath}`);

    await prisma.customAlbumCover.update({
      where: { id: cover.id },
      data: { filePath: normalizedPath },
    });
  }

  console.log('✅ Done! All paths normalized.');
}

normalizeCustomImagePaths()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
