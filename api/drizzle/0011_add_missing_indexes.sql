ALTER TABLE "user_starred" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "user_starred" CASCADE;--> statement-breakpoint
CREATE INDEX "idx_track_artists_artist" ON "track_artists" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX "idx_tracks_lufs" ON "tracks" USING btree ("lufs_analyzed_at");--> statement-breakpoint
CREATE INDEX "idx_library_scans_status" ON "library_scans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_library_scans_started" ON "library_scans" USING btree ("started_at");