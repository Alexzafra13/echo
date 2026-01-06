-- Migration: Drop user_starred table
-- This table was used for like/dislike functionality which has been removed
-- Ratings system (user_ratings table) is now the only interaction mechanism

DROP TABLE IF EXISTS user_starred CASCADE;
