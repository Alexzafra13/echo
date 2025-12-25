/**
 * Architecture Tests
 *
 * Estos tests verifican que se respeten las reglas de arquitectura hexagonal.
 * Si alguien introduce una violación, el test fallará.
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Hexagonal Architecture Compliance', () => {
  const featuresPath = path.join(__dirname, '../../features');

  /**
   * Obtiene todos los archivos .ts de un directorio recursivamente
   */
  function getTypeScriptFiles(dir: string, layer?: string): string[] {
    const files: string[] = [];

    if (!fs.existsSync(dir)) return files;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Si buscamos una capa específica, solo entramos en esa carpeta
        if (layer && entry.name !== layer) {
          // Pero seguimos buscando en subcarpetas
          if (!['domain', 'infrastructure', 'presentation'].includes(entry.name)) {
            files.push(...getTypeScriptFiles(fullPath, layer));
          }
        } else {
          files.push(...getTypeScriptFiles(fullPath, layer ? undefined : layer));
        }
      } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Lee el contenido de un archivo y extrae los imports
   */
  function getImports(filePath: string): string[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const importRegex = /import\s+.*?\s+from\s+['"](.+?)['"]/g;
    const imports: string[] = [];
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  describe('Domain Layer Isolation', () => {
    it('domain layer should NOT import from infrastructure layer', () => {
      const features = fs.readdirSync(featuresPath, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

      const violations: string[] = [];

      for (const feature of features) {
        const domainPath = path.join(featuresPath, feature, 'domain');
        const domainFiles = getTypeScriptFiles(domainPath);

        for (const file of domainFiles) {
          const imports = getImports(file);
          const relativePath = path.relative(featuresPath, file);

          for (const imp of imports) {
            // Detectar imports de infrastructure
            if (imp.includes('/infrastructure/') || imp.includes('../infrastructure')) {
              violations.push(`${relativePath} imports from infrastructure: ${imp}`);
            }
          }
        }
      }

      expect(violations).toEqual([]);
    });

    it('domain layer should NOT import NestJS HTTP exceptions', () => {
      const features = fs.readdirSync(featuresPath, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

      const violations: string[] = [];
      const forbiddenExceptions = [
        'NotFoundException',
        'BadRequestException',
        'UnauthorizedException',
        'ForbiddenException',
        'ConflictException',
        'InternalServerErrorException',
      ];

      for (const feature of features) {
        const domainPath = path.join(featuresPath, feature, 'domain');
        const domainFiles = getTypeScriptFiles(domainPath);

        for (const file of domainFiles) {
          const content = fs.readFileSync(file, 'utf-8');
          const relativePath = path.relative(featuresPath, file);

          for (const exception of forbiddenExceptions) {
            if (content.includes(exception)) {
              violations.push(`${relativePath} uses ${exception}`);
            }
          }
        }
      }

      expect(violations).toEqual([]);
    });

    it('domain layer should NOT contain NestJS guards (CanActivate)', () => {
      const features = fs.readdirSync(featuresPath, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

      const violations: string[] = [];

      for (const feature of features) {
        const domainPath = path.join(featuresPath, feature, 'domain');
        const domainFiles = getTypeScriptFiles(domainPath);

        for (const file of domainFiles) {
          const content = fs.readFileSync(file, 'utf-8');
          const relativePath = path.relative(featuresPath, file);

          if (content.includes('CanActivate') || content.includes('ExecutionContext')) {
            violations.push(`${relativePath} contains NestJS guard interfaces`);
          }
        }
      }

      expect(violations).toEqual([]);
    });

    it('domain layer should NOT make direct HTTP calls (fetch/axios)', () => {
      const features = fs.readdirSync(featuresPath, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

      const violations: string[] = [];

      for (const feature of features) {
        const domainPath = path.join(featuresPath, feature, 'domain');
        const domainFiles = getTypeScriptFiles(domainPath);

        for (const file of domainFiles) {
          const content = fs.readFileSync(file, 'utf-8');
          const relativePath = path.relative(featuresPath, file);

          // Buscar llamadas fetch o axios
          if (/\bfetch\s*\(/.test(content) || /\baxios\b/.test(content)) {
            violations.push(`${relativePath} makes direct HTTP calls`);
          }
        }
      }

      expect(violations).toEqual([]);
    });
  });

  describe('Dependency Direction', () => {
    it('infrastructure should depend on domain (not vice versa)', () => {
      // Este test verifica que la infraestructura importa del dominio,
      // lo cual es correcto (dependencia hacia adentro)
      const features = fs.readdirSync(featuresPath, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

      let infrastructureImportsDomain = false;

      for (const feature of features) {
        const infraPath = path.join(featuresPath, feature, 'infrastructure');
        const infraFiles = getTypeScriptFiles(infraPath);

        for (const file of infraFiles) {
          const imports = getImports(file);

          for (const imp of imports) {
            if (imp.includes('/domain/') || imp.includes('../domain')) {
              infrastructureImportsDomain = true;
              break;
            }
          }
        }
      }

      // Esto debería ser true en una arquitectura hexagonal correcta
      expect(infrastructureImportsDomain).toBe(true);
    });
  });

  describe('Port Pattern Usage', () => {
    it('repositories in infrastructure should implement domain ports', () => {
      const features = fs.readdirSync(featuresPath, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

      const repositoriesWithoutPort: string[] = [];

      for (const feature of features) {
        const infraPath = path.join(featuresPath, feature, 'infrastructure', 'persistence');

        if (!fs.existsSync(infraPath)) continue;

        const repoFiles = fs.readdirSync(infraPath)
          .filter(f => f.endsWith('.repository.ts') && !f.endsWith('.spec.ts'));

        for (const repoFile of repoFiles) {
          const content = fs.readFileSync(path.join(infraPath, repoFile), 'utf-8');

          // Verificar que implementa una interfaz I*Repository
          if (!content.includes('implements I') && !content.includes('implements ')) {
            repositoriesWithoutPort.push(`${feature}/${repoFile}`);
          }
        }
      }

      // Solo advertencia, no fallo
      if (repositoriesWithoutPort.length > 0) {
        console.warn(`Repositories without explicit port implementation:\n${repositoriesWithoutPort.join('\n')}`);
      }
    });
  });
});
