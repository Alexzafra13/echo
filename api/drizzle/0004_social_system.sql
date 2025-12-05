-- Migration: Social System
-- Description: Add friendships table and extend play_queue for social features
-- Design decisions:
--   - Reuse play_queue for "now playing" (add is_playing field)
--   - Activity feed generated dynamically from existing tables (play_history, playlists, user_starred)
--   - Only create friendships table for new functionality

-- ============================================
-- Friendships Table
-- ============================================
-- Stores friend relationships between users
-- Status: pending (request sent), accepted (friends), blocked
CREATE TABLE IF NOT EXISTS friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,

    -- Ensure unique friendships (A->B only, not B->A duplicate)
    CONSTRAINT unique_friendship UNIQUE (requester_id, addressee_id),
    -- Prevent self-friendship
    CONSTRAINT no_self_friendship CHECK (requester_id != addressee_id),
    -- Valid status values
    CONSTRAINT valid_status CHECK (status IN ('pending', 'accepted', 'blocked'))
);

-- Indexes for friendships
CREATE INDEX idx_friendships_requester ON friendships(requester_id);
CREATE INDEX idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX idx_friendships_status ON friendships(status);
-- Composite index for finding accepted friends of a user
CREATE INDEX idx_friendships_accepted ON friendships(requester_id, addressee_id) WHERE status = 'accepted';

-- ============================================
-- Extend play_queue for "Now Playing" social feature
-- ============================================
-- Add is_playing to track if user is actively listening
ALTER TABLE play_queue ADD COLUMN IF NOT EXISTS is_playing BOOLEAN DEFAULT false NOT NULL;

-- Index for finding active listeners (used in social "listening now" feature)
CREATE INDEX IF NOT EXISTS idx_play_queue_is_playing ON play_queue(is_playing, updated_at DESC) WHERE is_playing = true;
