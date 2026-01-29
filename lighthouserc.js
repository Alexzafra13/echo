/**
 * Lighthouse CI Configuration
 * @see https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/configuration.md
 */
module.exports = {
  ci: {
    collect: {
      // URLs to test
      url: [
        'http://localhost:5173/login',
        'http://localhost:5173/home',
        'http://localhost:5173/albums',
        'http://localhost:5173/artists',
      ],
      // Start the dev server before running
      startServerCommand: 'cd web && pnpm dev',
      startServerReadyPattern: 'Local:',
      startServerReadyTimeout: 30000,
      // Number of runs per URL (average results)
      numberOfRuns: 3,
      // Chromium settings
      settings: {
        preset: 'desktop',
        // Skip some audits that don't apply to dev
        skipAudits: [
          'uses-http2',
          'uses-long-cache-ttl',
        ],
      },
    },
    assert: {
      // Performance thresholds
      assertions: {
        // Performance score (0-1)
        'categories:performance': ['warn', { minScore: 0.7 }],
        // Accessibility score
        'categories:accessibility': ['error', { minScore: 0.9 }],
        // Best practices
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        // SEO (less important for SPA)
        'categories:seo': ['warn', { minScore: 0.7 }],

        // Specific performance metrics
        'first-contentful-paint': ['warn', { maxNumericValue: 3000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 4000 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 500 }],

        // Accessibility checks that should always pass
        'color-contrast': 'error',
        'document-title': 'error',
        'html-has-lang': 'error',
        'meta-viewport': 'error',
      },
    },
    upload: {
      // Use temporary public storage (free, no account needed)
      target: 'temporary-public-storage',
    },
  },
};
