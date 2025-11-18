/**
 * Database Diagnostic Script
 *
 * Verifica el estado de la base de datos, migraciones y cliente de Prisma
 *
 * Uso:
 *   pnpm ts-node -r tsconfig-paths/register scripts/database/diagnose.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface DiagnosticResult {
  status: 'OK' | 'WARNING' | 'ERROR';
  message: string;
  details?: any;
}

async function runDiagnostics(): Promise<void> {
  console.log('═'.repeat(80));
  console.log('  Echo Music Server - Database Diagnostics');
  console.log('═'.repeat(80));
  console.log('');

  const results: DiagnosticResult[] = [];

  // 1. Verificar conexión a la base de datos
  console.log('[1/6] Verificando conexión a la base de datos...');
  try {
    await prisma.$connect();
    results.push({
      status: 'OK',
      message: 'Conexión a la base de datos exitosa',
    });
    console.log('  ✅ Conectado a la base de datos');
  } catch (error) {
    results.push({
      status: 'ERROR',
      message: 'No se pudo conectar a la base de datos',
      details: (error as Error).message,
    });
    console.log(`  ❌ Error: ${(error as Error).message}`);
    console.log('  💡 Verifica que Docker esté corriendo: pnpm docker:dev');
    await printSummary(results);
    process.exit(1);
  }

  // 2. Verificar tablas críticas
  console.log('\n[2/6] Verificando existencia de tablas críticas...');
  const criticalTables = [
    'users',
    'artists',
    'albums',
    'tracks',
    'custom_artist_images',
    'custom_album_covers',
  ];

  try {
    for (const tableName of criticalTables) {
      const result = await prisma.$queryRawUnsafe<any[]>(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = '${tableName}'
        )`
      );

      const exists = result[0]?.exists || false;

      if (exists) {
        console.log(`  ✅ Tabla '${tableName}' existe`);
      } else {
        results.push({
          status: 'ERROR',
          message: `Tabla '${tableName}' no existe`,
          details: 'Ejecuta las migraciones: pnpm db:migrate',
        });
        console.log(`  ❌ Tabla '${tableName}' NO existe`);
      }
    }
  } catch (error) {
    results.push({
      status: 'ERROR',
      message: 'Error al verificar tablas',
      details: (error as Error).message,
    });
    console.log(`  ❌ Error: ${(error as Error).message}`);
  }

  // 3. Verificar columnas de tablas de imágenes
  console.log('\n[3/6] Verificando estructura de tablas de imágenes...');
  const requiredColumns = {
    custom_artist_images: ['id', 'artist_id', 'image_type', 'file_path', 'is_active'],
    custom_album_covers: ['id', 'album_id', 'file_path', 'is_active'],
  };

  try {
    for (const [tableName, columns] of Object.entries(requiredColumns)) {
      for (const columnName of columns) {
        const result = await prisma.$queryRawUnsafe<any[]>(
          `SELECT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = '${tableName}'
            AND column_name = '${columnName}'
          )`
        );

        const exists = result[0]?.exists || false;

        if (!exists) {
          results.push({
            status: 'ERROR',
            message: `Columna '${columnName}' falta en tabla '${tableName}'`,
            details: 'El schema no está sincronizado. Ejecuta: pnpm db:migrate',
          });
          console.log(`  ❌ Columna '${tableName}.${columnName}' NO existe`);
        }
      }
    }
    console.log('  ✅ Estructura de tablas correcta');
  } catch (error) {
    results.push({
      status: 'WARNING',
      message: 'No se pudo verificar estructura completa de tablas',
      details: (error as Error).message,
    });
    console.log(`  ⚠️  Advertencia: ${(error as Error).message}`);
  }

  // 4. Verificar estado de migraciones
  console.log('\n[4/6] Verificando estado de migraciones...');
  try {
    const migrations = await prisma.$queryRaw<any[]>`
      SELECT migration_name, finished_at, rolled_back_at
      FROM "_prisma_migrations"
      ORDER BY finished_at DESC
    `;

    console.log(`  ℹ️  Total de migraciones aplicadas: ${migrations.length}`);

    const rolledBack = migrations.filter(m => m.rolled_back_at !== null);
    if (rolledBack.length > 0) {
      results.push({
        status: 'WARNING',
        message: `${rolledBack.length} migraciones han sido revertidas`,
        details: rolledBack.map(m => m.migration_name),
      });
      console.log(`  ⚠️  ${rolledBack.length} migraciones revertidas`);
    }

    // Mostrar últimas 3 migraciones
    console.log('  Últimas migraciones:');
    migrations.slice(0, 3).forEach(m => {
      const status = m.rolled_back_at ? '🔄' : '✅';
      console.log(`    ${status} ${m.migration_name}`);
    });

    results.push({
      status: 'OK',
      message: 'Migraciones aplicadas correctamente',
    });
  } catch (error) {
    results.push({
      status: 'ERROR',
      message: 'No se pudo verificar el estado de migraciones',
      details: (error as Error).message,
    });
    console.log(`  ❌ Error: ${(error as Error).message}`);
    console.log('  💡 Es posible que necesites ejecutar: pnpm db:migrate');
  }

  // 5. Verificar datos de prueba
  console.log('\n[5/6] Verificando datos en tablas de imágenes...');
  try {
    const customArtistImagesCount = await prisma.customArtistImage.count();
    const customAlbumCoversCount = await prisma.customAlbumCover.count();

    console.log(`  ℹ️  custom_artist_images: ${customArtistImagesCount} registros`);
    console.log(`  ℹ️  custom_album_covers: ${customAlbumCoversCount} registros`);

    results.push({
      status: 'OK',
      message: 'Tablas de imágenes accesibles',
      details: {
        customArtistImages: customArtistImagesCount,
        customAlbumCovers: customAlbumCoversCount,
      },
    });
  } catch (error) {
    results.push({
      status: 'ERROR',
      message: 'No se puede acceder a las tablas de imágenes',
      details: (error as Error).message,
    });
    console.log(`  ❌ Error: ${(error as Error).message}`);
    console.log('  💡 El cliente de Prisma puede no estar generado correctamente');
    console.log('  💡 Ejecuta: pnpm db:generate');
  }

  // 6. Verificar archivos de migración
  console.log('\n[6/6] Verificando archivos de migración...');
  try {
    const migrationsDir = path.join(__dirname, '..', '..', 'prisma', 'migrations');
    const migrationFolders = fs.readdirSync(migrationsDir)
      .filter(f => f !== 'migration_lock.toml' && fs.statSync(path.join(migrationsDir, f)).isDirectory());

    console.log(`  ℹ️  Archivos de migración encontrados: ${migrationFolders.length}`);
    migrationFolders.forEach(folder => {
      console.log(`    📄 ${folder}`);
    });

    results.push({
      status: 'OK',
      message: 'Archivos de migración presentes',
      details: { count: migrationFolders.length },
    });
  } catch (error) {
    results.push({
      status: 'WARNING',
      message: 'No se pudieron leer los archivos de migración',
      details: (error as Error).message,
    });
    console.log(`  ⚠️  Advertencia: ${(error as Error).message}`);
  }

  // Imprimir resumen
  await printSummary(results);

  await prisma.$disconnect();
}

function printSummary(results: DiagnosticResult[]): void {
  console.log('\n' + '═'.repeat(80));
  console.log('  Resumen de Diagnóstico');
  console.log('═'.repeat(80));

  const errors = results.filter(r => r.status === 'ERROR');
  const warnings = results.filter(r => r.status === 'WARNING');
  const ok = results.filter(r => r.status === 'OK');

  console.log(`\n  ✅ OK: ${ok.length}`);
  console.log(`  ⚠️  ADVERTENCIAS: ${warnings.length}`);
  console.log(`  ❌ ERRORES: ${errors.length}\n`);

  if (errors.length > 0) {
    console.log('  ERRORES ENCONTRADOS:');
    errors.forEach((error, index) => {
      console.log(`    ${index + 1}. ${error.message}`);
      if (error.details) {
        console.log(`       → ${typeof error.details === 'string' ? error.details : JSON.stringify(error.details)}`);
      }
    });
    console.log('\n  💡 RECOMENDACIONES:');
    console.log('     1. Asegúrate de que Docker esté corriendo: pnpm docker:dev');
    console.log('     2. Ejecuta las migraciones pendientes: pnpm db:migrate');
    console.log('     3. Regenera el cliente de Prisma: pnpm db:generate');
    console.log('     4. Reinicia el servidor: pnpm dev');
  } else if (warnings.length > 0) {
    console.log('  ADVERTENCIAS:');
    warnings.forEach((warning, index) => {
      console.log(`    ${index + 1}. ${warning.message}`);
      if (warning.details) {
        console.log(`       → ${typeof warning.details === 'string' ? warning.details : JSON.stringify(warning.details)}`);
      }
    });
  } else {
    console.log('  🎉 ¡Todo está en orden! La base de datos está configurada correctamente.\n');
  }

  console.log('═'.repeat(80) + '\n');
}

// Ejecutar diagnósticos
runDiagnostics()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal durante el diagnóstico:', error);
    process.exit(1);
  });
