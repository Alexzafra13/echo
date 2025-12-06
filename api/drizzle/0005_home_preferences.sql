-- Migration: Home Page Preferences
-- Description: Add customizable home page sections for each user
-- The home_sections field stores an array of section configurations
-- Each section has: id, enabled, order

-- Add home_sections column to users table
-- Default: recent-albums and wave-mix enabled
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "home_sections" JSONB DEFAULT '[
  {"id": "recent-albums", "enabled": true, "order": 0},
  {"id": "wave-mix", "enabled": true, "order": 1},
  {"id": "recently-played", "enabled": false, "order": 2},
  {"id": "my-playlists", "enabled": false, "order": 3},
  {"id": "top-played", "enabled": false, "order": 4},
  {"id": "favorite-radios", "enabled": false, "order": 5},
  {"id": "surprise-me", "enabled": false, "order": 6},
  {"id": "explore", "enabled": false, "order": 7}
]'::jsonb NOT NULL;
