-- Seed default settings for external metadata

-- External Metadata Providers
INSERT INTO "settings" ("key", "value", "category", "type", "description", "is_public") VALUES
('metadata.coverart.enabled', 'true', 'external_metadata', 'boolean', 'Enable Cover Art Archive (no API key required)', false),
('metadata.lastfm.enabled', 'false', 'external_metadata', 'boolean', 'Enable Last.fm', false),
('metadata.lastfm.api_key', '', 'external_metadata', 'string', 'Last.fm API Key', false),
('metadata.fanart.enabled', 'false', 'external_metadata', 'boolean', 'Enable Fanart.tv', false),
('metadata.fanart.api_key', '', 'external_metadata', 'string', 'Fanart.tv API Key', false);

-- Download Settings
INSERT INTO "settings" ("key", "value", "category", "type", "description", "is_public") VALUES
('metadata.download.enabled', 'true', 'external_metadata', 'boolean', 'Download images locally', false),
('metadata.download.album_covers', 'true', 'external_metadata', 'boolean', 'Download album covers', false),
('metadata.download.artist_images', 'true', 'external_metadata', 'boolean', 'Download artist images', false),
('metadata.download.save_in_album_folder', 'true', 'external_metadata', 'boolean', 'Save covers in album folder', false);

-- Storage Settings
INSERT INTO "settings" ("key", "value", "category", "type", "description", "is_public") VALUES
('metadata.storage.location', 'centralized', 'external_metadata', 'string', 'Storage location: centralized or portable', false),
('metadata.storage.path', '/storage/metadata', 'external_metadata', 'string', 'Base path for metadata storage', false),
('metadata.storage.max_size_mb', '500', 'external_metadata', 'number', 'Max storage per artist (MB)', false);

-- Embed Settings
INSERT INTO "settings" ("key", "value", "category", "type", "description", "is_public") VALUES
('metadata.embed.enabled', 'false', 'external_metadata', 'boolean', 'Allow embedding covers in audio', false),
('metadata.embed.auto', 'false', 'external_metadata', 'boolean', 'Auto-embed without confirmation', false),
('metadata.embed.backup', 'true', 'external_metadata', 'boolean', 'Backup files before embedding', false);

-- Conflict Resolution
INSERT INTO "settings" ("key", "value", "category", "type", "description", "is_public") VALUES
('metadata.conflict.strategy', 'ask', 'external_metadata', 'string', 'Strategy when conflict: keep, replace, ask', false);

-- Auto-enrich Settings
INSERT INTO "settings" ("key", "value", "category", "type", "description", "is_public") VALUES
('metadata.auto_enrich.enabled', 'false', 'external_metadata', 'boolean', 'Auto-enrich during library scan', false),
('metadata.auto_enrich.batch_size', '10', 'external_metadata', 'number', 'Items to enrich per batch', false);
