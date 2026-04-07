export type MatchMethod = 'filename' | 'metadata' | 'manual';

export interface MusicVideoProps {
  id: string;
  trackId: string | null;
  path: string;
  title: string | null;
  artistName: string | null;
  duration: number | null;
  width: number | null;
  height: number | null;
  codec: string | null;
  bitRate: number | null;
  size: number | null;
  suffix: string | null;
  thumbnailPath: string | null;
  matchMethod: MatchMethod | null;
  missingAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
