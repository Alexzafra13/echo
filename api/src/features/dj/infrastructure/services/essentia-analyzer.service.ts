import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  IAudioAnalyzer,
  AudioAnalysisResult,
} from '../../domain/ports/audio-analyzer.port';
import { DjAnalysis } from '../../domain/entities/dj-analysis.entity';
import { getFfmpegPath, getFfprobePath } from '../utils/ffmpeg.util';

/**
 * EssentiaAnalyzerService - Audio analysis using Essentia.js
 *
 * Provides BPM, key, energy detection using WebAssembly-based
 * Essentia library. Works on all platforms without Python.
 *
 * Fallback: Uses FFmpeg for basic analysis if Essentia is not available.
 */
@Injectable()
export class EssentiaAnalyzerService implements IAudioAnalyzer {
  private essentia: any = null;
  private essentiaExtractor: any = null;
  private isInitialized = false;
  private initError: string | null = null;

  constructor(
    @InjectPinoLogger(EssentiaAnalyzerService.name)
    private readonly logger: PinoLogger,
  ) {
    this.initializeEssentia();
  }

  private async initializeEssentia(): Promise<void> {
    try {
      // Dynamic import for essentia.js
      const EssentiaModule = await import('essentia.js');

      // Initialize Essentia WASM
      this.essentia = new EssentiaModule.Essentia(EssentiaModule.EssentiaWASM);
      this.essentiaExtractor = new EssentiaModule.EssentiaExtractor(
        EssentiaModule.EssentiaWASM,
      );

      this.isInitialized = true;
      this.logger.info('Essentia.js initialized successfully');
    } catch (error) {
      this.initError = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(
        { error: this.initError },
        'Essentia.js not available, will use FFmpeg fallback',
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    // Wait for initialization if still pending
    if (!this.isInitialized && !this.initError) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    return this.isInitialized;
  }

  getName(): string {
    return this.isInitialized ? 'essentia.js' : 'ffmpeg-fallback';
  }

  async analyze(filePath: string): Promise<AudioAnalysisResult> {
    if (await this.isAvailable()) {
      return this.analyzeWithEssentia(filePath);
    } else {
      return this.analyzeWithFfmpeg(filePath);
    }
  }

  private async analyzeWithEssentia(filePath: string): Promise<AudioAnalysisResult> {
    const fs = await import('fs');
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileAsync = promisify(execFile);
    const path = await import('path');
    const os = await import('os');

    // Convert audio to WAV for Essentia processing
    const tempWav = path.join(os.tmpdir(), `essentia-${Date.now()}.wav`);

    try {
      // Convert to WAV (mono, 44100Hz) using FFmpeg
      await execFileAsync(getFfmpegPath(), [
        '-i', filePath,
        '-ac', '1', // mono
        '-ar', '44100', // 44.1kHz
        '-f', 'wav',
        '-y', // overwrite
        tempWav,
      ]);

      // Read WAV file
      const audioBuffer = fs.readFileSync(tempWav);
      const audioArray = new Float32Array(audioBuffer.buffer);

      // Analyze with Essentia
      const bpmResult = this.essentia.PercivalBpmEstimator(audioArray);
      const keyResult = this.essentia.KeyExtractor(audioArray);
      const energyResult = this.essentia.Energy(audioArray);
      const danceabilityResult = this.essentia.Danceability(audioArray);

      // Detect beats for beatgrid
      const beatsResult = this.essentia.BeatTrackerMultiFeature(audioArray);

      // Convert key to Camelot
      const camelotKey = DjAnalysis.keyToCamelot(
        `${keyResult.key}${keyResult.scale === 'minor' ? 'm' : ''}`,
      );

      return {
        bpm: Math.round(bpmResult.bpm * 10) / 10,
        key: `${keyResult.key}${keyResult.scale === 'minor' ? 'm' : ''}`,
        energy: Math.min(1, Math.max(0, energyResult.energy)),
        danceability: danceabilityResult?.danceability,
        beatgrid: beatsResult?.ticks || [],
      };
    } finally {
      // Cleanup temp file
      try {
        fs.unlinkSync(tempWav);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  private async analyzeWithFfmpeg(filePath: string): Promise<AudioAnalysisResult> {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileAsync = promisify(execFile);

    this.logger.debug({ filePath }, 'Analyzing with FFmpeg fallback');

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

      // For FFmpeg fallback, we can't detect key/BPM accurately
      // Return placeholder values that indicate analysis is incomplete
      return {
        bpm: 0, // Unknown - requires proper analysis
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
