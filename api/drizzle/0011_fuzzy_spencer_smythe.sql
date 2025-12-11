ALTER TABLE "connected_servers" ADD COLUMN "is_online" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "connected_servers" ADD COLUMN "last_online_at" timestamp;--> statement-breakpoint
ALTER TABLE "connected_servers" ADD COLUMN "last_checked_at" timestamp;