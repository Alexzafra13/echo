import { relations } from 'drizzle-orm';

// Import all tables
import { users, streamTokens } from './users';
import { artists, artistBanners, customArtistImages } from './artists';
import { albums, customAlbumCovers } from './albums';
import { tracks, trackArtists } from './tracks';
import { genres, artistGenres, albumGenres, trackGenres } from './genres';
import { playlists, playlistTracks } from './playlists';
import { userRatings, playHistory, userPlayStats } from './play-stats';
import { playQueues, playQueueTracks } from './play-queue';
import { players, transcodings } from './player';
import { radioStations } from './radio';
import { shares, bookmarks } from './shares';
import { friendships } from './social';
import { djAnalysis } from './dj';

// ============================================
// User Relations
// ============================================
export const usersRelations = relations(users, ({ many, one }) => ({
  streamTokens: many(streamTokens),
  bookmarks: many(bookmarks),
  playHistory: many(playHistory),
  playQueue: one(playQueues),
  players: many(players),
  playlists: many(playlists),
  radioStations: many(radioStations),
  shares: many(shares),
  playStats: many(userPlayStats),
  ratings: many(userRatings),
  // Social: friendships where user is the requester
  sentFriendRequests: many(friendships, { relationName: 'requester' }),
  // Social: friendships where user is the addressee
  receivedFriendRequests: many(friendships, { relationName: 'addressee' }),
}));

export const streamTokensRelations = relations(streamTokens, ({ one }) => ({
  user: one(users, {
    fields: [streamTokens.userId],
    references: [users.id],
  }),
}));

// ============================================
// Artist Relations
// ============================================
export const artistsRelations = relations(artists, ({ many }) => ({
  albumsAsAlbumArtist: many(albums, { relationName: 'albumArtist' }),
  albums: many(albums, { relationName: 'artistAlbums' }),
  banners: many(artistBanners),
  genres: many(artistGenres),
  customImages: many(customArtistImages),
  trackArtists: many(trackArtists),
  tracksAsAlbumArtist: many(tracks, { relationName: 'albumArtistTracks' }),
  tracks: many(tracks, { relationName: 'artistTracks' }),
}));

export const artistBannersRelations = relations(artistBanners, ({ one }) => ({
  artist: one(artists, {
    fields: [artistBanners.artistId],
    references: [artists.id],
  }),
}));

export const customArtistImagesRelations = relations(customArtistImages, ({ one }) => ({
  artist: one(artists, {
    fields: [customArtistImages.artistId],
    references: [artists.id],
  }),
}));

// ============================================
// Album Relations
// ============================================
export const albumsRelations = relations(albums, ({ one, many }) => ({
  albumArtist: one(artists, {
    fields: [albums.albumArtistId],
    references: [artists.id],
    relationName: 'albumArtist',
  }),
  artist: one(artists, {
    fields: [albums.artistId],
    references: [artists.id],
    relationName: 'artistAlbums',
  }),
  genres: many(albumGenres),
  customCovers: many(customAlbumCovers),
  tracks: many(tracks),
}));

export const customAlbumCoversRelations = relations(customAlbumCovers, ({ one }) => ({
  album: one(albums, {
    fields: [customAlbumCovers.albumId],
    references: [albums.id],
  }),
}));

// ============================================
// Track Relations
// ============================================
export const tracksRelations = relations(tracks, ({ one, many }) => ({
  album: one(albums, {
    fields: [tracks.albumId],
    references: [albums.id],
  }),
  albumArtist: one(artists, {
    fields: [tracks.albumArtistId],
    references: [artists.id],
    relationName: 'albumArtistTracks',
  }),
  artist: one(artists, {
    fields: [tracks.artistId],
    references: [artists.id],
    relationName: 'artistTracks',
  }),
  trackArtists: many(trackArtists),
  genres: many(trackGenres),
  playHistory: many(playHistory),
  playQueues: many(playQueues),
  playQueueTracks: many(playQueueTracks),
  playlistTracks: many(playlistTracks),
}));

export const trackArtistsRelations = relations(trackArtists, ({ one }) => ({
  track: one(tracks, {
    fields: [trackArtists.trackId],
    references: [tracks.id],
  }),
  artist: one(artists, {
    fields: [trackArtists.artistId],
    references: [artists.id],
  }),
}));

// ============================================
// Genre Relations
// ============================================
export const genresRelations = relations(genres, ({ many }) => ({
  albums: many(albumGenres),
  artists: many(artistGenres),
  tracks: many(trackGenres),
}));

