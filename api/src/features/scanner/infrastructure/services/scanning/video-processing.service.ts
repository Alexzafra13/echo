import { Injectable, Inject } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
import { getFfmpegPath, getFfprobePath } from '@features/dj/infrastructure/utils';
import {
  MUSIC_VIDEO_REPOSITORY,
  IMusicVideoRepository,
} from '@features/music-videos/domain/ports/music-video-repository.port';

const execFileAsync = promisify(execFile);

interface VideoMetadata {
  duration: number | null;
  width: number | null;
  height: number | null;
  codec: string | null;
  bitRate: number | null;
  size: number | null;
  title: string | null;
  artist: string | null;
}

@Injectable()
export class VideoProcessingService {
  constructor(
    @InjectPinoLogger(VideoProcessingService.name)
    private readonly logger: PinoLogger,
    @Inject(MUSIC_VIDEO_REPOSITORY)
    private readonly videoRepository: IMusicVideoRepository
  ) {}

  async processVideoFile(filePath: string): Promise<'added' | 'updated' | 'skipped'> {
    try {
      // Check if already indexed
      const existing = await this.videoRepository.findByPath(filePath);
      if (existing) {
        let updated = false;

        // Recover if was marked as missing
        if (existing.missingAt) {
          await this.videoRepository.update(existing.id, { missingAt: null });
          updated = true;
        }

        // Re-attempt matching if not yet linked to a track
        if (!existing.trackId) {
          const metadata = await this.extractVideoMetadata(filePath);
          const match = await this.matchVideoToTrack(filePath, metadata.title, metadata.artist);
          if (match) {
            await this.videoRepository.linkToTrack(existing.id, match.trackId, match.method);
            this.logger.debug(
              { filePath, trackId: match.trackId, method: match.method },
              'Video re-matched to track'
            );
            updated = true;
          }
        }

        // Generate thumbnail if missing
        if (!existing.thumbnailPath) {
          const thumbnailPath = await this.generateThumbnail(existing.id, filePath);
          if (thumbnailPath) {
            await this.videoRepository.update(existing.id, { thumbnailPath });
            updated = true;
          }
        }

        return updated ? 'updated' : 'skipped';
      }

      // Extract metadata with ffprobe
      const metadata = await this.extractVideoMetadata(filePath);
      const suffix = path.extname(filePath).toLowerCase().replace('.', '');

      // Try to match to an audio track
      const match = await this.matchVideoToTrack(filePath, metadata.title, metadata.artist);

      const video = await this.videoRepository.create({
        trackId: match?.trackId ?? null,
        path: filePath,
        title: metadata.title || path.basename(filePath, path.extname(filePath)),
        artistName: metadata.artist,
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
        codec: metadata.codec,
        bitRate: metadata.bitRate,
        size: metadata.size,
        suffix,
        thumbnailPath: null,
        matchMethod: match?.method ?? null,
        missingAt: null,
      });

      // Generate thumbnail from video frame
      const thumbnailPath = await this.generateThumbnail(video.id, filePath);
      if (thumbnailPath) {
        await this.videoRepository.update(video.id, { thumbnailPath });
      }

      if (match) {
        this.logger.info(
          { filePath, trackId: match.trackId, method: match.method },
          '🎬 Video matched to track'
        );
      } else {
        this.logger.info(
          { filePath, title: metadata.title, artist: metadata.artist },
          '🎬 Video added (no track match)'
        );
      }

      return 'added';
    } catch (error) {
      this.logger.error({ error, filePath }, 'Failed to process video file');
      return 'skipped';
    }
  }

