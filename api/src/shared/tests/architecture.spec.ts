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

  function getDomainFiles(): Array<{ file: string; relativePath: string; content: string }> {
    const features = fs.readdirSync(featuresPath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    const domainFiles: Array<{ file: string; relativePath: string; content: string }> = [];

    for (const feature of features) {
      const domainPath = path.join(featuresPath, feature, 'domain');
      const files = getTypeScriptFiles(domainPath);

      for (const file of files) {
        domainFiles.push({
          file,
          relativePath: path.relative(featuresPath, file),
          content: fs.readFileSync(file, 'utf-8'),
        });
      }
    }

    return domainFiles;
  }

  describe('Domain Layer Isolation', () => {
    it('domain layer should NOT import from infrastructure layer', () => {
      const domainFiles = getDomainFiles();
      const violations: string[] = [];

      for (const { file, relativePath } of domainFiles) {
        const imports = getImports(file);

        for (const imp of imports) {
          if (imp.includes('/infrastructure/') || imp.includes('../infrastructure')) {
            violations.push(`${relativePath} imports from infrastructure: ${imp}`);
          }
        }
      }

      expect(violations).toEqual([]);
    });

    it('domain layer should NOT import NestJS HTTP exceptions', () => {
      const domainFiles = getDomainFiles();
      const violations: string[] = [];
      const forbiddenExceptions = [
        'NotFoundException',
        'BadRequestException',
        'UnauthorizedException',
        'ForbiddenException',
        'ConflictException',
        'InternalServerErrorException',
        'HttpException',
      ];

      for (const { relativePath, content } of domainFiles) {
        for (const exception of forbiddenExceptions) {
          // Match as whole word to avoid false positives
          const regex = new RegExp(`\\b${exception}\\b`);
          if (regex.test(content)) {
            violations.push(`${relativePath} uses ${exception}`);
          }
        }
      }

      expect(violations).toEqual([]);
    });

    it('domain layer should NOT contain NestJS guards (CanActivate)', () => {
      const domainFiles = getDomainFiles();
      const violations: string[] = [];

      for (const { relativePath, content } of domainFiles) {
        if (/\bCanActivate\b/.test(content) || /\bExecutionContext\b/.test(content)) {
          violations.push(`${relativePath} contains NestJS guard interfaces`);
        }
      }

      expect(violations).toEqual([]);
    });

    it('domain layer should NOT make direct HTTP calls (fetch/axios)', () => {
      const domainFiles = getDomainFiles();
      const violations: string[] = [];

      for (const { relativePath, content } of domainFiles) {
        if (/\bfetch\s*\(/.test(content) || /\bawait\s+fetch\b/.test(content) || /\baxios\b/.test(content)) {
          violations.push(`${relativePath} makes direct HTTP calls`);
        }
      }

      expect(violations).toEqual([]);
    });

    it('domain layer should NOT import from presentation layer', () => {
      const domainFiles = getDomainFiles();
      const violations: string[] = [];

      for (const { file, relativePath } of domainFiles) {
        const imports = getImports(file);

        for (const imp of imports) {
          if (imp.includes('/presentation/') || imp.includes('../presentation')) {
            violations.push(`${relativePath} imports from presentation: ${imp}`);
          }
        }
      }

      expect(violations).toEqual([]);
    });

    it('domain layer should NOT use NestJS decorators for controllers/guards', () => {
      const domainFiles = getDomainFiles();
      const violations: string[] = [];
      const forbiddenDecorators = [
        '@Controller',
        '@Get',
        '@Post',
        '@Put',
        '@Patch',
        '@Delete',
        '@UseGuards',
        '@UseInterceptors',
      ];

      for (const { relativePath, content } of domainFiles) {
        for (const decorator of forbiddenDecorators) {
          const regex = new RegExp(`${decorator.replace('@', '@')}\\s*\\(`);
          if (regex.test(content)) {
            violations.push(`${relativePath} uses ${decorator}`);
          }
        }
      }

      expect(violations).toEqual([]);
    });
  });

  describe('Dependency Direction', () => {
    it('infrastructure should depend on domain (not vice versa)', () => {
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

      expect(infrastructureImportsDomain).toBe(true);
    });

    it('presentation should NOT import directly from infrastructure persistence', () => {
      const features = fs.readdirSync(featuresPath, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

      const violations: string[] = [];

      for (const feature of features) {
        const presentationPath = path.join(featuresPath, feature, 'presentation');
        const presentationFiles = getTypeScriptFiles(presentationPath);

        for (const file of presentationFiles) {
          const imports = getImports(file);
          const relativePath = path.relative(featuresPath, file);

          for (const imp of imports) {
            // Presentation should never import repositories directly
            if (imp.includes('/infrastructure/persistence/')) {
              violations.push(`${relativePath} imports persistence directly: ${imp}`);
            }
          }
        }
      }

      expect(violations).toEqual([]);
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

          if (!/implements\s+I\w+Repository/.test(content)) {
            repositoriesWithoutPort.push(`${feature}/${repoFile}`);
          }
        }
      }

      expect(repositoriesWithoutPort).toEqual([]);
    });
  });
});
