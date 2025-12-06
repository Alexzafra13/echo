-- Migration: Split wave-mix into artist-mix and genre-mix
-- This migration updates existing users' home_sections to use the new section IDs

-- Update existing users: replace 'wave-mix' with 'artist-mix' and add 'genre-mix'
UPDATE users
SET home_sections = (
  SELECT jsonb_agg(
    CASE
      WHEN section->>'id' = 'wave-mix'
      THEN jsonb_set(section, '{id}', '"artist-mix"')
      ELSE section
    END
    ORDER BY (section->>'order')::int
  ) || jsonb_build_array(
    jsonb_build_object('id', 'genre-mix', 'enabled', false, 'order', (
      SELECT COALESCE(MAX((s->>'order')::int), -1) + 1
      FROM jsonb_array_elements(users.home_sections) s
    ))
  )
  FROM jsonb_array_elements(home_sections) section
)
WHERE home_sections @> '[{"id": "wave-mix"}]';

-- Reorder all sections to ensure sequential order values
UPDATE users
SET home_sections = (
  SELECT jsonb_agg(
    jsonb_set(section, '{order}', to_jsonb(row_number - 1))
    ORDER BY row_number
  )
  FROM (
    SELECT section, row_number() OVER (ORDER BY (section->>'order')::int) as row_number
    FROM jsonb_array_elements(home_sections) section
  ) ordered
);
