/**
 * Barrel export para todas las factories de test
 *
 * Uso:
 * import { UserFactory, TrackFactory } from 'test/factories';
 *
 * const user = UserFactory.create({ name: 'Custom Name' });
 * const admin = UserFactory.createAdmin();
 * const tracks = TrackFactory.createMany(10);
 */

export { UserFactory } from './user.factory';
export { TrackFactory } from './track.factory';
export { ArtistFactory } from './artist.factory';
export { AlbumFactory } from './album.factory';
export { PlaylistFactory } from './playlist.factory';
