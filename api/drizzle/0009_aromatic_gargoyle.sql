ALTER TABLE "albums" ADD COLUMN "pid" varchar(64);--> statement-breakpoint
CREATE INDEX "idx_albums_pid" ON "albums" USING btree ("pid");--> statement-breakpoint
ALTER TABLE "albums" ADD CONSTRAINT "albums_pid_unique" UNIQUE("pid");
