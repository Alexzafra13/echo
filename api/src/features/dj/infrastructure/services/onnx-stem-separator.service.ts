import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import {
  IStemSeparator,
  StemSeparationResult,
  StemSeparationOptions,
} from '../../domain/ports/stem-separator.port';
import { getFfmpegPath } from '../utils/ffmpeg.util';

/**
 * OnnxStemSeparatorService - Stem separation using ONNX Runtime
 *
 * Uses Demucs model converted to ONNX format for cross-platform
 * stem separation without Python dependency.
 *
 * Model: htdemucs.onnx (~171MB)
 * - Downloaded automatically via postinstall
 * - Supports 4 stems: vocals, drums, bass, other
 * - Sample rate: 44100 Hz
 * - Channels: Stereo (2)
 */
@Injectable()
export class OnnxStemSeparatorService implements IStemSeparator, OnModuleInit {
  private ort: typeof import('onnxruntime-node') | null = null;
  private session: import('onnxruntime-node').InferenceSession | null = null;
  private isInitialized = false;
  private initError: string | null = null;
  private modelPath: string;
  private stemsDir: string;

  // Model constants
  private readonly SAMPLE_RATE = 44100;
  private readonly CHANNELS = 2;
  private readonly CHUNK_SIZE = 44100 * 10; // 10 seconds per chunk
  private readonly OVERLAP = 44100 * 1; // 1 second overlap

  constructor(
    @InjectPinoLogger(OnnxStemSeparatorService.name)
    private readonly logger: PinoLogger,
    private readonly configService: ConfigService,
  ) {
    // Model path - matches download-models.ts output
    this.modelPath = this.configService.get<string>(
      'DJ_MODEL_PATH',
      path.join(process.cwd(), 'models', 'htdemucs.onnx'),
    );
    this.stemsDir = this.configService.get<string>(
      'DJ_STEMS_DIR',
      path.join(process.cwd(), 'data', 'stems'),
    );
  }

  async onModuleInit(): Promise<void> {
    await this.initializeSeparator();
  }