export const artistGenresRelations = relations(artistGenres, ({ one }) => ({
  artist: one(artists, {
    fields: [artistGenres.artistId],
    references: [artists.id],
  }),
  genre: one(genres, {
    fields: [artistGenres.genreId],
    references: [genres.id],
  }),
}));

export const albumGenresRelations = relations(albumGenres, ({ one }) => ({
  album: one(albums, {
    fields: [albumGenres.albumId],
    references: [albums.id],
  }),
  genre: one(genres, {
    fields: [albumGenres.genreId],
    references: [genres.id],
  }),
}));

export const trackGenresRelations = relations(trackGenres, ({ one }) => ({
  track: one(tracks, {
    fields: [trackGenres.trackId],
    references: [tracks.id],
  }),
  genre: one(genres, {
    fields: [trackGenres.genreId],
    references: [genres.id],
  }),
}));

// ============================================
// Playlist Relations
// ============================================
export const playlistsRelations = relations(playlists, ({ one, many }) => ({
  owner: one(users, {
    fields: [playlists.ownerId],
    references: [users.id],
  }),
  tracks: many(playlistTracks),
}));

export const playlistTracksRelations = relations(playlistTracks, ({ one }) => ({
  playlist: one(playlists, {
    fields: [playlistTracks.playlistId],
    references: [playlists.id],
  }),
  track: one(tracks, {
    fields: [playlistTracks.trackId],
    references: [tracks.id],
  }),
}));

// ============================================
// Play Stats Relations
// ============================================
export const userRatingsRelations = relations(userRatings, ({ one }) => ({
  user: one(users, {
    fields: [userRatings.userId],
    references: [users.id],
  }),
}));

export const playHistoryRelations = relations(playHistory, ({ one }) => ({
  user: one(users, {
    fields: [playHistory.userId],
    references: [users.id],
  }),
  track: one(tracks, {
    fields: [playHistory.trackId],
    references: [tracks.id],
  }),
}));

export const userPlayStatsRelations = relations(userPlayStats, ({ one }) => ({
  user: one(users, {
    fields: [userPlayStats.userId],
    references: [users.id],
  }),
}));

// ============================================
// Play Queue Relations
// ============================================
export const playQueuesRelations = relations(playQueues, ({ one, many }) => ({
  user: one(users, {
    fields: [playQueues.userId],
    references: [users.id],
  }),
  currentTrack: one(tracks, {
    fields: [playQueues.currentTrackId],
    references: [tracks.id],
  }),
  tracks: many(playQueueTracks),
}));

export const playQueueTracksRelations = relations(playQueueTracks, ({ one }) => ({
  queue: one(playQueues, {
    fields: [playQueueTracks.queueId],
    references: [playQueues.id],
  }),
  track: one(tracks, {
    fields: [playQueueTracks.trackId],
    references: [tracks.id],
  }),
}));

// ============================================
// Player Relations
// ============================================
export const playersRelations = relations(players, ({ one }) => ({
  user: one(users, {
    fields: [players.userId],
    references: [users.id],
  }),
  transcoding: one(transcodings, {
    fields: [players.transcodingId],
    references: [transcodings.id],
  }),
}));

export const transcodingsRelations = relations(transcodings, ({ many }) => ({
  players: many(players),
}));

// ============================================
// Radio Relations
// ============================================
export const radioStationsRelations = relations(radioStations, ({ one }) => ({
  user: one(users, {
    fields: [radioStations.userId],
    references: [users.id],
  }),
}));

// ============================================
// Share Relations
// ============================================
export const sharesRelations = relations(shares, ({ one }) => ({
  user: one(users, {
    fields: [shares.userId],
    references: [users.id],
  }),
}));

export const bookmarksRelations = relations(bookmarks, ({ one }) => ({
  user: one(users, {
    fields: [bookmarks.userId],
    references: [users.id],
  }),
}));

// ============================================
// Friendship Relations
// ============================================
export const friendshipsRelations = relations(friendships, ({ one }) => ({
  requester: one(users, {
    fields: [friendships.requesterId],
    references: [users.id],
    relationName: 'requester',
  }),
  addressee: one(users, {
    fields: [friendships.addresseeId],
    references: [users.id],
    relationName: 'addressee',
  }),
}));

// ============================================
// DJ Analysis Relations
// ============================================
export const djAnalysisRelations = relations(djAnalysis, ({ one }) => ({
  track: one(tracks, {
    fields: [djAnalysis.trackId],
    references: [tracks.id],
  }),
}));
