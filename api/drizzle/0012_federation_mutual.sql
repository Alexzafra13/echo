-- Add mutual federation fields to federation_access_tokens
ALTER TABLE "federation_access_tokens" ADD COLUMN "mutual_invitation_token" varchar(64);--> statement-breakpoint
ALTER TABLE "federation_access_tokens" ADD COLUMN "mutual_status" varchar(20) DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE "federation_access_tokens" ADD COLUMN "mutual_responded_at" timestamp;
