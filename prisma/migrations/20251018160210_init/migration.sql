-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100),
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "theme" VARCHAR(20) NOT NULL DEFAULT 'dark',
    "language" VARCHAR(10) NOT NULL DEFAULT 'es',
    "last_login_at" TIMESTAMP(3),
    "last_access_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artists" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "album_count" INTEGER NOT NULL DEFAULT 0,
    "song_count" INTEGER NOT NULL DEFAULT 0,
    "mbz_artist_id" VARCHAR(36),
    "biography" TEXT,
    "small_image_url" VARCHAR(512),
    "medium_image_url" VARCHAR(512),
    "large_image_url" VARCHAR(512),
    "external_url" VARCHAR(512),
    "external_info_updated_at" TIMESTAMP(3),
    "order_artist_name" VARCHAR(255),
    "size" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artists_pkey" PRIMARY KEY ("id")
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
    "cover_art_id" VARCHAR(255),
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
    "small_image_url" VARCHAR(512),
    "medium_image_url" VARCHAR(512),
    "large_image_url" VARCHAR(512),
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
    "starred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "play_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_play_stats" (
    "user_id" VARCHAR(36) NOT NULL,
    "item_id" VARCHAR(36) NOT NULL,
    "item_type" VARCHAR(50) NOT NULL,
    "play_count" BIGINT NOT NULL DEFAULT 0,
    "last_played_at" TIMESTAMP(3),

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
CREATE TABLE "radios" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "stream_url" VARCHAR(512) NOT NULL,
    "home_page_url" VARCHAR(512),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "radios_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "idx_artists_name" ON "artists"("name");

-- CreateIndex
CREATE INDEX "idx_artists_album_count" ON "artists"("album_count" DESC);

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
CREATE INDEX "idx_user_ratings_user" ON "user_ratings"("user_id");

-- CreateIndex
CREATE INDEX "idx_play_history_user_date" ON "play_history"("user_id", "played_at" DESC);

-- CreateIndex
CREATE INDEX "idx_play_history_track" ON "play_history"("track_id");

-- CreateIndex
CREATE INDEX "idx_play_history_played_at" ON "play_history"("played_at" DESC);

-- CreateIndex
CREATE INDEX "idx_user_play_stats_user" ON "user_play_stats"("user_id", "play_count" DESC);

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
CREATE INDEX "idx_metadata_cache_expires" ON "metadata_cache"("expires_at");

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
ALTER TABLE "players" ADD CONSTRAINT "players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "players" ADD CONSTRAINT "players_transcoding_id_fkey" FOREIGN KEY ("transcoding_id") REFERENCES "transcoding"("id") ON DELETE SET NULL ON UPDATE CASCADE;
