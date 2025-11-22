-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255),
    "password_hash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100),
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "theme" VARCHAR(20) NOT NULL DEFAULT 'dark',
    "language" VARCHAR(10) NOT NULL DEFAULT 'es',
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "last_access_at" TIMESTAMP(3),
    "avatar_path" VARCHAR(512),
    "avatar_mime_type" VARCHAR(50),
    "avatar_size" BIGINT,
    "avatar_updated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stream_tokens" (
    "id" TEXT NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "token" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),

    CONSTRAINT "stream_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artists" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "album_count" INTEGER NOT NULL DEFAULT 0,
    "song_count" INTEGER NOT NULL DEFAULT 0,
    "mbz_artist_id" VARCHAR(36),
    "biography" TEXT,
    "biography_source" VARCHAR(50),
    "profile_image_path" VARCHAR(512),
    "profile_image_updated_at" TIMESTAMP(3),
    "external_profile_path" VARCHAR(512),
    "external_profile_source" VARCHAR(50),
    "external_profile_updated_at" TIMESTAMP(3),
    "background_image_path" VARCHAR(512),
    "background_updated_at" TIMESTAMP(3),
    "background_position" VARCHAR(50),
    "external_background_path" VARCHAR(512),
    "external_background_source" VARCHAR(50),
    "external_background_updated_at" TIMESTAMP(3),
    "banner_image_path" VARCHAR(512),
    "banner_updated_at" TIMESTAMP(3),
    "external_banner_path" VARCHAR(512),
    "external_banner_source" VARCHAR(50),
    "external_banner_updated_at" TIMESTAMP(3),
    "logo_image_path" VARCHAR(512),
    "logo_updated_at" TIMESTAMP(3),
    "external_logo_path" VARCHAR(512),
    "external_logo_source" VARCHAR(50),
    "external_logo_updated_at" TIMESTAMP(3),
    "external_url" VARCHAR(512),
    "metadata_storage_size" BIGINT DEFAULT 0,
    "order_artist_name" VARCHAR(255),
    "size" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artist_banners" (
    "id" TEXT NOT NULL,
    "artist_id" VARCHAR(36) NOT NULL,
    "image_url" VARCHAR(512) NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "artist_banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_artist_images" (
    "id" TEXT NOT NULL,
    "artist_id" VARCHAR(36) NOT NULL,
    "image_type" VARCHAR(20) NOT NULL,
    "file_path" VARCHAR(512) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_size" BIGINT NOT NULL DEFAULT 0,
    "mime_type" VARCHAR(50) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "uploaded_by" VARCHAR(36),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_artist_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_album_covers" (
    "id" TEXT NOT NULL,
    "album_id" VARCHAR(36) NOT NULL,
    "file_path" VARCHAR(512) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_size" BIGINT NOT NULL DEFAULT 0,
    "mime_type" VARCHAR(50) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "uploaded_by" VARCHAR(36),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_album_covers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "genres" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "album_count" INTEGER NOT NULL DEFAULT 0,
    "song_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "albums" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "album_artist_id" VARCHAR(36),
    "artist_id" VARCHAR(36),
    "cover_art_path" VARCHAR(512),
    "external_cover_path" VARCHAR(512),
    "external_cover_source" VARCHAR(50),
    "year" INTEGER,
    "release_date" DATE,
    "original_date" DATE,
    "compilation" BOOLEAN NOT NULL DEFAULT false,
    "song_count" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "size" BIGINT NOT NULL DEFAULT 0,
    "mbz_album_id" VARCHAR(36),
    "mbz_album_artist_id" VARCHAR(36),
    "mbz_album_type" VARCHAR(100),
    "catalog_num" VARCHAR(255),
    "comment" VARCHAR(255),
    "order_album_name" VARCHAR(255),
    "order_album_artist_name" VARCHAR(255),
    "sort_album_name" VARCHAR(255),
    "sort_artist_name" VARCHAR(255),
    "sort_album_artist_name" VARCHAR(255),
    "description" TEXT,
    "external_url" VARCHAR(512),
    "external_info_updated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "albums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracks" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "album_id" VARCHAR(36),
    "album_artist_id" VARCHAR(36),
    "artist_id" VARCHAR(36),
    "has_cover_art" BOOLEAN NOT NULL DEFAULT false,
    "track_number" INTEGER,
    "disc_number" INTEGER NOT NULL DEFAULT 1,
    "disc_subtitle" VARCHAR(255),
    "year" INTEGER,
    "date" DATE,
    "original_date" DATE,
    "release_date" DATE,
    "size" BIGINT,
    "suffix" VARCHAR(10),
    "duration" INTEGER,
    "bit_rate" INTEGER,
    "channels" INTEGER,
    "full_text" TEXT,
    "album_name" VARCHAR(255),
    "artist_name" VARCHAR(255),
    "album_artist_name" VARCHAR(255),
    "compilation" BOOLEAN NOT NULL DEFAULT false,
    "comment" VARCHAR(512),
    "lyrics" TEXT,
    "sort_title" VARCHAR(255),
    "sort_album_name" VARCHAR(255),
    "sort_artist_name" VARCHAR(255),
    "sort_album_artist_name" VARCHAR(255),
    "order_title" VARCHAR(255),
    "order_album_name" VARCHAR(255),
    "order_artist_name" VARCHAR(255),
    "order_album_artist_name" VARCHAR(255),
    "mbz_track_id" VARCHAR(36),
    "mbz_album_id" VARCHAR(36),
    "mbz_artist_id" VARCHAR(36),
    "mbz_album_artist_id" VARCHAR(36),
    "mbz_release_track_id" VARCHAR(36),
    "catalog_num" VARCHAR(255),
    "path" VARCHAR(512) NOT NULL,
    "bpm" INTEGER,
    "rg_album_gain" DOUBLE PRECISION,
    "rg_album_peak" DOUBLE PRECISION,
    "rg_track_gain" DOUBLE PRECISION,
    "rg_track_peak" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "track_artists" (
    "track_id" VARCHAR(36) NOT NULL,
    "artist_id" VARCHAR(36) NOT NULL,
    "artist_name" VARCHAR(255) NOT NULL,

    CONSTRAINT "track_artists_pkey" PRIMARY KEY ("track_id","artist_id")
);

-- CreateTable
CREATE TABLE "artist_genres" (
    "artist_id" VARCHAR(36) NOT NULL,
    "genre_id" VARCHAR(36) NOT NULL,

    CONSTRAINT "artist_genres_pkey" PRIMARY KEY ("artist_id","genre_id")
);

-- CreateTable
CREATE TABLE "album_genres" (
    "album_id" VARCHAR(36) NOT NULL,
    "genre_id" VARCHAR(36) NOT NULL,

    CONSTRAINT "album_genres_pkey" PRIMARY KEY ("album_id","genre_id")
);

-- CreateTable
CREATE TABLE "track_genres" (
    "track_id" VARCHAR(36) NOT NULL,
    "genre_id" VARCHAR(36) NOT NULL,

    CONSTRAINT "track_genres_pkey" PRIMARY KEY ("track_id","genre_id")
);

-- CreateTable
CREATE TABLE "playlists" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "cover_image_url" VARCHAR(512),
    "duration" INTEGER NOT NULL DEFAULT 0,
    "size" BIGINT NOT NULL DEFAULT 0,
    "owner_id" VARCHAR(36) NOT NULL,
    "public" BOOLEAN NOT NULL DEFAULT false,
    "song_count" INTEGER NOT NULL DEFAULT 0,
    "path" VARCHAR(512),
    "sync" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "playlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playlist_tracks" (
    "id" TEXT NOT NULL,
    "playlist_id" VARCHAR(36) NOT NULL,
    "track_id" VARCHAR(36) NOT NULL,
    "track_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "playlist_tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_starred" (
    "user_id" VARCHAR(36) NOT NULL,
    "starred_id" VARCHAR(36) NOT NULL,
    "starred_type" VARCHAR(50) NOT NULL,
    "sentiment" VARCHAR(20) NOT NULL,
    "starred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_starred_pkey" PRIMARY KEY ("user_id","starred_id","starred_type")
);

-- CreateTable
CREATE TABLE "user_ratings" (
    "user_id" VARCHAR(36) NOT NULL,
    "item_id" VARCHAR(36) NOT NULL,
    "item_type" VARCHAR(50) NOT NULL,
    "rating" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_ratings_pkey" PRIMARY KEY ("user_id","item_id","item_type")
);

-- CreateTable
CREATE TABLE "play_history" (
    "id" TEXT NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "track_id" VARCHAR(36) NOT NULL,
    "played_at" TIMESTAMP(3) NOT NULL,
    "client" VARCHAR(255),
    "play_context" VARCHAR(50) NOT NULL DEFAULT 'direct',
    "completion_rate" DOUBLE PRECISION,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "source_id" VARCHAR(36),
    "source_type" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "play_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_play_stats" (
    "user_id" VARCHAR(36) NOT NULL,
    "item_id" VARCHAR(36) NOT NULL,
    "item_type" VARCHAR(50) NOT NULL,
    "play_count" BIGINT NOT NULL DEFAULT 0,
    "weighted_play_count" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last_played_at" TIMESTAMP(3),
    "avg_completion_rate" DOUBLE PRECISION,
    "skip_count" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "user_play_stats_pkey" PRIMARY KEY ("user_id","item_id","item_type")
);

-- CreateTable
CREATE TABLE "play_queue" (
    "id" TEXT NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "current_track_id" VARCHAR(36),
    "position" BIGINT NOT NULL DEFAULT 0,
    "changed_by" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "play_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "play_queue_tracks" (
    "id" TEXT NOT NULL,
    "queue_id" VARCHAR(36) NOT NULL,
    "track_id" VARCHAR(36) NOT NULL,
    "queue_order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "play_queue_tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookmarks" (
    "id" TEXT NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "item_id" VARCHAR(36) NOT NULL,
    "item_type" VARCHAR(50) NOT NULL,
    "position" BIGINT NOT NULL,
    "comment" VARCHAR(512),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shares" (
    "id" TEXT NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "description" VARCHAR(512),
    "expires_at" TIMESTAMP(3),
    "last_visited_at" TIMESTAMP(3),
    "resource_ids" TEXT NOT NULL,
    "resource_type" VARCHAR(50) NOT NULL,
    "visit_count" INTEGER NOT NULL DEFAULT 0,
    "downloadable" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "radio_stations" (
    "id" TEXT NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "station_uuid" VARCHAR(255),
    "name" VARCHAR(255) NOT NULL,
    "url" VARCHAR(512) NOT NULL,
    "url_resolved" VARCHAR(512),
    "homepage" VARCHAR(512),
    "favicon" VARCHAR(512),
    "country" VARCHAR(100),
    "country_code" VARCHAR(10),
    "state" VARCHAR(100),
    "language" VARCHAR(100),
    "tags" VARCHAR(512),
    "codec" VARCHAR(50),
    "bitrate" INTEGER,
    "votes" INTEGER,
    "click_count" INTEGER,
    "last_check_ok" BOOLEAN,
    "source" VARCHAR(20) NOT NULL,
    "is_favorite" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "radio_stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transcoding" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "target_format" VARCHAR(10) NOT NULL,
    "default_bit_rate" INTEGER,
    "command" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transcoding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50),
    "user_name" VARCHAR(255),
    "user_id" VARCHAR(36),
    "client" VARCHAR(255),
    "ip_address" VARCHAR(45),
    "last_seen" TIMESTAMP(3),
    "max_bit_rate" INTEGER,
    "transcoding_id" VARCHAR(36),
    "scrobble_enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metadata_cache" (
    "entity_id" VARCHAR(36) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "data" TEXT NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "metadata_cache_pkey" PRIMARY KEY ("entity_id","entity_type","provider")
);

-- CreateTable
CREATE TABLE "library_scans" (
    "id" TEXT NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "tracks_added" INTEGER NOT NULL DEFAULT 0,
    "tracks_updated" INTEGER NOT NULL DEFAULT 0,
    "tracks_deleted" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,

    CONSTRAINT "library_scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metadata_conflicts" (
    "id" TEXT NOT NULL,
    "entity_id" VARCHAR(36) NOT NULL,
    "entity_type" VARCHAR(20) NOT NULL,
    "field" VARCHAR(50) NOT NULL,
    "current_value" TEXT,
    "suggested_value" TEXT NOT NULL,
    "source" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "priority" INTEGER NOT NULL DEFAULT 1,
    "metadata" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" VARCHAR(36),

    CONSTRAINT "metadata_conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrichment_logs" (
    "id" TEXT NOT NULL,
    "entity_id" VARCHAR(36) NOT NULL,
    "entity_type" VARCHAR(20) NOT NULL,
    "entity_name" VARCHAR(255) NOT NULL,
    "provider" VARCHAR(50) NOT NULL,
    "metadata_type" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "fields_updated" TEXT[],
    "error_message" TEXT,
    "preview_url" VARCHAR(512),
    "user_id" VARCHAR(36),
    "processing_time" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrichment_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "type" VARCHAR(20) NOT NULL DEFAULT 'string',
    "description" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "system_logs" (
    "id" TEXT NOT NULL,
    "level" VARCHAR(20) NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "message" TEXT NOT NULL,
    "details" TEXT,
    "user_id" VARCHAR(36),
    "entity_id" VARCHAR(36),
    "entity_type" VARCHAR(20),
    "stack_trace" TEXT,
    "request_id" VARCHAR(36),
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(512),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "stream_tokens_token_key" ON "stream_tokens"("token");

-- CreateIndex
CREATE INDEX "stream_tokens_token_idx" ON "stream_tokens"("token");

-- CreateIndex
CREATE INDEX "stream_tokens_user_id_idx" ON "stream_tokens"("user_id");

-- CreateIndex
CREATE INDEX "stream_tokens_expires_at_idx" ON "stream_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "idx_artists_name" ON "artists"("name");

-- CreateIndex
CREATE INDEX "idx_artists_album_count" ON "artists"("album_count" DESC);

-- CreateIndex
CREATE INDEX "artist_banners_artist_id_idx" ON "artist_banners"("artist_id");

-- CreateIndex
CREATE INDEX "artist_banners_artist_id_order_idx" ON "artist_banners"("artist_id", "order");

-- CreateIndex
CREATE INDEX "custom_artist_images_artist_id_idx" ON "custom_artist_images"("artist_id");

-- CreateIndex
CREATE INDEX "custom_artist_images_artist_id_image_type_idx" ON "custom_artist_images"("artist_id", "image_type");

-- CreateIndex
CREATE INDEX "custom_artist_images_is_active_idx" ON "custom_artist_images"("is_active");

-- CreateIndex
CREATE INDEX "custom_album_covers_album_id_idx" ON "custom_album_covers"("album_id");

-- CreateIndex
CREATE INDEX "custom_album_covers_is_active_idx" ON "custom_album_covers"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "genres_name_key" ON "genres"("name");

-- CreateIndex
CREATE INDEX "idx_albums_artist" ON "albums"("artist_id");

-- CreateIndex
CREATE INDEX "idx_albums_album_artist" ON "albums"("album_artist_id");

-- CreateIndex
CREATE INDEX "idx_albums_year" ON "albums"("year" DESC);

-- CreateIndex
CREATE INDEX "idx_albums_name" ON "albums"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tracks_path_key" ON "tracks"("path");

-- CreateIndex
CREATE INDEX "idx_tracks_album" ON "tracks"("album_id");

-- CreateIndex
CREATE INDEX "idx_tracks_artist" ON "tracks"("artist_id");

-- CreateIndex
CREATE INDEX "idx_tracks_title" ON "tracks"("title");

-- CreateIndex
CREATE INDEX "idx_tracks_path" ON "tracks"("path");

-- CreateIndex
CREATE INDEX "idx_tracks_album_track" ON "tracks"("album_id", "track_number");

-- CreateIndex
CREATE INDEX "idx_playlists_owner" ON "playlists"("owner_id");

-- CreateIndex
CREATE INDEX "idx_playlist_tracks_playlist" ON "playlist_tracks"("playlist_id", "track_order");

-- CreateIndex
CREATE UNIQUE INDEX "playlist_tracks_playlist_id_track_order_key" ON "playlist_tracks"("playlist_id", "track_order");

-- CreateIndex
CREATE INDEX "idx_user_starred_user" ON "user_starred"("user_id", "starred_at" DESC);

-- CreateIndex
CREATE INDEX "idx_user_starred_item" ON "user_starred"("starred_id", "starred_type");

-- CreateIndex
CREATE INDEX "idx_user_starred_sentiment" ON "user_starred"("user_id", "sentiment");

-- CreateIndex
CREATE INDEX "idx_user_ratings_user" ON "user_ratings"("user_id");

-- CreateIndex
CREATE INDEX "idx_ratings_item" ON "user_ratings"("item_id", "item_type");

-- CreateIndex
CREATE INDEX "idx_play_history_user_date" ON "play_history"("user_id", "played_at" DESC);

-- CreateIndex
CREATE INDEX "idx_play_history_track" ON "play_history"("track_id");

-- CreateIndex
CREATE INDEX "idx_play_history_played_at" ON "play_history"("played_at" DESC);

-- CreateIndex
CREATE INDEX "idx_play_history_context" ON "play_history"("user_id", "play_context");

-- CreateIndex
CREATE INDEX "idx_play_history_source" ON "play_history"("source_id", "source_type");

-- CreateIndex
CREATE INDEX "idx_user_play_stats_user" ON "user_play_stats"("user_id", "play_count" DESC);

-- CreateIndex
CREATE INDEX "idx_user_play_stats_weighted" ON "user_play_stats"("user_id", "weighted_play_count" DESC);

-- CreateIndex
CREATE INDEX "idx_user_play_stats_item" ON "user_play_stats"("item_id", "item_type");

-- CreateIndex
CREATE UNIQUE INDEX "play_queue_user_id_key" ON "play_queue"("user_id");

-- CreateIndex
CREATE INDEX "idx_play_queue_tracks_queue" ON "play_queue_tracks"("queue_id", "queue_order");

-- CreateIndex
CREATE UNIQUE INDEX "play_queue_tracks_queue_id_queue_order_key" ON "play_queue_tracks"("queue_id", "queue_order");

-- CreateIndex
CREATE UNIQUE INDEX "bookmarks_user_id_item_id_item_type_key" ON "bookmarks"("user_id", "item_id", "item_type");

-- CreateIndex
CREATE INDEX "radio_stations_user_id_idx" ON "radio_stations"("user_id");

-- CreateIndex
CREATE INDEX "radio_stations_station_uuid_idx" ON "radio_stations"("station_uuid");

-- CreateIndex
CREATE INDEX "radio_stations_user_id_is_favorite_idx" ON "radio_stations"("user_id", "is_favorite");

-- CreateIndex
CREATE INDEX "idx_metadata_cache_expires" ON "metadata_cache"("expires_at");

-- CreateIndex
CREATE INDEX "metadata_conflicts_entity_id_entity_type_idx" ON "metadata_conflicts"("entity_id", "entity_type");

-- CreateIndex
CREATE INDEX "metadata_conflicts_status_idx" ON "metadata_conflicts"("status");

-- CreateIndex
CREATE INDEX "metadata_conflicts_created_at_idx" ON "metadata_conflicts"("created_at");

-- CreateIndex
CREATE INDEX "enrichment_logs_entity_id_entity_type_idx" ON "enrichment_logs"("entity_id", "entity_type");

-- CreateIndex
CREATE INDEX "enrichment_logs_provider_idx" ON "enrichment_logs"("provider");

-- CreateIndex
CREATE INDEX "enrichment_logs_status_idx" ON "enrichment_logs"("status");

-- CreateIndex
CREATE INDEX "enrichment_logs_created_at_idx" ON "enrichment_logs"("created_at");

-- CreateIndex
CREATE INDEX "enrichment_logs_user_id_idx" ON "enrichment_logs"("user_id");

-- CreateIndex
CREATE INDEX "settings_category_idx" ON "settings"("category");

-- CreateIndex
CREATE INDEX "system_logs_level_created_at_idx" ON "system_logs"("level", "created_at");

-- CreateIndex
CREATE INDEX "system_logs_category_created_at_idx" ON "system_logs"("category", "created_at");

-- CreateIndex
CREATE INDEX "system_logs_user_id_idx" ON "system_logs"("user_id");

-- CreateIndex
CREATE INDEX "system_logs_request_id_idx" ON "system_logs"("request_id");

-- CreateIndex
CREATE INDEX "system_logs_created_at_idx" ON "system_logs"("created_at");

-- AddForeignKey
ALTER TABLE "stream_tokens" ADD CONSTRAINT "stream_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_banners" ADD CONSTRAINT "artist_banners_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_artist_images" ADD CONSTRAINT "custom_artist_images_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_album_covers" ADD CONSTRAINT "custom_album_covers_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "albums" ADD CONSTRAINT "albums_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "albums" ADD CONSTRAINT "albums_album_artist_id_fkey" FOREIGN KEY ("album_artist_id") REFERENCES "artists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_album_artist_id_fkey" FOREIGN KEY ("album_artist_id") REFERENCES "artists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "track_artists" ADD CONSTRAINT "track_artists_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "track_artists" ADD CONSTRAINT "track_artists_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_genres" ADD CONSTRAINT "artist_genres_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artist_genres" ADD CONSTRAINT "artist_genres_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "album_genres" ADD CONSTRAINT "album_genres_album_id_fkey" FOREIGN KEY ("album_id") REFERENCES "albums"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "album_genres" ADD CONSTRAINT "album_genres_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "track_genres" ADD CONSTRAINT "track_genres_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "track_genres" ADD CONSTRAINT "track_genres_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlists" ADD CONSTRAINT "playlists_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlist_tracks" ADD CONSTRAINT "playlist_tracks_playlist_id_fkey" FOREIGN KEY ("playlist_id") REFERENCES "playlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlist_tracks" ADD CONSTRAINT "playlist_tracks_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_starred" ADD CONSTRAINT "user_starred_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_ratings" ADD CONSTRAINT "user_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "play_history" ADD CONSTRAINT "play_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "play_history" ADD CONSTRAINT "play_history_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_play_stats" ADD CONSTRAINT "user_play_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "play_queue" ADD CONSTRAINT "play_queue_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "play_queue" ADD CONSTRAINT "play_queue_current_track_id_fkey" FOREIGN KEY ("current_track_id") REFERENCES "tracks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "play_queue_tracks" ADD CONSTRAINT "play_queue_tracks_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "play_queue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "play_queue_tracks" ADD CONSTRAINT "play_queue_tracks_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shares" ADD CONSTRAINT "shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "radio_stations" ADD CONSTRAINT "radio_stations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_transcoding_id_fkey" FOREIGN KEY ("transcoding_id") REFERENCES "transcoding"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- Enable pg_trgm extension for fast text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create trigram indexes on tracks table for fast search
CREATE INDEX IF NOT EXISTS idx_tracks_title_trgm ON tracks USING GIN (title gin_trgm_ops);

-- Create trigram indexes on albums table for fast search (albums use 'name', not 'title')
CREATE INDEX IF NOT EXISTS idx_albums_name_trgm ON albums USING GIN (name gin_trgm_ops);

-- Create trigram indexes on artists table for fast search
CREATE INDEX IF NOT EXISTS idx_artists_name_trgm ON artists USING GIN (name gin_trgm_ops);

-- Add comment explaining the indexes
COMMENT ON INDEX idx_tracks_title_trgm IS 'Trigram index for fast fuzzy text search on track titles';
COMMENT ON INDEX idx_albums_name_trgm IS 'Trigram index for fast fuzzy text search on album names';
COMMENT ON INDEX idx_artists_name_trgm IS 'Trigram index for fast fuzzy text search on artist names';
-- DropIndex
DROP INDEX "public"."idx_albums_name_trgm";

-- DropIndex
DROP INDEX "public"."idx_artists_name_trgm";

-- DropIndex
DROP INDEX "public"."idx_tracks_title_trgm";
-- CreateTable: mbid_search_cache
CREATE TABLE "mbid_search_cache" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "query_text" TEXT NOT NULL,
    "query_type" VARCHAR(20) NOT NULL,
    "query_params" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "results" JSONB NOT NULL,
    "result_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "hit_count" INTEGER NOT NULL DEFAULT 0,
    "last_hit_at" TIMESTAMP(3),

    CONSTRAINT "mbid_search_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique constraint for query deduplication
CREATE UNIQUE INDEX "unique_mbid_search" ON "mbid_search_cache"("query_text", "query_type", "query_params");

-- CreateIndex: Lookup index for fast cache retrieval
CREATE INDEX "idx_mbid_search_lookup" ON "mbid_search_cache"("query_text", "query_type");

-- CreateIndex: Expiration index for cleanup
CREATE INDEX "idx_mbid_search_expires" ON "mbid_search_cache"("expires_at");

-- AlterTable: metadata_conflicts - Change metadata column from TEXT to JSONB
ALTER TABLE "metadata_conflicts"
  ALTER COLUMN "metadata" TYPE JSONB USING
    CASE
      WHEN "metadata" IS NULL THEN NULL
      WHEN "metadata" = '' THEN NULL
      ELSE "metadata"::jsonb
    END;

-- CreateIndex: MBID indexes for Artist table (partial index for better performance)
CREATE INDEX "idx_artists_mbid" ON "artists"("mbz_artist_id") WHERE "mbz_artist_id" IS NOT NULL;

-- CreateIndex: MBID indexes for Album table
CREATE INDEX "idx_albums_mbid" ON "albums"("mbz_album_id") WHERE "mbz_album_id" IS NOT NULL;
CREATE INDEX "idx_albums_artist_mbid" ON "albums"("mbz_album_artist_id") WHERE "mbz_album_artist_id" IS NOT NULL;

-- CreateIndex: MBID indexes for Track table
CREATE INDEX "idx_tracks_mbid" ON "tracks"("mbz_track_id") WHERE "mbz_track_id" IS NOT NULL;
CREATE INDEX "idx_tracks_artist_mbid" ON "tracks"("mbz_artist_id") WHERE "mbz_artist_id" IS NOT NULL;
CREATE INDEX "idx_tracks_album_mbid" ON "tracks"("mbz_album_id") WHERE "mbz_album_id" IS NOT NULL;

-- CreateFunction: Cleanup expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_mbid_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM "mbid_search_cache" WHERE "expires_at" < NOW();
  DELETE FROM "metadata_cache" WHERE "expires_at" < NOW();
END;
$$ LANGUAGE plpgsql;

-- Comment: Add helpful comments
COMMENT ON TABLE "mbid_search_cache" IS 'Cache for MusicBrainz API search queries to avoid repeated API calls and rate limiting';
COMMENT ON COLUMN "mbid_search_cache"."query_params" IS 'Additional parameters for cache key (artist, album, duration, etc.)';
COMMENT ON COLUMN "mbid_search_cache"."hit_count" IS 'Number of times this cached result has been used';
COMMENT ON COLUMN "metadata_conflicts"."metadata" IS 'JSONB for efficient queries on suggestions array and scores';
-- Add mbid_searched_at field to Artist, Album, and Track tables
-- This field tracks when we last attempted to search for a MusicBrainz ID
-- Prevents redundant searches for entities without MBIDs

-- Add to artists table
ALTER TABLE "artists" ADD COLUMN "mbid_searched_at" TIMESTAMP(3);

-- Add to albums table
ALTER TABLE "albums" ADD COLUMN "mbid_searched_at" TIMESTAMP(3);

-- Add to tracks table
ALTER TABLE "tracks" ADD COLUMN "mbid_searched_at" TIMESTAMP(3);
