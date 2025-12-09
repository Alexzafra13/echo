# External Metadata Feature

This feature provides automatic enrichment of artist and album metadata from external sources.

## Overview

The External Metadata feature implements a pluggable agent system inspired by Navidrome. It fetches missing metadata from multiple external services to enrich your music library.

## Supported Services

### Cover Art Archive
- **Purpose**: Album cover art in multiple sizes (250px, 500px, 1200px)
- **API**: https://coverartarchive.org
- **Authentication**: None required
- **Rate Limit**: 1 request/second
- **Priority**: 10 (primary source for covers)

### Last.fm
- **Purpose**: Artist biographies and profile images
- **API**: https://www.last.fm/api
- **Authentication**: API key required (free tier available)
- **Rate Limit**: 5 requests/second
- **Priority**: 20 (secondary source)

### Fanart.tv
- **Purpose**: HD backgrounds, banners, logos for Hero sections
- **API**: https://fanart.tv/api-docs/
- **Authentication**: API key required (free tier: 2 req/sec, VIP: 10 req/sec)
- **Rate Limit**: 4 requests/second (conservative)
- **Priority**: 10 (primary source for visual assets)

## Architecture

### Clean Architecture Layers

```
├── domain/                     # Business logic (entities & interfaces)
│   ├── entities/              # Value objects
│   │   ├── artist-bio.entity.ts
│   │   ├── artist-images.entity.ts
│   │   └── album-cover.entity.ts
│   └── interfaces/            # Agent contracts
│       ├── agent.interface.ts
│       ├── artist-bio-retriever.interface.ts
│       ├── artist-image-retriever.interface.ts
│       ├── album-cover-retriever.interface.ts
│       └── agent-registry.interface.ts
│
├── infrastructure/            # External integrations
│   ├── agents/               # External service implementations
│   │   ├── coverart-archive.agent.ts
│   │   ├── lastfm.agent.ts
│   │   └── fanart-tv.agent.ts
│   └── services/             # Core services
│       ├── agent-registry.service.ts
│       ├── metadata-cache.service.ts
│       └── rate-limiter.service.ts
│
├── application/               # Use cases
│   └── external-metadata.service.ts
│
└── presentation/              # HTTP & SSE
    └── external-metadata.controller.ts
```

### Design Patterns

- **Agent Pattern**: Pluggable external service providers
- **Registry Pattern**: Central agent discovery and management
- **Chain of Responsibility**: Try agents in priority order
- **Cache-Aside**: Check cache before API calls
- **Facade Pattern**: Unified interface for metadata enrichment

## Configuration

Add these environment variables to your `.env` file:

```bash
# Last.fm (for artist biographies and images)
LASTFM_API_KEY=your_lastfm_api_key
LASTFM_ENABLED=true

# Fanart.tv (for HD backgrounds, banners, logos)
FANART_API_KEY=your_fanart_api_key
FANART_ENABLED=true

# Cover Art Archive (no key needed)
COVERART_ENABLED=true
```

### Getting API Keys

**Last.fm**:
1. Visit https://www.last.fm/api/account/create
2. Fill in application details
3. Copy your API key

**Fanart.tv**:
1. Register at https://fanart.tv/get-an-api-key/
2. Free tier: 2 requests/second
3. VIP tier ($4/month): 10 requests/second

## Usage

### Manual Enrichment via API

**Enrich a single artist:**
```bash
POST /api/metadata/artists/:id/enrich?forceRefresh=false
```

**Enrich a single album:**
```bash
POST /api/metadata/albums/:id/enrich?forceRefresh=false
```

### SSE Real-time Updates

Connect to the SSE endpoint for real-time metadata updates:

```javascript
// Using EventSource API (native browser)
const eventSource = new EventSource('/api/metadata/stream');

eventSource.addEventListener('artist:images:updated', (event) => {
  const data = JSON.parse(event.data);
  console.log('Artist images updated:', data.artistId);
});

eventSource.addEventListener('album:cover:updated', (event) => {
  const data = JSON.parse(event.data);
  console.log('Album cover updated:', data.albumId);
});

eventSource.addEventListener('enrichment:progress', (event) => {
  const data = JSON.parse(event.data);
  console.log('Progress:', data.progress + '%');
});

// Cleanup
eventSource.close();
```

**React Hook (recommended):**
```typescript
import { useMetadataSSE } from '@shared/hooks/useMetadataSSE';

function MyComponent() {
  useMetadataSSE(); // Auto-invalidates React Query cache on updates
}
```

## Database Changes

New fields added to the `Artist` model:
- `background_image_url` - HD background for Hero sections
- `banner_image_url` - Banner for artist pages
- `logo_image_url` - Transparent logo for overlays

## Caching

All fetched metadata is cached in the `metadata_cache` table:
- Default TTL: 30 days
- Cache key format: `{entityType}:{entityId}:{metadataType}`
- Cache is checked before making API calls (unless `forceRefresh=true`)

## Non-Overwrite Logic

By default, existing metadata is **never overwritten**:
- Only `NULL` fields are enriched
- Use `forceRefresh=true` to override existing data
- This preserves user-curated metadata

## Rate Limiting

Rate limits are automatically enforced per service:
- **MusicBrainz/Cover Art**: 1 request/second
- **Last.fm**: 5 requests/second (using 200ms delay)
- **Fanart.tv**: 4 requests/second (conservative)

## Adding New Agents

To add a new metadata source:

1. **Create the agent** in `infrastructure/agents/`:
```typescript
@Injectable()
export class MyNewAgent implements IArtistBioRetriever {
  readonly name = 'mynew';
  readonly priority = 30;

  isEnabled(): boolean { /* ... */ }
  async getArtistBio(mbid, name): Promise<ArtistBio | null> { /* ... */ }
}
```

2. **Register in module** (`external-metadata.module.ts`):
```typescript
providers: [
  // ... existing providers
  MyNewAgent,
],

async onModuleInit() {
  this.agentRegistry.register(this.myNewAgent);
}
```

3. **Add environment variables** for configuration

## Testing

```bash
# Start development environment
pnpm run dev:setup

# Test enrichment endpoint
curl -X POST http://localhost:3000/api/metadata/artists/123/enrich \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# View cache statistics
# (Add endpoint for this if needed)
```

## Troubleshooting

**Agent not working?**
- Check API key is configured in `.env`
- Verify agent is enabled in configuration
- Check rate limits aren't being exceeded
- Review logs for specific error messages

**No metadata found?**
- Ensure MusicBrainz IDs are present in your database
- Some artists/albums may not exist in external databases
- Try multiple agents - they have different coverage

**Cache issues?**
- Use `forceRefresh=true` to bypass cache
- Check cache TTL configuration
- Run cache cleanup: `clearExpired()` method

## Future Enhancements

- [ ] Batch enrichment endpoints
- [ ] Automatic enrichment during library scan
- [ ] Background jobs for enrichment queue
- [ ] Cache statistics endpoint
- [ ] Admin dashboard for agent management
- [ ] Fallback search by name when MBID missing
- [ ] Image quality validation and selection
- [ ] Metadata confidence scoring

## Related Documentation

- [Agent Pattern](https://en.wikipedia.org/wiki/Agent-based_model)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [MusicBrainz API](https://musicbrainz.org/doc/MusicBrainz_API)
- [Cover Art Archive](https://musicbrainz.org/doc/Cover_Art_Archive/API)
- [Last.fm API](https://www.last.fm/api)
- [Fanart.tv API](https://fanart.tv/api-docs/)
