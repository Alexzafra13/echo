import type { TrackWithPlaylistOrder } from '../ports';

/**
 * Mapea un track de playlist a la representación de respuesta.
 * Compartido entre GetPlaylistTracksUseCase y GetPlaylistDjShuffledTracksUseCase.
 *
 * @param bpmOverride - BPM de análisis DJ (prioridad sobre ID3 tag)
 */
export function mapPlaylistTrack(track: TrackWithPlaylistOrder, bpmOverride?: number | null) {
  return {
    id: track.id,
    title: track.title,
    trackNumber: track.trackNumber,
    discNumber: track.discNumber,
    year: track.year,
    duration: track.duration ?? 0,
    // Prevenir errores de serialización JSON con BigInt
    size: track.size !== null && track.size !== undefined ? track.size : Number(0),
    path: track.path,
    albumId: track.albumId,
    artistId: track.artistId,
    bitRate: track.bitRate,
    suffix: track.suffix,
    artistName: track.artistName,
    albumName: track.albumName,
    playlistOrder: track.playlistOrder,
    rgTrackGain: track.rgTrackGain,
    rgTrackPeak: track.rgTrackPeak,
    rgAlbumGain: track.rgAlbumGain,
    rgAlbumPeak: track.rgAlbumPeak,
    outroStart: track.outroStart,
    bpm: bpmOverride ?? track.bpm,
    createdAt: track.createdAt,
    updatedAt: track.updatedAt,
  };
}
