-- DJ Analysis table for harmonic mixing
-- Stores BPM, Key, and Camelot notation for smart playlist shuffling

DO $$ BEGIN
  CREATE TYPE "public"."dj_analysis_status" AS ENUM('pending', 'analyzing', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

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

DO $$ BEGIN
  ALTER TABLE "dj_analysis" ADD CONSTRAINT "dj_analysis_track_id_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."tracks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "idx_dj_analysis_track" ON "dj_analysis" USING btree ("track_id");
CREATE INDEX IF NOT EXISTS "idx_dj_analysis_bpm" ON "dj_analysis" USING btree ("bpm");
CREATE INDEX IF NOT EXISTS "idx_dj_analysis_key" ON "dj_analysis" USING btree ("camelot_key");
CREATE INDEX IF NOT EXISTS "idx_dj_analysis_status" ON "dj_analysis" USING btree ("status");
