CREATE TABLE "stream_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp,
	CONSTRAINT "stream_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar(50) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"name" varchar(100),
	"is_admin" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"theme" varchar(20) DEFAULT 'dark' NOT NULL,
	"language" varchar(10) DEFAULT 'es' NOT NULL,
	"must_change_password" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp,
	"last_access_at" timestamp,
	"avatar_path" varchar(512),
	"avatar_mime_type" varchar(50),
	"avatar_size" bigint,
	"avatar_updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "artist_banners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"image_url" varchar(512) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "artists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"album_count" integer DEFAULT 0 NOT NULL,
	"song_count" integer DEFAULT 0 NOT NULL,
	"mbz_artist_id" varchar(36),
	"mbid_searched_at" timestamp,
	"biography" text,
	"biography_source" varchar(50),
	"profile_image_path" varchar(512),
	"profile_image_updated_at" timestamp,
	"external_profile_path" varchar(512),
	"external_profile_source" varchar(50),
	"external_profile_updated_at" timestamp,
	"background_image_path" varchar(512),
	"background_updated_at" timestamp,
	"background_position" varchar(50),
	"external_background_path" varchar(512),
	"external_background_source" varchar(50),
	"external_background_updated_at" timestamp,
	"banner_image_path" varchar(512),
	"banner_updated_at" timestamp,
	"external_banner_path" varchar(512),
	"external_banner_source" varchar(50),
	"external_banner_updated_at" timestamp,
	"logo_image_path" varchar(512),
	"logo_updated_at" timestamp,
	"external_logo_path" varchar(512),
	"external_logo_source" varchar(50),
	"external_logo_updated_at" timestamp,
	"external_url" varchar(512),
	"metadata_storage_size" bigint DEFAULT 0,
	"order_artist_name" varchar(255),
	"size" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_artist_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" uuid NOT NULL,
	"image_type" varchar(20) NOT NULL,
	"file_path" varchar(512) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_size" bigint DEFAULT 0 NOT NULL,
	"mime_type" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "albums" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"album_artist_id" uuid,
	"artist_id" uuid,
	"cover_art_path" varchar(512),
	"external_cover_path" varchar(512),
	"external_cover_source" varchar(50),
	"year" integer,
	"release_date" date,
	"original_date" date,
	"compilation" boolean DEFAULT false NOT NULL,
	"song_count" integer DEFAULT 0 NOT NULL,
	"duration" integer DEFAULT 0 NOT NULL,
	"size" bigint DEFAULT 0 NOT NULL,
	"mbz_album_id" varchar(36),
	"mbz_album_artist_id" varchar(36),
	"mbz_album_type" varchar(100),
	"mbid_searched_at" timestamp,
	"catalog_num" varchar(255),
	"comment" varchar(255),
	"order_album_name" varchar(255),
	"order_album_artist_name" varchar(255),
	"sort_album_name" varchar(255),
	"sort_artist_name" varchar(255),
	"sort_album_artist_name" varchar(255),
	"description" text,
	"external_url" varchar(512),
	"external_info_updated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_album_covers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"album_id" uuid NOT NULL,
	"file_path" varchar(512) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_size" bigint DEFAULT 0 NOT NULL,
	"mime_type" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "track_artists" (
	"track_id" uuid NOT NULL,
	"artist_id" uuid NOT NULL,
	"artist_name" varchar(255) NOT NULL,
	CONSTRAINT "track_artists_track_id_artist_id_pk" PRIMARY KEY("track_id","artist_id")
);
--> statement-breakpoint
CREATE TABLE "tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"album_id" uuid,
	"album_artist_id" uuid,
	"artist_id" uuid,
	"has_cover_art" boolean DEFAULT false NOT NULL,
	"track_number" integer,
	"disc_number" integer DEFAULT 1 NOT NULL,
	"disc_subtitle" varchar(255),
	"year" integer,
	"date" date,
	"original_date" date,
	"release_date" date,
	"size" bigint,
	"suffix" varchar(10),
	"duration" integer,
	"bit_rate" integer,
	"channels" integer,
	"full_text" text,
	"album_name" varchar(255),
	"artist_name" varchar(255),
	"album_artist_name" varchar(255),
	"compilation" boolean DEFAULT false NOT NULL,
	"comment" varchar(512),
	"lyrics" text,
	"sort_title" varchar(255),
	"sort_album_name" varchar(255),
	"sort_artist_name" varchar(255),
	"sort_album_artist_name" varchar(255),
	"order_title" varchar(255),
	"order_album_name" varchar(255),
	"order_artist_name" varchar(255),
	"order_album_artist_name" varchar(255),
	"mbz_track_id" varchar(36),
	"mbz_album_id" varchar(36),
	"mbz_artist_id" varchar(36),
	"mbz_album_artist_id" varchar(36),
	"mbz_release_track_id" varchar(36),
	"mbid_searched_at" timestamp,
	"catalog_num" varchar(255),
	"path" varchar(512) NOT NULL,
	"bpm" integer,
	"rg_album_gain" real,
	"rg_album_peak" real,
	"rg_track_gain" real,
	"rg_track_peak" real,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tracks_path_unique" UNIQUE("path")
);
--> statement-breakpoint
CREATE TABLE "album_genres" (
	"album_id" uuid NOT NULL,
	"genre_id" uuid NOT NULL,
	CONSTRAINT "album_genres_album_id_genre_id_pk" PRIMARY KEY("album_id","genre_id")
);
--> statement-breakpoint
CREATE TABLE "artist_genres" (
	"artist_id" uuid NOT NULL,
	"genre_id" uuid NOT NULL,
	CONSTRAINT "artist_genres_artist_id_genre_id_pk" PRIMARY KEY("artist_id","genre_id")
);
--> statement-breakpoint
CREATE TABLE "genres" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"album_count" integer DEFAULT 0 NOT NULL,
	"song_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "genres_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "track_genres" (
	"track_id" uuid NOT NULL,
	"genre_id" uuid NOT NULL,
	CONSTRAINT "track_genres_track_id_genre_id_pk" PRIMARY KEY("track_id","genre_id")
);
--> statement-breakpoint
CREATE TABLE "playlist_tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"playlist_id" uuid NOT NULL,
	"track_id" uuid NOT NULL,
	"track_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "playlist_tracks_playlist_order_unique" UNIQUE("playlist_id","track_order")
);
--> statement-breakpoint
CREATE TABLE "playlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"cover_image_url" varchar(512),
	"duration" integer DEFAULT 0 NOT NULL,
	"size" bigint DEFAULT 0 NOT NULL,
	"owner_id" uuid NOT NULL,
	"public" boolean DEFAULT false NOT NULL,
	"song_count" integer DEFAULT 0 NOT NULL,
	"path" varchar(512),
	"sync" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "play_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"track_id" uuid NOT NULL,
	"played_at" timestamp NOT NULL,
	"client" varchar(255),
	"play_context" varchar(50) DEFAULT 'direct' NOT NULL,
	"completion_rate" real,
	"skipped" boolean DEFAULT false NOT NULL,
	"source_id" uuid,
	"source_type" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_play_stats" (
	"user_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"item_type" varchar(50) NOT NULL,
	"play_count" bigint DEFAULT 0 NOT NULL,
	"weighted_play_count" real DEFAULT 0 NOT NULL,
	"last_played_at" timestamp,
	"avg_completion_rate" real,
	"skip_count" bigint DEFAULT 0 NOT NULL,
	CONSTRAINT "user_play_stats_user_id_item_id_item_type_pk" PRIMARY KEY("user_id","item_id","item_type")
);
--> statement-breakpoint
CREATE TABLE "user_ratings" (
	"user_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"item_type" varchar(50) NOT NULL,
	"rating" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_ratings_user_id_item_id_item_type_pk" PRIMARY KEY("user_id","item_id","item_type")
);
--> statement-breakpoint
CREATE TABLE "user_starred" (
	"user_id" uuid NOT NULL,
	"starred_id" uuid NOT NULL,
	"starred_type" varchar(50) NOT NULL,
	"sentiment" varchar(20) NOT NULL,
	"starred_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_starred_user_id_starred_id_starred_type_pk" PRIMARY KEY("user_id","starred_id","starred_type")
);
--> statement-breakpoint
CREATE TABLE "play_queue_tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"queue_id" uuid NOT NULL,
	"track_id" uuid NOT NULL,
	"queue_order" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "play_queue_tracks_queue_order_unique" UNIQUE("queue_id","queue_order")
);
--> statement-breakpoint
CREATE TABLE "play_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"current_track_id" uuid,
	"position" bigint DEFAULT 0 NOT NULL,
	"changed_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "play_queue_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(50),
	"user_name" varchar(255),
	"user_id" uuid,
	"client" varchar(255),
	"ip_address" varchar(45),
	"last_seen" timestamp,
	"max_bit_rate" integer,
	"transcoding_id" uuid,
	"scrobble_enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transcoding" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"target_format" varchar(10) NOT NULL,
	"default_bit_rate" integer,
	"command" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "radio_stations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"station_uuid" varchar(255),
	"name" varchar(255) NOT NULL,
	"url" varchar(512) NOT NULL,
	"url_resolved" varchar(512),
	"homepage" varchar(512),
	"favicon" varchar(512),
	"country" varchar(100),
	"country_code" varchar(10),
	"state" varchar(100),
	"language" varchar(100),
	"tags" varchar(512),
	"codec" varchar(50),
	"bitrate" integer,
	"votes" integer,
	"click_count" integer,
	"last_check_ok" boolean,
	"source" varchar(20) NOT NULL,
	"is_favorite" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookmarks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"item_type" varchar(50) NOT NULL,
	"position" bigint NOT NULL,
	"comment" varchar(512),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bookmarks_user_item_unique" UNIQUE("user_id","item_id","item_type")
);
--> statement-breakpoint
CREATE TABLE "shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"description" varchar(512),
	"expires_at" timestamp,
	"last_visited_at" timestamp,
	"resource_ids" text NOT NULL,
	"resource_type" varchar(50) NOT NULL,
	"visit_count" integer DEFAULT 0 NOT NULL,
	"downloadable" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mbid_search_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"query_text" text NOT NULL,
	"query_type" varchar(20) NOT NULL,
	"query_params" json DEFAULT '{}'::json NOT NULL,
	"results" json NOT NULL,
	"result_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"hit_count" integer DEFAULT 0 NOT NULL,
	"last_hit_at" timestamp,
	CONSTRAINT "unique_mbid_search" UNIQUE("query_text","query_type")
);
--> statement-breakpoint
CREATE TABLE "metadata_cache" (
	"entity_id" uuid NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"data" text NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	CONSTRAINT "metadata_cache_entity_id_entity_type_provider_pk" PRIMARY KEY("entity_id","entity_type","provider")
);
--> statement-breakpoint
CREATE TABLE "metadata_conflicts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"entity_type" varchar(20) NOT NULL,
	"field" varchar(50) NOT NULL,
	"current_value" text,
	"suggested_value" text NOT NULL,
	"source" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"priority" integer DEFAULT 1 NOT NULL,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"resolved_by" uuid
);
--> statement-breakpoint
CREATE TABLE "enrichment_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"entity_type" varchar(20) NOT NULL,
	"entity_name" varchar(255) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"metadata_type" varchar(50) NOT NULL,
	"status" varchar(20) NOT NULL,
	"fields_updated" text[],
	"error_message" text,
	"preview_url" varchar(512),
	"user_id" uuid,
	"processing_time" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"category" varchar(50) NOT NULL,
	"type" varchar(20) DEFAULT 'string' NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "library_scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" varchar(50) NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	"tracks_added" integer DEFAULT 0 NOT NULL,
	"tracks_updated" integer DEFAULT 0 NOT NULL,
	"tracks_deleted" integer DEFAULT 0 NOT NULL,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "system_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"level" varchar(20) NOT NULL,
	"category" varchar(50) NOT NULL,
	"message" text NOT NULL,
	"details" text,
	"user_id" uuid,
	"entity_id" uuid,
	"entity_type" varchar(20),
	"stack_trace" text,
	"request_id" uuid,
	"ip_address" varchar(45),
	"user_agent" varchar(512),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stream_tokens" ADD CONSTRAINT "stream_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_banners" ADD CONSTRAINT "artist_banners_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_artist_images" ADD CONSTRAINT "custom_artist_images_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "albums" ADD CONSTRAINT "albums_album_artist_id_artists_id_fk" FOREIGN KEY ("album_artist_id") REFERENCES "public"."artists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "albums" ADD CONSTRAINT "albums_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_album_covers" ADD CONSTRAINT "custom_album_covers_album_id_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_artists" ADD CONSTRAINT "track_artists_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_artists" ADD CONSTRAINT "track_artists_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_album_id_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_album_artist_id_artists_id_fk" FOREIGN KEY ("album_artist_id") REFERENCES "public"."artists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "album_genres" ADD CONSTRAINT "album_genres_album_id_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "album_genres" ADD CONSTRAINT "album_genres_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_genres" ADD CONSTRAINT "artist_genres_artist_id_artists_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."artists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_genres" ADD CONSTRAINT "artist_genres_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_genres" ADD CONSTRAINT "track_genres_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "track_genres" ADD CONSTRAINT "track_genres_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlist_tracks" ADD CONSTRAINT "playlist_tracks_playlist_id_playlists_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "public"."playlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlist_tracks" ADD CONSTRAINT "playlist_tracks_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "playlists" ADD CONSTRAINT "playlists_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play_history" ADD CONSTRAINT "play_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play_history" ADD CONSTRAINT "play_history_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_play_stats" ADD CONSTRAINT "user_play_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_ratings" ADD CONSTRAINT "user_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_starred" ADD CONSTRAINT "user_starred_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play_queue_tracks" ADD CONSTRAINT "play_queue_tracks_queue_id_play_queue_id_fk" FOREIGN KEY ("queue_id") REFERENCES "public"."play_queue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play_queue_tracks" ADD CONSTRAINT "play_queue_tracks_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play_queue" ADD CONSTRAINT "play_queue_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play_queue" ADD CONSTRAINT "play_queue_current_track_id_tracks_id_fk" FOREIGN KEY ("current_track_id") REFERENCES "public"."tracks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_transcoding_id_transcoding_id_fk" FOREIGN KEY ("transcoding_id") REFERENCES "public"."transcoding"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "radio_stations" ADD CONSTRAINT "radio_stations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shares" ADD CONSTRAINT "shares_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stream_tokens_token_idx" ON "stream_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "stream_tokens_user_id_idx" ON "stream_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "stream_tokens_expires_at_idx" ON "stream_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "artist_banners_artist_id_idx" ON "artist_banners" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX "artist_banners_artist_order_idx" ON "artist_banners" USING btree ("artist_id","order");--> statement-breakpoint
