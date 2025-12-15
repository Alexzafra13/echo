CREATE TABLE "album_import_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"connected_server_id" uuid NOT NULL,
	"remote_album_id" varchar(36) NOT NULL,
	"album_name" varchar(255) NOT NULL,
	"artist_name" varchar(255),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"total_tracks" integer DEFAULT 0 NOT NULL,
	"downloaded_tracks" integer DEFAULT 0 NOT NULL,
	"total_size" bigint DEFAULT 0 NOT NULL,
	"downloaded_size" bigint DEFAULT 0 NOT NULL,
	"error_message" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "valid_import_status" CHECK ("album_import_queue"."status" IN ('pending', 'downloading', 'completed', 'failed', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "connected_servers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"base_url" varchar(512) NOT NULL,
	"auth_token" varchar(512) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_online" boolean DEFAULT false NOT NULL,
	"last_online_at" timestamp,
	"last_checked_at" timestamp,
	"remote_album_count" integer DEFAULT 0 NOT NULL,
	"remote_track_count" integer DEFAULT 0 NOT NULL,
	"remote_artist_count" integer DEFAULT 0 NOT NULL,
	"last_sync_at" timestamp,
	"last_error_at" timestamp,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "federation_access_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"token" varchar(512) NOT NULL,
	"server_name" varchar(100) NOT NULL,
	"server_url" varchar(512),
	"permissions" jsonb DEFAULT '{"canBrowse":true,"canStream":true,"canDownload":false}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp,
	"last_used_ip" varchar(45),
	"expires_at" timestamp,
	"mutual_invitation_token" varchar(64),
	"mutual_status" varchar(20) DEFAULT 'none' NOT NULL,
	"mutual_responded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "federation_access_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "federation_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"token" varchar(64) NOT NULL,
	"name" varchar(100),
	"is_used" boolean DEFAULT false NOT NULL,
	"used_by_server_name" varchar(100),
	"used_by_ip" varchar(45),
	"used_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"max_uses" integer DEFAULT 1 NOT NULL,
	"current_uses" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "federation_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "album_import_queue" ADD CONSTRAINT "album_import_queue_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "album_import_queue" ADD CONSTRAINT "album_import_queue_connected_server_id_connected_servers_id_fk" FOREIGN KEY ("connected_server_id") REFERENCES "public"."connected_servers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connected_servers" ADD CONSTRAINT "connected_servers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "federation_access_tokens" ADD CONSTRAINT "federation_access_tokens_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "federation_tokens" ADD CONSTRAINT "federation_tokens_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_album_import_queue_user" ON "album_import_queue" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_album_import_queue_server" ON "album_import_queue" USING btree ("connected_server_id");--> statement-breakpoint
CREATE INDEX "idx_album_import_queue_status" ON "album_import_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_connected_servers_user" ON "connected_servers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_connected_servers_active" ON "connected_servers" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_federation_access_tokens_token" ON "federation_access_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_federation_access_tokens_owner" ON "federation_access_tokens" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "idx_federation_access_tokens_active" ON "federation_access_tokens" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_federation_tokens_token" ON "federation_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "idx_federation_tokens_created_by" ON "federation_tokens" USING btree ("created_by_user_id");--> statement-breakpoint
CREATE INDEX "idx_federation_tokens_expires" ON "federation_tokens" USING btree ("expires_at");
