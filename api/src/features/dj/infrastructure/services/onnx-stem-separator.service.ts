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
import { getFfmpegPath, getAudioDuration, runFfmpeg, runFfmpegWithOutput } from '../utils/ffmpeg.util';
import { DJ_CONFIG } from '../../config/dj.config';

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

  // Use centralized config
  private readonly SAMPLE_RATE = DJ_CONFIG.stems.sampleRate;
  private readonly CHANNELS = DJ_CONFIG.stems.channels;
  private readonly CHUNK_SIZE = DJ_CONFIG.stems.chunkSize;
  private readonly OVERLAP = DJ_CONFIG.stems.overlap;

  constructor(
    @InjectPinoLogger(OnnxStemSeparatorService.name)
    private readonly logger: PinoLogger,
    private readonly configService: ConfigService,
  ) {
    // Model path - matches download-models.ts output
    this.modelPath = this.configService.get<string>(
      DJ_CONFIG.envVars.modelPath,
      path.join(process.cwd(), 'models', 'htdemucs.onnx'),
    );
    this.stemsDir = this.configService.get<string>(
      DJ_CONFIG.envVars.stemsDir,
      path.join(process.cwd(), 'data', DJ_CONFIG.directories.stems),
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
      // Use streaming approach to minimize memory usage
      // Process audio chunk by chunk, writing output incrementally
      const stemPaths = await this.processAudioStreaming(inputPath, outputDir);

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
   * Process audio in streaming fashion to minimize memory usage
   * Reads input in chunks, processes through model, writes output incrementally
   *
   * Memory usage: ~50MB per chunk instead of entire file
   */
  private async processAudioStreaming(
    inputPath: string,
    outputDir: string,
  ): Promise<{ vocals: string; drums: string; bass: string; other: string }> {
    const { spawn } = await import('child_process');

    if (!this.session || !this.ort) {
      throw new Error('ONNX session not initialized');
    }

    // Get audio duration first
    const duration = await getAudioDuration(inputPath);
    const totalSamples = Math.ceil(duration * this.SAMPLE_RATE);
    const numChunks = Math.ceil(totalSamples / (this.CHUNK_SIZE - this.OVERLAP));

    this.logger.debug(
      { duration, totalSamples, numChunks },
      'Starting streaming stem separation',
    );

    // Create temp PCM files for output stems (append mode)
    const tempFiles = {
      vocals: path.join(outputDir, 'vocals_temp.pcm'),
      drums: path.join(outputDir, 'drums_temp.pcm'),
      bass: path.join(outputDir, 'bass_temp.pcm'),
      other: path.join(outputDir, 'other_temp.pcm'),
    };

    // Initialize empty files
    for (const file of Object.values(tempFiles)) {
      fs.writeFileSync(file, Buffer.alloc(0));
    }

    // Process each chunk
    for (let chunkIdx = 0; chunkIdx < numChunks; chunkIdx++) {
      const startSample = chunkIdx * (this.CHUNK_SIZE - this.OVERLAP);
      const startTime = startSample / this.SAMPLE_RATE;
      const chunkDuration = this.CHUNK_SIZE / this.SAMPLE_RATE;

      // Read only this chunk from the input file using FFmpeg
      const chunkData = await this.readAudioChunk(inputPath, startTime, chunkDuration);

      // Process chunk through model
      const stemChunks = await this.processChunk(chunkData);

      // Determine which samples to write (handle overlap)
      const writeStart = chunkIdx === 0 ? 0 : this.OVERLAP;
      const actualSamples = Math.min(
        this.CHUNK_SIZE - writeStart,
        totalSamples - startSample - writeStart,
      );

      // Append to output files
      for (const [name, data] of Object.entries(stemChunks)) {
        const sliceStart = writeStart * this.CHANNELS;
        const sliceEnd = sliceStart + actualSamples * this.CHANNELS;
        const writeData = data.slice(sliceStart, sliceEnd);
        const buffer = Buffer.from(writeData.buffer, writeData.byteOffset, writeData.byteLength);
        fs.appendFileSync(tempFiles[name as keyof typeof tempFiles], buffer);
      }

      // Log progress
      if ((chunkIdx + 1) % 5 === 0 || chunkIdx === numChunks - 1) {
        this.logger.debug(
          { progress: Math.round(((chunkIdx + 1) / numChunks) * 100) },
          'Stem separation progress',
        );
      }

      // Allow GC to clean up chunk data
      // @ts-expect-error - explicit null to help GC
      chunkData = null;
    }

    // Convert PCM files to WAV
    const stemPaths = await this.convertPcmToWav(tempFiles, outputDir);

    return stemPaths;
  }

  /**
   * Read a specific chunk of audio
   */
  private async readAudioChunk(
    inputPath: string,
    startTime: number,
    duration: number,
  ): Promise<Float32Array> {
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileAsync = promisify(execFile);

    const expectedSamples = Math.ceil(duration * this.SAMPLE_RATE) * this.CHANNELS;
    const expectedBytes = expectedSamples * 4; // float32 = 4 bytes

    try {
      const { stdout } = await execFileAsync(
        getFfmpegPath(),
        [
          '-ss', String(startTime),
          '-t', String(duration),
          '-i', inputPath,
          '-f', 'f32le',
          '-acodec', 'pcm_f32le',
          '-ac', String(this.CHANNELS),
          '-ar', String(this.SAMPLE_RATE),
          'pipe:1',
        ],
        {
          encoding: 'buffer',
          maxBuffer: expectedBytes + 1024 * 1024, // Add 1MB margin
        },
      );

      // Pad to expected size if needed
      const audioData = new Float32Array(this.CHUNK_SIZE * this.CHANNELS);
      const sourceData = new Float32Array(
        stdout.buffer,
        stdout.byteOffset,
        stdout.length / 4,
      );
      audioData.set(sourceData.slice(0, audioData.length));

      return audioData;
    } catch (error) {
      this.logger.error({ error, startTime, duration }, 'Failed to read audio chunk');
      throw error;
    }
  }

  /**
   * Process a single chunk through the ONNX model
   */
  private async processChunk(chunkData: Float32Array): Promise<{
    vocals: Float32Array;
    drums: Float32Array;
    bass: Float32Array;
    other: Float32Array;
  }> {
    if (!this.session || !this.ort) {
      throw new Error('ONNX session not initialized');
    }

    // Create input tensor [1, channels, samples]
    const inputTensor = new this.ort.Tensor(
      'float32',
      chunkData,
      [1, this.CHANNELS, this.CHUNK_SIZE],
    );

    // Run inference
    const feeds: Record<string, import('onnxruntime-node').Tensor> = {};
    feeds[this.session.inputNames[0]] = inputTensor;

    const results = await this.session.run(feeds);

    // Get output tensor - shape should be [1, 4, 2, samples]
    const outputTensor = results[this.session.outputNames[0]];
    const outputData = outputTensor.data as Float32Array;

    // Initialize output arrays for this chunk only
    const vocals = new Float32Array(this.CHUNK_SIZE * this.CHANNELS);
    const drums = new Float32Array(this.CHUNK_SIZE * this.CHANNELS);
    const bass = new Float32Array(this.CHUNK_SIZE * this.CHANNELS);
    const other = new Float32Array(this.CHUNK_SIZE * this.CHANNELS);

    // Extract stems from output tensor
    // Output layout: [batch, source, channel, sample]
    // Sources: 0=drums, 1=bass, 2=other, 3=vocals
    const samplesPerSource = this.CHUNK_SIZE;

    for (let i = 0; i < this.CHUNK_SIZE; i++) {
      for (let ch = 0; ch < this.CHANNELS; ch++) {
        const outIdx = i * this.CHANNELS + ch;
        drums[outIdx] = outputData[0 * this.CHANNELS * samplesPerSource + ch * samplesPerSource + i] || 0;
        bass[outIdx] = outputData[1 * this.CHANNELS * samplesPerSource + ch * samplesPerSource + i] || 0;
        other[outIdx] = outputData[2 * this.CHANNELS * samplesPerSource + ch * samplesPerSource + i] || 0;
        vocals[outIdx] = outputData[3 * this.CHANNELS * samplesPerSource + ch * samplesPerSource + i] || 0;
      }
    }

    return { vocals, drums, bass, other };
  }

  /**
   * Convert temp PCM files to WAV format
   */
  private async convertPcmToWav(
    tempFiles: { vocals: string; drums: string; bass: string; other: string },
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

    for (const [name, tempFile] of Object.entries(tempFiles)) {
      const outputPath = stemPaths[name as keyof typeof stemPaths];

      try {
        // Convert to WAV using FFmpeg
        await execFileAsync(getFfmpegPath(), [
          '-f', 'f32le',
          '-ar', String(this.SAMPLE_RATE),
          '-ac', String(this.CHANNELS),
          '-i', tempFile,
          '-c:a', 'pcm_s16le', // 16-bit WAV
          '-y',
          outputPath,
        ]);
      } finally {
        // Clean up temp PCM file
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      }
    }

    return stemPaths;
  }
}
