CREATE TYPE "public"."dj_analysis_status" AS ENUM('pending', 'analyzing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."stem_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "dj_analysis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"track_id" uuid NOT NULL,
	"bpm" real,
	"key" varchar(10),
	"camelot_key" varchar(5),
	"energy" real,
	"danceability" real,
	"beatgrid" jsonb,
	"intro_end" real,
	"outro_start" real,
	"status" "dj_analysis_status" DEFAULT 'pending' NOT NULL,
	"analysis_error" varchar(512),
	"analyzed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dj_analysis_track_id_unique" UNIQUE("track_id")
);
--> statement-breakpoint
CREATE TABLE "dj_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"transition_type" varchar(50) DEFAULT 'crossfade' NOT NULL,
	"transition_duration" real DEFAULT 8 NOT NULL,
	"track_list" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dj_stems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"track_id" uuid NOT NULL,
	"vocals_path" varchar(512),
	"drums_path" varchar(512),
	"bass_path" varchar(512),
	"other_path" varchar(512),
	"status" "stem_status" DEFAULT 'pending' NOT NULL,
	"processing_error" varchar(512),
	"model_used" varchar(50),
	"total_size_bytes" real,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dj_stems_track_id_unique" UNIQUE("track_id")
);
--> statement-breakpoint
CREATE TABLE "tempo_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"track_id" uuid NOT NULL,
	"session_id" uuid,
	"original_bpm" real NOT NULL,
	"target_bpm" real NOT NULL,
	"file_path" varchar(512) NOT NULL,
	"file_size_bytes" real,
	"last_used_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "initial_key" varchar(10);--> statement-breakpoint
ALTER TABLE "dj_analysis" ADD CONSTRAINT "dj_analysis_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dj_stems" ADD CONSTRAINT "dj_stems_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tempo_cache" ADD CONSTRAINT "tempo_cache_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tempo_cache" ADD CONSTRAINT "tempo_cache_session_id_dj_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."dj_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_dj_analysis_track" ON "dj_analysis" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "idx_dj_analysis_bpm" ON "dj_analysis" USING btree ("bpm");--> statement-breakpoint
CREATE INDEX "idx_dj_analysis_key" ON "dj_analysis" USING btree ("camelot_key");--> statement-breakpoint
CREATE INDEX "idx_dj_analysis_status" ON "dj_analysis" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_dj_sessions_user" ON "dj_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_dj_stems_track" ON "dj_stems" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "idx_dj_stems_status" ON "dj_stems" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_tempo_cache_track" ON "tempo_cache" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "idx_tempo_cache_session" ON "tempo_cache" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_tempo_cache_bpm" ON "tempo_cache" USING btree ("track_id","target_bpm");--> statement-breakpoint
CREATE INDEX "idx_tempo_cache_last_used" ON "tempo_cache" USING btree ("last_used_at");