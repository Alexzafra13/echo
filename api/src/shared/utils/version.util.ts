import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Get application version from package.json
 */
let cachedVersion: string | null = null;

export function getVersion(): string {
  if (cachedVersion) {
    return cachedVersion;
  }

  try {
    // In production (dist), package.json is 3 levels up from dist/src/shared/utils
    // In development, it's 4 levels up from src/shared/utils
    const possiblePaths = [
      join(__dirname, '..', '..', '..', '..', 'package.json'),
      join(__dirname, '..', '..', '..', 'package.json'),
    ];

    for (const packagePath of possiblePaths) {
      try {
        const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
        if (packageJson.version) {
          cachedVersion = packageJson.version;
          return packageJson.version;
        }
      } catch {
        // Try next path
      }
    }
  } catch {
    // Fallback
  }

  cachedVersion = '0.0.0';
  return '0.0.0';
}