  private async initializeSeparator(): Promise<void> {
    try {
      // Check if model file exists
      if (!fs.existsSync(this.modelPath)) {
        this.logger.warn(
          { modelPath: this.modelPath },
          'ONNX model not found. Run "pnpm download:models" to download.',
        );
        this.initError = 'Model file not found';
        return;
      }

      // Dynamic import for onnxruntime-node
      this.ort = await import('onnxruntime-node');

      this.logger.info({ modelPath: this.modelPath }, 'Loading ONNX model...');

      // Create inference session with optimizations
      this.session = await this.ort.InferenceSession.create(this.modelPath, {
        executionProviders: ['cpu'],
        graphOptimizationLevel: 'all',
        enableCpuMemArena: true,
        enableMemPattern: true,
      });

      // Log model info
      this.logger.info(
        {
          inputs: this.session.inputNames,
          outputs: this.session.outputNames,
        },
        'ONNX model loaded successfully',
      );

      this.isInitialized = true;
    } catch (error) {
      this.initError = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        { error: this.initError },
        'Failed to initialize ONNX stem separator',
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    return this.isInitialized && this.session !== null;
  }

  getName(): string {
    return this.isInitialized ? 'demucs-onnx' : 'none';
  }

  getError(): string | null {
    return this.initError;
  }

  estimateProcessingTime(durationSeconds: number): number {
    // ~2-3x realtime on modern CPU
    return durationSeconds * 2.5;
  }

  async separate(
    inputPath: string,
    options: StemSeparationOptions,
  ): Promise<StemSeparationResult> {
    if (!this.isInitialized || !this.session || !this.ort) {
      throw new Error(`Stem separator not available: ${this.initError || 'Not initialized'}`);
    }

    const outputDir = path.join(options.outputDir, options.trackId);
    fs.mkdirSync(outputDir, { recursive: true });

    this.logger.info({ inputPath, outputDir, trackId: options.trackId }, 'Starting stem separation');

    try {
      // Step 1: Convert input to raw PCM using FFmpeg
      const audioData = await this.loadAudioAsPCM(inputPath);

      // Step 2: Process through model
      const stems = await this.processAudio(audioData);

      // Step 3: Save stems as WAV files
      const stemPaths = await this.saveStems(stems, outputDir);

      // Calculate total size
      let totalSize = 0;
      for (const stemPath of Object.values(stemPaths)) {
        if (fs.existsSync(stemPath)) {
          totalSize += fs.statSync(stemPath).size;
        }
      }

      this.logger.info(
        { trackId: options.trackId, totalSizeMB: (totalSize / 1024 / 1024).toFixed(1) },
        'Stem separation completed',
      );

      return {
        vocalsPath: stemPaths.vocals,
        drumsPath: stemPaths.drums,
        bassPath: stemPaths.bass,
        otherPath: stemPaths.other,
        totalSizeBytes: totalSize,
        modelUsed: 'demucs-onnx',
      };
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : 'Unknown', inputPath },
        'Stem separation failed',
      );
      throw error;
    }
  }

  /**
   * Load audio file as raw PCM float32 samples
   */
  private async loadAudioAsPCM(inputPath: string): Promise<Float32Array> {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileAsync = promisify(execFile);

    // Use FFmpeg to decode audio to raw PCM
    const tempPcm = path.join(this.stemsDir, `temp_${Date.now()}.pcm`);
    fs.mkdirSync(this.stemsDir, { recursive: true });

    try {
      await execFileAsync(getFfmpegPath(), [
        '-i', inputPath,
        '-f', 'f32le',        // 32-bit float little-endian
        '-acodec', 'pcm_f32le',
        '-ac', String(this.CHANNELS),
        '-ar', String(this.SAMPLE_RATE),
        '-y',
        tempPcm,
      ], { maxBuffer: 1024 * 1024 * 100 }); // 100MB buffer

      // Read PCM data
      const buffer = fs.readFileSync(tempPcm);
      const audioData = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.length / 4);

      this.logger.debug(
        { samples: audioData.length, durationSec: audioData.length / this.SAMPLE_RATE / this.CHANNELS },
        'Audio loaded',
      );

      return audioData;
    } finally {
      // Cleanup temp file
      if (fs.existsSync(tempPcm)) {
        fs.unlinkSync(tempPcm);
      }
    }
  }

  /**
   * Process audio through the ONNX model
   * Returns separated stems as Float32Arrays
   */
  private async processAudio(audioData: Float32Array): Promise<{
    vocals: Float32Array;
    drums: Float32Array;
    bass: Float32Array;
    other: Float32Array;
  }> {
    if (!this.session || !this.ort) {
      throw new Error('ONNX session not initialized');
    }

    const numSamples = audioData.length / this.CHANNELS;

    // Initialize output arrays
    const vocals = new Float32Array(audioData.length);
    const drums = new Float32Array(audioData.length);
    const bass = new Float32Array(audioData.length);
    const other = new Float32Array(audioData.length);

    // Process in chunks with overlap
    const numChunks = Math.ceil(numSamples / (this.CHUNK_SIZE - this.OVERLAP));

    this.logger.debug({ numChunks, numSamples }, 'Processing audio in chunks');

    for (let chunkIdx = 0; chunkIdx < numChunks; chunkIdx++) {
      const startSample = chunkIdx * (this.CHUNK_SIZE - this.OVERLAP);
      const endSample = Math.min(startSample + this.CHUNK_SIZE, numSamples);
      const chunkSamples = endSample - startSample;

      // Extract chunk (interleaved stereo)
      const chunkData = audioData.slice(
        startSample * this.CHANNELS,
        endSample * this.CHANNELS,
      );

      // Pad if necessary
      let inputData: Float32Array;
      if (chunkData.length < this.CHUNK_SIZE * this.CHANNELS) {
        inputData = new Float32Array(this.CHUNK_SIZE * this.CHANNELS);
        inputData.set(chunkData);
      } else {
        inputData = chunkData;
      }

      // Reshape to [1, channels, samples] for the model
      // Model expects: batch=1, channels=2, samples
      const inputTensor = new this.ort.Tensor(
        'float32',
        inputData,
        [1, this.CHANNELS, this.CHUNK_SIZE],
      );

      // Run inference
      const feeds: Record<string, import('onnxruntime-node').Tensor> = {};
      feeds[this.session.inputNames[0]] = inputTensor;

      const results = await this.session.run(feeds);

      // Get output tensor - shape should be [1, 4, 2, samples]
      // 4 sources: drums, bass, other, vocals
      const outputTensor = results[this.session.outputNames[0]];
      const outputData = outputTensor.data as Float32Array;

      // Copy results back with overlap handling
      const copyStart = chunkIdx === 0 ? 0 : this.OVERLAP;
      const copyEnd = chunkSamples;

      for (let i = copyStart; i < copyEnd; i++) {
        const outIdx = (startSample + i) * this.CHANNELS;
        const srcIdx = i * this.CHANNELS;

        // Output layout: [batch, source, channel, sample]
        // Sources: 0=drums, 1=bass, 2=other, 3=vocals
        const samplesPerSource = this.CHUNK_SIZE;
        const channelsPerSource = this.CHANNELS;

        for (let ch = 0; ch < this.CHANNELS; ch++) {
          if (outIdx + ch < drums.length) {
            drums[outIdx + ch] = outputData[0 * channelsPerSource * samplesPerSource + ch * samplesPerSource + i] || 0;
            bass[outIdx + ch] = outputData[1 * channelsPerSource * samplesPerSource + ch * samplesPerSource + i] || 0;
            other[outIdx + ch] = outputData[2 * channelsPerSource * samplesPerSource + ch * samplesPerSource + i] || 0;
            vocals[outIdx + ch] = outputData[3 * channelsPerSource * samplesPerSource + ch * samplesPerSource + i] || 0;
          }
        }
      }

      if ((chunkIdx + 1) % 10 === 0 || chunkIdx === numChunks - 1) {
        this.logger.debug(
          { progress: Math.round(((chunkIdx + 1) / numChunks) * 100) },
          'Stem separation progress',
        );
      }
    }

    return { vocals, drums, bass, other };
  }

  /**
   * Save stems as WAV files using FFmpeg
   */
  private async saveStems(
    stems: { vocals: Float32Array; drums: Float32Array; bass: Float32Array; other: Float32Array },
    outputDir: string,
  ): Promise<{ vocals: string; drums: string; bass: string; other: string }> {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileAsync = promisify(execFile);

    const stemPaths = {
      vocals: path.join(outputDir, 'vocals.wav'),
      drums: path.join(outputDir, 'drums.wav'),
      bass: path.join(outputDir, 'bass.wav'),
      other: path.join(outputDir, 'other.wav'),
    };

    for (const [name, data] of Object.entries(stems)) {
      const tempPcm = path.join(outputDir, `${name}_temp.pcm`);
      const outputPath = stemPaths[name as keyof typeof stemPaths];

      try {
        // Write raw PCM
        const buffer = Buffer.from(data.buffer);
        fs.writeFileSync(tempPcm, buffer);

        // Convert to WAV using FFmpeg
        await execFileAsync(getFfmpegPath(), [
          '-f', 'f32le',
          '-ar', String(this.SAMPLE_RATE),
          '-ac', String(this.CHANNELS),
          '-i', tempPcm,
          '-c:a', 'pcm_s16le',  // 16-bit WAV
          '-y',
          outputPath,
        ]);
      } finally {
        if (fs.existsSync(tempPcm)) {
          fs.unlinkSync(tempPcm);
        }
      }
    }

    return stemPaths;
  }
}
