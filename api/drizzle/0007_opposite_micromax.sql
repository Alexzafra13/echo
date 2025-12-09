CREATE TABLE "friendships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" uuid NOT NULL,
	"addressee_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_friendship" UNIQUE("requester_id","addressee_id"),
	CONSTRAINT "no_self_friendship" CHECK ("friendships"."requester_id" != "friendships"."addressee_id"),
	CONSTRAINT "valid_status" CHECK ("friendships"."status" IN ('pending', 'accepted', 'blocked'))
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_public_profile" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "show_top_tracks" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "show_top_artists" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "show_top_albums" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "show_playlists" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "home_sections" jsonb DEFAULT '[{"id":"recent-albums","enabled":true,"order":0},{"id":"artist-mix","enabled":true,"order":1},{"id":"genre-mix","enabled":false,"order":2},{"id":"recently-played","enabled":false,"order":3},{"id":"my-playlists","enabled":false,"order":4},{"id":"top-played","enabled":false,"order":5},{"id":"favorite-radios","enabled":false,"order":6},{"id":"surprise-me","enabled":false,"order":7}]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "lufs_analyzed_at" timestamp;--> statement-breakpoint
ALTER TABLE "tracks" ADD COLUMN "missing_at" timestamp;--> statement-breakpoint
ALTER TABLE "play_queue" ADD COLUMN "is_playing" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_addressee_id_users_id_fk" FOREIGN KEY ("addressee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_friendships_requester" ON "friendships" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "idx_friendships_addressee" ON "friendships" USING btree ("addressee_id");--> statement-breakpoint
CREATE INDEX "idx_friendships_status" ON "friendships" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_tracks_missing" ON "tracks" USING btree ("missing_at");--> statement-breakpoint
CREATE INDEX "idx_play_queue_is_playing" ON "play_queue" USING btree ("is_playing","updated_at");