# MBID Search Tracking Migration

## Overview

This migration adds `mbidSearchedAt` timestamp fields to the Artist, Album, and Track tables. These fields track when MusicBrainz ID (MBID) searches were last attempted for each entity.

## Problem Being Solved

Before this migration, the system would repeatedly search for MBIDs on entities where:
- No matches were found
- Matches had low confidence scores (<70)
- Search errors occurred

This resulted in:
- Wasted API calls to MusicBrainz
- Potential rate limit violations
- Inefficient use of system resources

## Solution

By tracking when searches were attempted, the system now:
- Searches each entity exactly once
- Never retries failed searches automatically
- Respects MusicBrainz API rate limits
- Follows industry best practices (used by Jellyfin, Plex, etc.)

## Database Changes

```sql
ALTER TABLE "artists" ADD COLUMN "mbid_searched_at" TIMESTAMP(3);
ALTER TABLE "albums" ADD COLUMN "mbid_searched_at" TIMESTAMP(3);
ALTER TABLE "tracks" ADD COLUMN "mbid_searched_at" TIMESTAMP(3);
```

## Application Changes

### Schema (Prisma)
- Added `mbidSearchedAt DateTime? @map("mbid_searched_at")` to Artist, Album, Track models

### Enrichment Queries (scan-processor.service.ts)
- Modified to only search when: `mbzAlbumId IS NULL AND mbidSearchedAt IS NULL`
- This ensures each entity is searched only once

### Search Tracking (external-metadata.service.ts)
- After every MBID search attempt, `mbidSearchedAt` is marked with current timestamp
- Applies to all outcomes: found, not found, low confidence, or error

## How to Apply

### Option 1: Automated Script (Recommended)
```bash
cd server
./scripts/apply-mbid-search-tracking-migration.sh
```

### Option 2: Manual Steps
```bash
cd server

# Apply migration
npx prisma migrate deploy

# Regenerate Prisma client
npx prisma generate

# Restart your application
npm run start:dev  # or your start command
```

### Option 3: Direct SQL (If Prisma unavailable)
```bash
psql $DATABASE_URL -f prisma/migrations/20251121_add_mbid_search_tracking/migration.sql

# Then regenerate Prisma client
npx prisma generate
```

## After Migration

Once applied, the system will:
1. Search for MBIDs on all entities where `mbidSearchedAt IS NULL`
2. Mark each entity after searching (regardless of outcome)
3. Never automatically retry searches

To manually retry a search for an entity:
```sql
-- Reset search timestamp for a specific album
UPDATE albums SET mbid_searched_at = NULL WHERE id = 'album-id-here';

-- Reset for all albums without MBIDs
UPDATE albums SET mbid_searched_at = NULL WHERE mbz_album_id IS NULL;
```

## Rollback

If you need to rollback this migration:

```sql
ALTER TABLE "artists" DROP COLUMN "mbid_searched_at";
ALTER TABLE "albums" DROP COLUMN "mbid_searched_at";
ALTER TABLE "tracks" DROP COLUMN "mbid_searched_at";
```

Then revert the code changes and regenerate the Prisma client.

## Related Files

- `/server/prisma/schema.prisma` - Schema definitions
- `/server/src/features/scanner/infrastructure/services/scan-processor.service.ts` - Enrichment queries
- `/server/src/features/external-metadata/application/external-metadata.service.ts` - Search tracking logic
