import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  IAudioAnalyzer,
  AudioAnalysisResult,
} from '../../domain/ports/audio-analyzer.port';
import { getFfmpegPath, getFfprobePath } from '../utils/ffmpeg.util';

/**
 * EssentiaAnalyzerService - Audio analysis using FFmpeg
 *
 * NOTE: Essentia.js has been disabled because its WASM module outputs
 * raw audio data to stdout which cannot be suppressed in Node.js.
 * Using FFmpeg for basic energy analysis. Full BPM/Key detection
 * requires a different solution (e.g., external service or aubio).
 */
@Injectable()
export class EssentiaAnalyzerService implements IAudioAnalyzer {
  constructor(
    @InjectPinoLogger(EssentiaAnalyzerService.name)
    private readonly logger: PinoLogger,
  ) {
    this.logger.info('DJ Analysis service initialized (FFmpeg backend)');
  }

  async isAvailable(): Promise<boolean> {
    // Always use FFmpeg backend
    return false;
  }

  getName(): string {
    return 'ffmpeg';
  }

  async analyze(filePath: string): Promise<AudioAnalysisResult> {
    return this.analyzeWithFfmpeg(filePath);
  }

  private async analyzeWithFfmpeg(filePath: string): Promise<AudioAnalysisResult> {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileAsync = promisify(execFile);

    this.logger.debug({ filePath }, 'Analyzing audio with FFmpeg');

    try {
      // Get audio info with FFprobe
      const { stdout } = await execFileAsync(getFfprobePath(), [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_streams',
        '-show_format',
        filePath,
      ]);

      const info = JSON.parse(stdout);
      const _duration = parseFloat(info.format?.duration || '0');

      // Basic energy analysis using loudness
      const { stderr: loudnessOutput } = await execFileAsync(getFfmpegPath(), [
        '-i', filePath,
        '-af', 'volumedetect',
        '-f', 'null',
        '-',
      ], { timeout: 60000 });

      // Parse mean volume for energy estimate
      const meanVolumeMatch = loudnessOutput.match(/mean_volume:\s*(-?\d+\.?\d*)/);
      const meanVolume = meanVolumeMatch ? parseFloat(meanVolumeMatch[1]) : -20;

      // Convert dB to 0-1 scale (roughly: -60dB = 0, 0dB = 1)
      const energy = Math.min(1, Math.max(0, (meanVolume + 60) / 60));

      // FFmpeg cannot detect BPM/Key - would need aubio or external service
      return {
        bpm: 0,
        key: 'Unknown',
        energy,
        danceability: undefined,
        beatgrid: undefined,
      };
    } catch (error) {
      this.logger.error({ error, filePath }, 'FFmpeg analysis failed');
      throw error;
    }
  }
}
