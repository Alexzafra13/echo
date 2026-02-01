-- DJ Analysis Status Enum
CREATE TYPE "public"."dj_analysis_status" AS ENUM('pending', 'analyzing', 'completed', 'failed');

-- Stem Status Enum
CREATE TYPE "public"."stem_status" AS ENUM('pending', 'processing', 'completed', 'failed');

-- DJ Analysis Table
CREATE TABLE IF NOT EXISTS "dj_analysis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"track_id" uuid NOT NULL UNIQUE,
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
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- DJ Stems Table
CREATE TABLE IF NOT EXISTS "dj_stems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"track_id" uuid NOT NULL UNIQUE,
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
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- DJ Sessions Table
CREATE TABLE IF NOT EXISTS "dj_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"transition_type" varchar(50) DEFAULT 'crossfade' NOT NULL,
	"transition_duration" real DEFAULT 8 NOT NULL,
	"track_list" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Foreign Key Constraints
ALTER TABLE "dj_analysis" ADD CONSTRAINT "dj_analysis_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "dj_stems" ADD CONSTRAINT "dj_stems_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;

-- Indexes for DJ Analysis
CREATE INDEX IF NOT EXISTS "idx_dj_analysis_track" ON "dj_analysis" USING btree ("track_id");
CREATE INDEX IF NOT EXISTS "idx_dj_analysis_bpm" ON "dj_analysis" USING btree ("bpm");
CREATE INDEX IF NOT EXISTS "idx_dj_analysis_key" ON "dj_analysis" USING btree ("camelot_key");
CREATE INDEX IF NOT EXISTS "idx_dj_analysis_status" ON "dj_analysis" USING btree ("status");

-- Indexes for DJ Stems
CREATE INDEX IF NOT EXISTS "idx_dj_stems_track" ON "dj_stems" USING btree ("track_id");
CREATE INDEX IF NOT EXISTS "idx_dj_stems_status" ON "dj_stems" USING btree ("status");

-- Indexes for DJ Sessions
CREATE INDEX IF NOT EXISTS "idx_dj_sessions_user" ON "dj_sessions" USING btree ("user_id");
