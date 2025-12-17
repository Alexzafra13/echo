import { PlaylistListItem, GetPlaylistsOutput } from '../get-playlists/get-playlists.dto';

export interface GetPlaylistsByArtistInput {
  artistId: string;
  skip?: number;
  take?: number;
}

// Reuse the same types as GetPlaylists for compatibility
export type PlaylistByArtistItem = PlaylistListItem;
export type GetPlaylistsByArtistOutput = GetPlaylistsOutput;
