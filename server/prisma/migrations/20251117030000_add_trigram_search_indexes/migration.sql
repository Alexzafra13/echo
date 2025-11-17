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
