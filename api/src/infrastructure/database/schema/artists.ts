import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  bigint,
  text,
  index,
} from 'drizzle-orm/pg-core';

// ============================================
// Artist
// ============================================
export const artists = pgTable(
  'artists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    albumCount: integer('album_count').default(0).notNull(),
    songCount: integer('song_count').default(0).notNull(),
    mbzArtistId: varchar('mbz_artist_id', { length: 36 }),
    mbidSearchedAt: timestamp('mbid_searched_at'),
    biography: text('biography'),
    biographySource: varchar('biography_source', { length: 50 }),
    profileImagePath: varchar('profile_image_path', { length: 512 }),
    profileImageUpdatedAt: timestamp('profile_image_updated_at'),
    externalProfilePath: varchar('external_profile_path', { length: 512 }),
    externalProfileSource: varchar('external_profile_source', { length: 50 }),
    externalProfileUpdatedAt: timestamp('external_profile_updated_at'),
    backgroundImagePath: varchar('background_image_path', { length: 512 }),
    backgroundUpdatedAt: timestamp('background_updated_at'),
    backgroundPosition: varchar('background_position', { length: 50 }),
    externalBackgroundPath: varchar('external_background_path', { length: 512 }),
    externalBackgroundSource: varchar('external_background_source', { length: 50 }),
    externalBackgroundUpdatedAt: timestamp('external_background_updated_at'),
    bannerImagePath: varchar('banner_image_path', { length: 512 }),
    bannerUpdatedAt: timestamp('banner_updated_at'),
    externalBannerPath: varchar('external_banner_path', { length: 512 }),
    externalBannerSource: varchar('external_banner_source', { length: 50 }),
    externalBannerUpdatedAt: timestamp('external_banner_updated_at'),
    logoImagePath: varchar('logo_image_path', { length: 512 }),
    logoUpdatedAt: timestamp('logo_updated_at'),
    externalLogoPath: varchar('external_logo_path', { length: 512 }),
    externalLogoSource: varchar('external_logo_source', { length: 50 }),
    externalLogoUpdatedAt: timestamp('external_logo_updated_at'),
    externalUrl: varchar('external_url', { length: 512 }),
    metadataStorageSize: bigint('metadata_storage_size', { mode: 'number' }).default(0),
    orderArtistName: varchar('order_artist_name', { length: 255 }),
    playCount: bigint('play_count', { mode: 'number' }).default(0).notNull(),
    size: bigint('size', { mode: 'number' }).default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_artists_name').on(table.name),
    index('idx_artists_album_count').on(table.albumCount),
    index('idx_artists_mbid').on(table.mbzArtistId),
  ],
);

// ============================================
// ArtistBanner
// ============================================
export const artistBanners = pgTable(
  'artist_banners',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    artistId: uuid('artist_id').notNull().references(() => artists.id, { onDelete: 'cascade' }),
    imageUrl: varchar('image_url', { length: 512 }).notNull(),
    provider: varchar('provider', { length: 50 }).notNull(),
    order: integer('order').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('artist_banners_artist_id_idx').on(table.artistId),
    index('artist_banners_artist_order_idx').on(table.artistId, table.order),
  ],
);

// ============================================
// CustomArtistImage
// ============================================
export const customArtistImages = pgTable(
  'custom_artist_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    artistId: uuid('artist_id').notNull().references(() => artists.id, { onDelete: 'cascade' }),
    imageType: varchar('image_type', { length: 20 }).notNull(),
    filePath: varchar('file_path', { length: 512 }).notNull(),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    fileSize: bigint('file_size', { mode: 'number' }).default(0).notNull(),
    mimeType: varchar('mime_type', { length: 50 }).notNull(),
    isActive: boolean('is_active').default(false).notNull(),
    uploadedBy: uuid('uploaded_by'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('custom_artist_images_artist_id_idx').on(table.artistId),
    index('custom_artist_images_artist_type_idx').on(table.artistId, table.imageType),
    index('custom_artist_images_is_active_idx').on(table.isActive),
  ],
);

// Type exports
export type Artist = typeof artists.$inferSelect;
export type NewArtist = typeof artists.$inferInsert;
export type ArtistBanner = typeof artistBanners.$inferSelect;
export type NewArtistBanner = typeof artistBanners.$inferInsert;
export type CustomArtistImage = typeof customArtistImages.$inferSelect;
export type NewCustomArtistImage = typeof customArtistImages.$inferInsert;
