-- Migration: Playlist Collaboration & Listening Sessions
-- Adds playlist collaborators, listening sessions with shared queues

-- ============================================
-- Playlist Collaborators
-- ============================================
CREATE TABLE IF NOT EXISTS "playlist_collaborators" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "playlist_id" uuid NOT NULL REFERENCES "playlists"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" varchar(20) NOT NULL DEFAULT 'editor',
  "status" varchar(20) NOT NULL DEFAULT 'pending',
  "invited_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "unique_playlist_collaborator" UNIQUE("playlist_id", "user_id"),
  CONSTRAINT "valid_collaborator_role" CHECK ("role" IN ('editor', 'viewer')),
  CONSTRAINT "valid_collaborator_status" CHECK ("status" IN ('pending', 'accepted'))
);

CREATE INDEX IF NOT EXISTS "idx_playlist_collaborators_playlist" ON "playlist_collaborators" ("playlist_id");
CREATE INDEX IF NOT EXISTS "idx_playlist_collaborators_user" ON "playlist_collaborators" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_playlist_collaborators_status" ON "playlist_collaborators" ("status");

-- ============================================
-- Listening Sessions
-- ============================================
CREATE TABLE IF NOT EXISTS "listening_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "host_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" varchar(255) NOT NULL,
  "invite_code" varchar(8) NOT NULL UNIQUE,
  "is_active" boolean NOT NULL DEFAULT true,
  "current_track_id" uuid REFERENCES "tracks"("id") ON DELETE SET NULL,
  "current_position" integer NOT NULL DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_listening_sessions_host" ON "listening_sessions" ("host_id");
CREATE INDEX IF NOT EXISTS "idx_listening_sessions_invite_code" ON "listening_sessions" ("invite_code");
CREATE INDEX IF NOT EXISTS "idx_listening_sessions_active" ON "listening_sessions" ("is_active");

-- ============================================
-- Listening Session Participants
-- ============================================
CREATE TABLE IF NOT EXISTS "listening_session_participants" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL REFERENCES "listening_sessions"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" varchar(20) NOT NULL DEFAULT 'listener',
  "joined_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "unique_session_participant" UNIQUE("session_id", "user_id"),
  CONSTRAINT "valid_participant_role" CHECK ("role" IN ('host', 'dj', 'listener'))
);

CREATE INDEX IF NOT EXISTS "idx_session_participants_session" ON "listening_session_participants" ("session_id");
CREATE INDEX IF NOT EXISTS "idx_session_participants_user" ON "listening_session_participants" ("user_id");

-- ============================================
-- Listening Session Queue
-- ============================================
CREATE TABLE IF NOT EXISTS "listening_session_queue" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "session_id" uuid NOT NULL REFERENCES "listening_sessions"("id") ON DELETE CASCADE,
  "track_id" uuid NOT NULL REFERENCES "tracks"("id") ON DELETE CASCADE,
  "added_by" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "position" integer NOT NULL,
  "played" boolean NOT NULL DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "unique_session_queue_position" UNIQUE("session_id", "position")
);

CREATE INDEX IF NOT EXISTS "idx_session_queue_session" ON "listening_session_queue" ("session_id", "position");