  private async extractVideoMetadata(filePath: string): Promise<VideoMetadata> {
    const ffprobe = getFfprobePath();

    try {
      const { stdout } = await execFileAsync(
        ffprobe,
        ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filePath],
        { timeout: 15000 }
      );

      const data = JSON.parse(stdout);
      const videoStream = data.streams?.find(
        (s: { codec_type: string }) => s.codec_type === 'video'
      );
      const format = data.format || {};

      let stats;
      try {
        stats = await fs.stat(filePath);
      } catch {
        stats = null;
      }

      return {
        duration: format.duration ? Math.round(parseFloat(format.duration)) : null,
        width: videoStream?.width || null,
        height: videoStream?.height || null,
        codec: videoStream?.codec_name || null,
        bitRate: format.bit_rate ? Math.round(parseInt(format.bit_rate, 10) / 1000) : null,
        size: stats?.size ?? null,
        title: format.tags?.title || null,
        artist: format.tags?.artist || format.tags?.album_artist || null,
      };
    } catch (error) {
      this.logger.warn({ error, filePath }, 'Failed to extract video metadata with ffprobe');
      return {
        duration: null,
        width: null,
        height: null,
        codec: null,
        bitRate: null,
        size: null,
        title: null,
        artist: null,
      };
    }
  }

  /**
   * Mark videos as missing if their files no longer exist on disk.
   * Similar to LibraryCleanupService.pruneDeletedTracks() for audio tracks.
   * Processes checks in batches for better performance on large libraries.
   */
  async pruneDeletedVideos(): Promise<number> {
    const allVideos = await this.videoRepository.getAllPaths();
    let marked = 0;
    const BATCH_SIZE = 50;

    for (let i = 0; i < allVideos.length; i += BATCH_SIZE) {
      const batch = allVideos.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (video) => {
          try {
            await fs.access(video.path);
            return null;
          } catch {
            return video;
          }
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          await this.videoRepository.markMissing(result.value.id);
          this.logger.info({ path: result.value.path }, '🎬 Video file missing, marked');
          marked++;
        }
      }
    }

    return marked;
  }

  private async generateThumbnail(videoId: string, videoPath: string): Promise<string | null> {
    try {
      const dataPath = process.env.DATA_PATH || '/app/data';
      const thumbnailsDir = path.join(dataPath, 'video-thumbnails');

      await fs.mkdir(thumbnailsDir, { recursive: true });

      const outputPath = path.join(thumbnailsDir, `${videoId}.jpg`);
      const ffmpeg = getFfmpegPath();

      await execFileAsync(
        ffmpeg,
        [
          '-ss',
          '2', // Seek to 2 seconds
          '-i',
          videoPath,
          '-frames:v',
          '1', // Extract 1 frame
          '-q:v',
          '5', // JPEG quality (2-31, lower = better)
          '-vf',
          'scale=480:-2', // Scale to 480px wide, keep aspect ratio
          '-y', // Overwrite
          outputPath,
        ],
        { timeout: 15000 }
      );

      return outputPath;
    } catch (error) {
      this.logger.warn({ error, videoId }, 'Failed to generate video thumbnail');
      return null;
    }
  }

  private async matchVideoToTrack(
    videoPath: string,
    videoTitle: string | null,
    videoArtist: string | null
  ): Promise<{ trackId: string; method: 'filename' | 'metadata' } | null> {
    const directory = path.dirname(videoPath);
    const parentDirectory = path.dirname(directory);
    const baseName = path.basename(videoPath, path.extname(videoPath));

    // Strategy 1: Same directory, same base filename
    const filenameMatch = await this.videoRepository.findTrackByBaseName(directory, baseName);
    if (filenameMatch) {
      return { trackId: filenameMatch.id, method: 'filename' };
    }

    // Strategy 2: Parent directory, same base filename (for videos/ subdirectory pattern)
    if (parentDirectory !== directory) {
      const parentMatch = await this.videoRepository.findTrackByBaseName(parentDirectory, baseName);
      if (parentMatch) {
        return { trackId: parentMatch.id, method: 'filename' };
      }
    }

    // Strategy 3: Extract track name from "Artist - Title" filename pattern
    const dashParts = baseName.split(' - ');
    if (dashParts.length >= 2) {
      const possibleTitle = dashParts.slice(1).join(' - ').trim();
      const possibleArtist = dashParts[0].trim();
      if (possibleTitle && possibleArtist) {
        const nameMatch = await this.videoRepository.findTrackByTitleArtist(
          possibleTitle,
          possibleArtist
        );
        if (nameMatch) {
          return { trackId: nameMatch.id, method: 'filename' };
        }
      }
    }

    // Strategy 4: Match by title + artist from video metadata tags
    if (videoTitle && videoArtist) {
      const metadataMatch = await this.videoRepository.findTrackByTitleArtist(
        videoTitle,
        videoArtist
      );
      if (metadataMatch) {
        return { trackId: metadataMatch.id, method: 'metadata' };
      }
    }

    return null;
  }
}
