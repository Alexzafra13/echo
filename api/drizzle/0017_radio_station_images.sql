-- Radio station custom images (global, admin-managed)
CREATE TABLE IF NOT EXISTS "radio_station_images" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "station_uuid" varchar(255) NOT NULL UNIQUE,
  "file_path" varchar(512) NOT NULL,
  "file_name" varchar(255) NOT NULL,
  "file_size" integer DEFAULT 0 NOT NULL,
  "mime_type" varchar(50) NOT NULL,
  "image_source" varchar(50) DEFAULT 'manual' NOT NULL,
  "uploaded_by" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "radio_station_images_station_uuid_idx" ON "radio_station_images" ("station_uuid");
CREATE INDEX IF NOT EXISTS "radio_station_images_source_idx" ON "radio_station_images" ("image_source");
