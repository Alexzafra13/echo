export interface FederationAlbumRow {
  id: string;
  name: string;
  year: number | null;
  songCount: number | null;
  duration: number | null;
  size: number | null;
  coverArtPath: string | null;
  artistId: string | null;
  artistName: string | null;
}

export interface FederationTrackRow {
  id: string;
  title: string;
  trackNumber: number | null;
  discNumber: number | null;
  duration: number | null;
  size: number | null;
  bitRate: number | null;
  suffix: string | null;
  artistId: string | null;
  artistName: string | null;
  rgTrackGain: number | null;
  rgTrackPeak: number | null;
  rgAlbumGain: number | null;
  rgAlbumPeak: number | null;
  bpm: number | null;
  initialKey: string | null;
  outroStart: number | null;
  lufsAnalyzedAt: Date | null;
  djStatus: string | null;
  djBpm: number | null;
  djKey: string | null;
  djCamelotKey: string | null;
  djEnergy: number | null;
  djDanceability: number | null;
  djAnalysisError: string | null;
  djAnalyzedAt: Date | null;
}

export interface FederationDjAnalysisRow {
  trackId: string;
  status: string | null;
  bpm: number | null;
  key: string | null;
  camelotKey: string | null;
  energy: number | null;
  danceability: number | null;
  analysisError: string | null;
  analyzedAt: Date | null;
}

export interface FederationExportAlbumRow extends FederationAlbumRow {
  releaseDate: string | null;
  originalDate: string | null;
  compilation: boolean | null;
  mbzAlbumId: string | null;
  mbzAlbumArtistId: string | null;
  mbzAlbumType: string | null;
  catalogNum: string | null;
  comment: string | null;
  description: string | null;
}

export interface FederationExportTrackRow {
  id: string;
  title: string;
  trackNumber: number | null;
  discNumber: number | null;
  discSubtitle: string | null;
  duration: number | null;
  size: number | null;
  bitRate: number | null;
  channels: number | null;
  suffix: string | null;
  year: number | null;
  date: string | null;
  originalDate: string | null;
  releaseDate: string | null;
  artistName: string | null;
  albumArtistName: string | null;
  comment: string | null;
  lyrics: string | null;
  bpm: number | null;
  rgAlbumGain: number | null;
  rgAlbumPeak: number | null;
  rgTrackGain: number | null;
  rgTrackPeak: number | null;
  lufsAnalyzedAt: Date | null;
  mbzTrackId: string | null;
  mbzAlbumId: string | null;
  mbzArtistId: string | null;
  mbzAlbumArtistId: string | null;
  mbzReleaseTrackId: string | null;
  catalogNum: string | null;
  path: string;
  djStatus: string | null;
  djBpm: number | null;
  djKey: string | null;
  djCamelotKey: string | null;
  djEnergy: number | null;
  djDanceability: number | null;
  djAnalysisError: string | null;
  djAnalyzedAt: Date | null;
}

export interface FederationDownloadAlbumRow {
  id: string;
  name: string;
  coverArtPath: string | null;
  artistName: string | null;
}

export interface FederationTrackPathRow {
  id: string;
  title: string;
  path: string;
  trackNumber: number | null;
  discNumber: number | null;
}

export interface LibraryCounts {
  albumCount: number;
  trackCount: number;
  artistCount: number;
}

export interface IFederationLibraryRepository {
  getCounts(): Promise<LibraryCounts>;
  findAlbums(options: {
    limit: number;
    offset: number;
    search?: string;
  }): Promise<{ albums: FederationAlbumRow[]; total: number }>;
  findAlbumById(id: string): Promise<FederationAlbumRow | null>;
  findAlbumCoverPath(id: string): Promise<string | null>;
  findTrackPath(trackId: string): Promise<{ path: string; size: number | null } | null>;
  findAlbumTracks(albumId: string): Promise<FederationTrackRow[]>;
  findAlbumDjAnalysis(albumId: string): Promise<FederationDjAnalysisRow[]>;
  findAlbumForExport(id: string): Promise<FederationExportAlbumRow | null>;
  findAlbumTracksForExport(albumId: string): Promise<FederationExportTrackRow[]>;
  findAlbumForDownload(id: string): Promise<FederationDownloadAlbumRow | null>;
  findAlbumTrackPaths(albumId: string): Promise<FederationTrackPathRow[]>;
}

export const FEDERATION_LIBRARY_REPOSITORY = Symbol('FEDERATION_LIBRARY_REPOSITORY');
