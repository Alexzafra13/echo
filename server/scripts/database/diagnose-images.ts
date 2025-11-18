/**
 * Image Diagnostic Script
 *
 * Verifica por qué las imágenes no se están mostrando:
 * - Revisa álbumes en la BD
 * - Verifica rutas de covers
 * - Comprueba existencia de archivos físicos
 * - Prueba las rutas de la API
 *
 * Uso: pnpm ts-node -r tsconfig-paths/register scripts/database/diagnose-images.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';

const prisma = new PrismaClient();

async function diagnoseImages() {
  console.log('═'.repeat(80));
  console.log('  Diagnóstico de Imágenes - Echo Music Server');
  console.log('═'.repeat(80));
  console.log('');

  try {
    // 1. Verificar conexión
    console.log('[1/5] Verificando conexión a la base de datos...');
    await prisma.$connect();
    console.log('  ✅ Conectado\n');

    // 2. Contar álbumes
    console.log('[2/5] Verificando álbumes en la base de datos...');
    const albumCount = await prisma.album.count();
    console.log(`  ℹ️  Total de álbumes: ${albumCount}`);

    if (albumCount === 0) {
      console.log('  ⚠️  NO HAY ÁLBUMES en la base de datos');
      console.log('  💡 Necesitas escanear tu biblioteca de música primero');
      console.log('  💡 Accede al frontend > Admin > Scanner y escanea una carpeta con música\n');
      await prisma.$disconnect();
      return;
    }

    // 3. Verificar álbumes con covers
    console.log('\n[3/5] Verificando álbumes con información de portadas...');

    const albumsWithLocalCovers = await prisma.album.count({
      where: {
        coverArtPath: { not: null }
      }
    });

    const albumsWithExternalCovers = await prisma.album.count({
      where: {
        externalCoverPath: { not: null }
      }
    });

    const albumsWithCustomCovers = await prisma.customAlbumCover.count({
      where: { isActive: true }
    });

    console.log(`  ℹ️  Álbumes con cover local (del archivo MP3): ${albumsWithLocalCovers}`);
    console.log(`  ℹ️  Álbumes con cover externa (descargada): ${albumsWithExternalCovers}`);
    console.log(`  ℹ️  Álbumes con cover personalizada: ${albumsWithCustomCovers}`);

    const totalWithCovers = albumsWithLocalCovers + albumsWithExternalCovers + albumsWithCustomCovers;

    if (totalWithCovers === 0) {
      console.log('\n  ⚠️  NINGÚN ÁLBUM TIENE PORTADAS');
      console.log('  💡 Posibles causas:');
      console.log('     - Los archivos MP3 no tienen portadas embebidas');
      console.log('     - No se han descargado covers externas');
      console.log('  💡 Soluciones:');
      console.log('     - Enriquece los álbumes desde Admin > Metadata Enrichment');
      console.log('     - Usa archivos MP3 con covers embebidas\n');
      await prisma.$disconnect();
      return;
    }

    // 4. Verificar archivos físicos (sample de 5 álbumes)
    console.log('\n[4/5] Verificando existencia de archivos físicos (muestra de 5)...');

    const sampleAlbums = await prisma.album.findMany({
      where: {
        OR: [
          { coverArtPath: { not: null } },
          { externalCoverPath: { not: null } }
        ]
      },
      select: {
        id: true,
        title: true,
        coverArtPath: true,
        externalCoverPath: true,
      },
      take: 5
    });

    for (const album of sampleAlbums) {
      const coverPath = album.externalCoverPath || album.coverArtPath;
      if (!coverPath) continue;

      // Normalizar la ruta (puede estar en diferentes formatos)
      const normalizedPath = coverPath.replace(/\\/g, '/');

      try {
        await fs.access(normalizedPath);
        const stats = await fs.stat(normalizedPath);
        console.log(`  ✅ ${album.title.substring(0, 40).padEnd(40)} | ${(stats.size / 1024).toFixed(1)} KB`);
      } catch (error) {
        console.log(`  ❌ ${album.title.substring(0, 40).padEnd(40)} | Archivo no existe: ${normalizedPath}`);
        console.log(`     💡 Ruta en BD: ${coverPath}`);
      }
    }

    // 5. Generar URLs de prueba
    console.log('\n[5/5] URLs de prueba para el navegador:');
    console.log('  💡 Prueba estas URLs en tu navegador (con el servidor corriendo):\n');

    const testAlbums = await prisma.album.findMany({
      where: {
        OR: [
          { coverArtPath: { not: null } },
          { externalCoverPath: { not: null } }
        ]
      },
      select: {
        id: true,
        title: true,
      },
      take: 3
    });

    for (const album of testAlbums) {
      console.log(`  📀 ${album.title}`);
      console.log(`     http://localhost:3000/api/images/albums/${album.id}/cover`);
      console.log('');
    }

    // Resumen final
    console.log('═'.repeat(80));
    console.log('  Resumen');
    console.log('═'.repeat(80));
    console.log(`  Total de álbumes: ${albumCount}`);
    console.log(`  Álbumes con alguna portada: ${totalWithCovers}`);
    console.log(`  Porcentaje con portadas: ${((totalWithCovers / albumCount) * 100).toFixed(1)}%`);
    console.log('');

    if (totalWithCovers > 0) {
      console.log('  ✅ Hay álbumes con portadas en la base de datos');
      console.log('');
      console.log('  📋 Checklist para que las imágenes se vean:');
      console.log('     1. ✓ Base de datos tiene álbumes');
      console.log('     2. ✓ Álbumes tienen rutas de portadas');
      console.log('     3. ⬜ El backend está corriendo en http://localhost:3000');
      console.log('     4. ⬜ El frontend puede hacer peticiones a /api/images/...');
      console.log('');
      console.log('  🚀 Próximos pasos:');
      console.log('     1. Inicia el backend: cd server && pnpm dev');
      console.log('     2. Inicia el frontend: cd frontend && pnpm dev');
      console.log('     3. Prueba una URL de cover en el navegador');
      console.log('     4. Abre el frontend y verifica que se vean las portadas');
    }

    console.log('═'.repeat(80));
    console.log('');

  } catch (error) {
    console.error('\n❌ Error durante el diagnóstico:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseImages();
