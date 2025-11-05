-- Seed default settings for external metadata

-- External Metadata Providers
INSERT INTO "settings" ("key", "value", "category", "type", "description", "is_public", "created_at", "updated_at") VALUES
('metadata.coverart.enabled', 'true', 'external_metadata', 'boolean', 'Enable Cover Art Archive (no API key required)', false, NOW(), NOW()),
('metadata.lastfm.enabled', 'false', 'external_metadata', 'boolean', 'Enable Last.fm', false, NOW(), NOW()),
('metadata.lastfm.api_key', '', 'external_metadata', 'string', 'Last.fm API Key', false, NOW(), NOW()),
('metadata.fanart.enabled', 'false', 'external_metadata', 'boolean', 'Enable Fanart.tv', false, NOW(), NOW()),
('metadata.fanart.api_key', '', 'external_metadata', 'string', 'Fanart.tv API Key', false, NOW(), NOW())
ON CONFLICT ("key") DO NOTHING;

-- Download Settings
INSERT INTO "settings" ("key", "value", "category", "type", "description", "is_public", "created_at", "updated_at") VALUES
('metadata.download.enabled', 'true', 'external_metadata', 'boolean', 'Download images locally', false, NOW(), NOW()),
('metadata.download.album_covers', 'true', 'external_metadata', 'boolean', 'Download album covers', false, NOW(), NOW()),
('metadata.download.artist_images', 'true', 'external_metadata', 'boolean', 'Download artist images', false, NOW(), NOW()),
('metadata.download.save_in_album_folder', 'true', 'external_metadata', 'boolean', 'Save covers in album folder', false, NOW(), NOW())
ON CONFLICT ("key") DO NOTHING;

-- Storage Settings
INSERT INTO "settings" ("key", "value", "category", "type", "description", "is_public", "created_at", "updated_at") VALUES
('metadata.storage.location', 'centralized', 'external_metadata', 'string', 'Storage location: centralized or portable', false, NOW(), NOW()),
('metadata.storage.path', '/storage/metadata', 'external_metadata', 'string', 'Base path for metadata storage', false, NOW(), NOW()),
('metadata.storage.max_size_mb', '500', 'external_metadata', 'number', 'Max storage per artist (MB)', false, NOW(), NOW())
ON CONFLICT ("key") DO NOTHING;

-- Embed Settings
INSERT INTO "settings" ("key", "value", "category", "type", "description", "is_public", "created_at", "updated_at") VALUES
('metadata.embed.enabled', 'false', 'external_metadata', 'boolean', 'Allow embedding covers in audio', false, NOW(), NOW()),
('metadata.embed.auto', 'false', 'external_metadata', 'boolean', 'Auto-embed without confirmation', false, NOW(), NOW()),
('metadata.embed.backup', 'true', 'external_metadata', 'boolean', 'Backup files before embedding', false, NOW(), NOW())
ON CONFLICT ("key") DO NOTHING;

-- Conflict Resolution
INSERT INTO "settings" ("key", "value", "category", "type", "description", "is_public", "created_at", "updated_at") VALUES
('metadata.conflict.strategy', 'ask', 'external_metadata', 'string', 'Strategy when conflict: keep, replace, ask', false, NOW(), NOW())
ON CONFLICT ("key") DO NOTHING;

-- Auto-enrich Settings
INSERT INTO "settings" ("key", "value", "category", "type", "description", "is_public", "created_at", "updated_at") VALUES
('metadata.auto_enrich.enabled', 'false', 'external_metadata', 'boolean', 'Auto-enrich during library scan', false, NOW(), NOW()),
('metadata.auto_enrich.batch_size', '10', 'external_metadata', 'number', 'Items to enrich per batch', false, NOW(), NOW())
ON CONFLICT ("key") DO NOTHING;
