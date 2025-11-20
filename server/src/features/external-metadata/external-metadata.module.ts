import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Domain
// (Interfaces and entities are imported as needed, no providers for them)

// Infrastructure - Services
import { AgentRegistryService } from './infrastructure/services/agent-registry.service';
import { MetadataCacheService } from './infrastructure/services/metadata-cache.service';
import { MbidSearchCacheService } from './infrastructure/services/mbid-search-cache.service';
import { RateLimiterService } from './infrastructure/services/rate-limiter.service';
import { SettingsService } from './infrastructure/services/settings.service';
import { StorageService } from './infrastructure/services/storage.service';
import { ImageDownloadService } from './infrastructure/services/image-download.service';
import { CleanupService } from './infrastructure/services/cleanup.service';
import { MetadataConflictService } from './infrastructure/services/metadata-conflict.service';
import { MbidAutoSearchService } from './infrastructure/services/mbid-auto-search.service';

// Infrastructure - Agents
import { CoverArtArchiveAgent } from './infrastructure/agents/coverart-archive.agent';
import { LastfmAgent } from './infrastructure/agents/lastfm.agent';
import { FanartTvAgent } from './infrastructure/agents/fanart-tv.agent';
import { MusicBrainzAgent } from './infrastructure/agents/musicbrainz.agent';
import { WikipediaAgent } from './infrastructure/agents/wikipedia.agent';

// Infrastructure - Persistence
import { SettingsRepository } from './infrastructure/persistence/settings.repository';

// Application
import { ExternalMetadataService } from './application/external-metadata.service';
import { ImageService } from './application/services/image.service';
import { LocalImageProvider } from './application/services/local-image-provider.service';

// Presentation
import { ExternalMetadataController } from './presentation/external-metadata.controller';
import { ImagesController } from './presentation/images.controller';
import { AdminSettingsController } from './presentation/admin-settings.controller';
import { MaintenanceController } from './presentation/maintenance.controller';
import { MetadataConflictsController } from './presentation/metadata-conflicts.controller';
import { MusicBrainzSearchController } from './presentation/musicbrainz-search.controller';
import { MbidAutoSearchController } from './presentation/mbid-auto-search.controller';
import { MetadataEnrichmentGateway } from './presentation/metadata-enrichment.gateway';

// Shared
import { PrismaModule } from '@infrastructure/persistence/prisma.module';

/**
 * External Metadata Module
 * Handles external metadata enrichment from multiple sources
 *
 * Features:
 * - Artist biographies from Last.fm
 * - Artist images (profiles, backgrounds, banners, logos) from Fanart.tv and Last.fm
 * - Album covers from Cover Art Archive
 * - Metadata caching to reduce API calls
 * - Rate limiting for API compliance
 * - WebSocket notifications for real-time progress
 * - Manual enrichment endpoints
 *
 * Configuration (via .env):
 * - LASTFM_API_KEY - Last.fm API key (required for Last.fm)
 * - LASTFM_ENABLED - Enable/disable Last.fm agent (default: true)
 * - FANART_API_KEY - Fanart.tv API key (required for Fanart.tv)
 * - FANART_ENABLED - Enable/disable Fanart.tv agent (default: true)
 * - COVERART_ENABLED - Enable/disable Cover Art Archive agent (default: true)
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
  ],
  providers: [
    // Core services
    AgentRegistryService,
    MetadataCacheService,
    MbidSearchCacheService,
    RateLimiterService,
    SettingsService,
    StorageService,
    ImageDownloadService,
    CleanupService,
    MetadataConflictService,
    MbidAutoSearchService,

    // Persistence
    SettingsRepository,

    // Agents
    CoverArtArchiveAgent,
    LastfmAgent,
    FanartTvAgent,
    MusicBrainzAgent,
    WikipediaAgent,

    // Application services
    ExternalMetadataService,
    ImageService,
    LocalImageProvider,

    // WebSocket gateway
    MetadataEnrichmentGateway,
  ],
  controllers: [
    ExternalMetadataController,
    ImagesController,
    AdminSettingsController,
    MaintenanceController,
    MetadataConflictsController,
    MusicBrainzSearchController,
    MbidAutoSearchController,
  ],
  exports: [
    ExternalMetadataService,
    ImageService,
    LocalImageProvider,
    AgentRegistryService,
    MetadataCacheService,
    MbidSearchCacheService,
    SettingsService,
    StorageService,
    ImageDownloadService,
    MetadataConflictService,
    MbidAutoSearchService,
    MetadataEnrichmentGateway,
  ],
})
export class ExternalMetadataModule implements OnModuleInit {
  private readonly logger = new Logger(ExternalMetadataModule.name);

  constructor(
    private readonly agentRegistry: AgentRegistryService,
    private readonly storageService: StorageService,
    private readonly coverArtAgent: CoverArtArchiveAgent,
    private readonly lastfmAgent: LastfmAgent,
    private readonly fanartAgent: FanartTvAgent,
    private readonly musicbrainzAgent: MusicBrainzAgent,
    private readonly wikipediaAgent: WikipediaAgent
  ) {}

  /**
   * Register all agents when module initializes
   */
  async onModuleInit() {
    this.logger.log('Initializing External Metadata Module...');

    // Initialize storage
    try {
      await this.storageService.initialize();
    } catch (error) {
      this.logger.error(`Failed to initialize storage: ${(error as Error).message}`, (error as Error).stack);
    }

    // Register all agents
    this.agentRegistry.register(this.coverArtAgent);
    this.agentRegistry.register(this.lastfmAgent);
    this.agentRegistry.register(this.fanartAgent);
    this.agentRegistry.register(this.musicbrainzAgent);
    this.agentRegistry.register(this.wikipediaAgent);

    // Log agent status
    const allAgents = this.agentRegistry.getAllAgents();
    const enabledAgents = allAgents.filter(agent => agent.isEnabled());

    this.logger.log(
      `Registered ${allAgents.length} agents (${enabledAgents.length} enabled):`
    );

    allAgents.forEach(agent => {
      const status = agent.isEnabled() ? '✓' : '✗';
      this.logger.log(
        `  ${status} ${agent.name.padEnd(15)} (priority: ${agent.priority})`
      );
    });

    this.logger.log('External Metadata Module initialized successfully');
  }
}
