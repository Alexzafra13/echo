import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';

// ============================================
// RadioStation
// ============================================
export const radioStations = pgTable(
  'radio_stations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    stationUuid: varchar('station_uuid', { length: 255 }),
    name: varchar('name', { length: 255 }).notNull(),
    url: varchar('url', { length: 512 }).notNull(),
    urlResolved: varchar('url_resolved', { length: 512 }),
    homepage: varchar('homepage', { length: 512 }),
    favicon: varchar('favicon', { length: 512 }),
    country: varchar('country', { length: 100 }),
    countryCode: varchar('country_code', { length: 10 }),
    state: varchar('state', { length: 100 }),
    language: varchar('language', { length: 100 }),
    tags: varchar('tags', { length: 512 }),
    codec: varchar('codec', { length: 50 }),
    bitrate: integer('bitrate'),
    votes: integer('votes'),
    clickCount: integer('click_count'),
    lastCheckOk: boolean('last_check_ok'),
    source: varchar('source', { length: 20 }).notNull(),
    isFavorite: boolean('is_favorite').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('radio_stations_user_id_idx').on(table.userId),
    index('radio_stations_station_uuid_idx').on(table.stationUuid),
    index('radio_stations_user_favorite_idx').on(table.userId, table.isFavorite),
  ],
);

// ============================================
// RadioStationImage - Custom favicons (global, admin-managed)
// Keyed by stationUuid for Radio Browser stations
// ============================================
export const radioStationImages = pgTable(
  'radio_station_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stationUuid: varchar('station_uuid', { length: 255 }).notNull().unique(),
    filePath: varchar('file_path', { length: 512 }).notNull(),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    fileSize: integer('file_size').default(0).notNull(),
    mimeType: varchar('mime_type', { length: 50 }).notNull(),
    source: varchar('image_source', { length: 50 }).notNull().default('manual'),
    uploadedBy: uuid('uploaded_by'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('radio_station_images_station_uuid_idx').on(table.stationUuid),
    index('radio_station_images_source_idx').on(table.source),
  ],
);

// Type exports
export type RadioStation = typeof radioStations.$inferSelect;
export type NewRadioStation = typeof radioStations.$inferInsert;
export type RadioStationImage = typeof radioStationImages.$inferSelect;
export type NewRadioStationImage = typeof radioStationImages.$inferInsert;
