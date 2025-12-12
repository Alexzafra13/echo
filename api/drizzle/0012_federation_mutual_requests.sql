CREATE TABLE IF NOT EXISTS "federation_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"server_name" varchar(100) NOT NULL,
	"server_url" varchar(512) NOT NULL,
	"invitation_token" varchar(64) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"responded_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "valid_request_status" CHECK ("federation_requests"."status" IN ('pending', 'approved', 'rejected', 'expired'))
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "federation_requests" ADD CONSTRAINT "federation_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_federation_requests_user" ON "federation_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_federation_requests_status" ON "federation_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_federation_requests_expires" ON "federation_requests" USING btree ("expires_at");