CREATE INDEX "idx_artists_name" ON "artists" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_artists_album_count" ON "artists" USING btree ("album_count");--> statement-breakpoint
CREATE INDEX "idx_artists_mbid" ON "artists" USING btree ("mbz_artist_id");--> statement-breakpoint
CREATE INDEX "custom_artist_images_artist_id_idx" ON "custom_artist_images" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX "custom_artist_images_artist_type_idx" ON "custom_artist_images" USING btree ("artist_id","image_type");--> statement-breakpoint
CREATE INDEX "custom_artist_images_is_active_idx" ON "custom_artist_images" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_albums_artist" ON "albums" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX "idx_albums_album_artist" ON "albums" USING btree ("album_artist_id");--> statement-breakpoint
CREATE INDEX "idx_albums_year" ON "albums" USING btree ("year");--> statement-breakpoint
CREATE INDEX "idx_albums_name" ON "albums" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_albums_mbid" ON "albums" USING btree ("mbz_album_id");--> statement-breakpoint
CREATE INDEX "idx_albums_artist_mbid" ON "albums" USING btree ("mbz_album_artist_id");--> statement-breakpoint
CREATE INDEX "custom_album_covers_album_id_idx" ON "custom_album_covers" USING btree ("album_id");--> statement-breakpoint
CREATE INDEX "custom_album_covers_is_active_idx" ON "custom_album_covers" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_tracks_album" ON "tracks" USING btree ("album_id");--> statement-breakpoint
CREATE INDEX "idx_tracks_artist" ON "tracks" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX "idx_tracks_title" ON "tracks" USING btree ("title");--> statement-breakpoint
CREATE INDEX "idx_tracks_path" ON "tracks" USING btree ("path");--> statement-breakpoint
CREATE INDEX "idx_tracks_album_track" ON "tracks" USING btree ("album_id","track_number");--> statement-breakpoint
CREATE INDEX "idx_tracks_mbid" ON "tracks" USING btree ("mbz_track_id");--> statement-breakpoint
CREATE INDEX "idx_tracks_artist_mbid" ON "tracks" USING btree ("mbz_artist_id");--> statement-breakpoint
CREATE INDEX "idx_tracks_album_mbid" ON "tracks" USING btree ("mbz_album_id");--> statement-breakpoint
CREATE INDEX "idx_album_genres_genre" ON "album_genres" USING btree ("genre_id");--> statement-breakpoint
CREATE INDEX "idx_artist_genres_genre" ON "artist_genres" USING btree ("genre_id");--> statement-breakpoint
CREATE INDEX "idx_genres_name" ON "genres" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_track_genres_genre" ON "track_genres" USING btree ("genre_id");--> statement-breakpoint
CREATE INDEX "idx_playlist_tracks_playlist" ON "playlist_tracks" USING btree ("playlist_id","track_order");--> statement-breakpoint
CREATE INDEX "idx_playlists_owner" ON "playlists" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_play_history_user_date" ON "play_history" USING btree ("user_id","played_at");--> statement-breakpoint
CREATE INDEX "idx_play_history_track" ON "play_history" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "idx_play_history_played_at" ON "play_history" USING btree ("played_at");--> statement-breakpoint
CREATE INDEX "idx_play_history_context" ON "play_history" USING btree ("user_id","play_context");--> statement-breakpoint
CREATE INDEX "idx_play_history_source" ON "play_history" USING btree ("source_id","source_type");--> statement-breakpoint
CREATE INDEX "idx_user_play_stats_user" ON "user_play_stats" USING btree ("user_id","play_count");--> statement-breakpoint
CREATE INDEX "idx_user_play_stats_weighted" ON "user_play_stats" USING btree ("user_id","weighted_play_count");--> statement-breakpoint
CREATE INDEX "idx_user_play_stats_item" ON "user_play_stats" USING btree ("item_id","item_type");--> statement-breakpoint
CREATE INDEX "idx_user_ratings_user" ON "user_ratings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ratings_item" ON "user_ratings" USING btree ("item_id","item_type");--> statement-breakpoint
CREATE INDEX "idx_user_starred_user" ON "user_starred" USING btree ("user_id","starred_at");--> statement-breakpoint
CREATE INDEX "idx_user_starred_item" ON "user_starred" USING btree ("starred_id","starred_type");--> statement-breakpoint
CREATE INDEX "idx_user_starred_sentiment" ON "user_starred" USING btree ("user_id","sentiment");--> statement-breakpoint
CREATE INDEX "idx_play_queue_tracks_queue" ON "play_queue_tracks" USING btree ("queue_id","queue_order");--> statement-breakpoint
CREATE INDEX "idx_players_user" ON "players" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "radio_stations_user_id_idx" ON "radio_stations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "radio_stations_station_uuid_idx" ON "radio_stations" USING btree ("station_uuid");--> statement-breakpoint
CREATE INDEX "radio_stations_user_favorite_idx" ON "radio_stations" USING btree ("user_id","is_favorite");--> statement-breakpoint
CREATE INDEX "idx_shares_user" ON "shares" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_mbid_search_lookup" ON "mbid_search_cache" USING btree ("query_text","query_type");--> statement-breakpoint
CREATE INDEX "idx_mbid_search_expires" ON "mbid_search_cache" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_metadata_cache_expires" ON "metadata_cache" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "metadata_conflicts_entity_idx" ON "metadata_conflicts" USING btree ("entity_id","entity_type");--> statement-breakpoint
CREATE INDEX "metadata_conflicts_status_idx" ON "metadata_conflicts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "metadata_conflicts_created_idx" ON "metadata_conflicts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "enrichment_logs_entity_idx" ON "enrichment_logs" USING btree ("entity_id","entity_type");--> statement-breakpoint
CREATE INDEX "enrichment_logs_provider_idx" ON "enrichment_logs" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "enrichment_logs_status_idx" ON "enrichment_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "enrichment_logs_created_idx" ON "enrichment_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "enrichment_logs_user_idx" ON "enrichment_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "settings_category_idx" ON "settings" USING btree ("category");--> statement-breakpoint
CREATE INDEX "system_logs_level_created_idx" ON "system_logs" USING btree ("level","created_at");--> statement-breakpoint
CREATE INDEX "system_logs_category_created_idx" ON "system_logs" USING btree ("category","created_at");--> statement-breakpoint
CREATE INDEX "system_logs_user_idx" ON "system_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "system_logs_request_idx" ON "system_logs" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "system_logs_created_idx" ON "system_logs" USING btree ("created_at");