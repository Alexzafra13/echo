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

// FFT library for STFT computation
// eslint-disable-next-line @typescript-eslint/no-var-requires
const FFT = require('fft.js');

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

  // STFT parameters for htdemucs model
  // These values are from the original Demucs model
  private readonly N_FFT = 4096;
  private readonly HOP_LENGTH = 1024; // N_FFT / 4
  private readonly WIN_LENGTH = 4096;

  // FFT instance (created lazily)
  private fft: InstanceType<typeof FFT> | null = null;
  private hannWindow: Float32Array | null = null;

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

      // Check for external data file (required for large models)
      const externalDataPath = this.modelPath + '.data';
      const hasExternalData = fs.existsSync(externalDataPath);
      this.logger.info(
        { modelPath: this.modelPath, hasExternalData, externalDataPath },
        'Checking model files...',
      );

      if (!hasExternalData) {
        this.logger.warn(
          { externalDataPath },
          'External data file not found. Model may not load correctly.',
        );
      }

      // Dynamic import for onnxruntime-node
      this.ort = await import('onnxruntime-node');

      this.logger.info({ modelPath: this.modelPath }, 'Loading ONNX model...');

      // Create inference session with optimizations
      // For models with external data, ONNX Runtime looks in the same directory
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
          inputCount: this.session.inputNames.length,
          outputCount: this.session.outputNames.length,
        },
        'ONNX model loaded successfully',
      );

      // Validate model has expected structure
      if (this.session.inputNames.length === 0) {
        throw new Error('Model has no inputs defined - possible loading error');
      }
      if (this.session.outputNames.length === 0) {
        throw new Error('Model has no outputs defined - possible loading error');
      }

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
   *
   * The htdemucs ONNX model requires two inputs:
   * - 'mix': Time-domain waveform [batch, channels, samples]
   * - 'x': STFT spectrogram [batch, channels, freq_bins, time_frames, 2]
   *
   * The model outputs the separated stems in STFT domain which we convert back
   * to time domain using ISTFT.
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

    const inputNames = this.session.inputNames;
    const hasTwoInputs = inputNames.length >= 2;

    this.logger.debug(
      { inputNames, hasTwoInputs },
      'Model input configuration',
    );

    // Prepare feeds based on model requirements
    const feeds: Record<string, import('onnxruntime-node').Tensor> = {};

    // Find the input names for mix and x (spectrogram)
    // The model typically has inputs named 'mix' and 'x'
    const mixInputName = inputNames.find(n => n === 'mix') || inputNames[0];
    const stftInputName = inputNames.find(n => n === 'x') || inputNames[1];

    // Create mix tensor [1, channels, samples]
    // For the model, we need to reshape from interleaved [L,R,L,R,...] to [channels, samples]
    const numSamples = chunkData.length / this.CHANNELS;
    const mixData = new Float32Array(this.CHANNELS * numSamples);

    // Deinterleave for the model: [channels, samples] layout
    for (let i = 0; i < numSamples; i++) {
      mixData[i] = chunkData[i * 2];                   // Left channel
      mixData[numSamples + i] = chunkData[i * 2 + 1];  // Right channel
    }

    const mixTensor = new this.ort.Tensor(
      'float32',
      mixData,
      [1, this.CHANNELS, numSamples],
    );
    feeds[mixInputName] = mixTensor;

    // If model requires STFT input (has two inputs), compute and provide it
    if (hasTwoInputs && stftInputName) {
      const stftInput = this.prepareSTFTInput(chunkData);

      this.logger.debug(
        { stftShape: stftInput.shape, stftInputName },
        'Prepared STFT input',
      );

      const stftTensor = new this.ort.Tensor(
        'float32',
        stftInput.data,
        stftInput.shape,
      );
      feeds[stftInputName] = stftTensor;
    }

    this.logger.debug(
      {
        feedKeys: Object.keys(feeds),
        mixShape: [1, this.CHANNELS, numSamples],
      },
      'Running inference',
    );

    // Run inference
    const results = await this.session.run(feeds);

    // Get output tensor
    const outputTensor = results[this.session.outputNames[0]];
    const outputData = outputTensor.data as Float32Array;
    const outputShape = outputTensor.dims as number[];

    this.logger.debug(
      { outputShape, outputSize: outputData.length },
      'Model output received',
    );

    // Determine if output is in time domain or frequency domain based on shape
    // Time domain: [batch, sources, channels, samples]
    // Frequency domain: [batch, sources, channels, freq_bins, time_frames, 2]
    const isFrequencyDomain = outputShape.length >= 5;

    if (isFrequencyDomain) {
      // Output is in STFT domain, need to apply ISTFT
      return this.processFrequencyDomainOutput(outputData, outputShape, numSamples);
    } else {
      // Output is already in time domain
      return this.processTimeDomainOutput(outputData, outputShape, numSamples);
    }
  }

  /**
   * Process time-domain model output
   */
  private processTimeDomainOutput(
    outputData: Float32Array,
    outputShape: number[],
    numSamples: number,
  ): {
    vocals: Float32Array;
    drums: Float32Array;
    bass: Float32Array;
    other: Float32Array;
  } {
    // Initialize output arrays
    const vocals = new Float32Array(numSamples * this.CHANNELS);
    const drums = new Float32Array(numSamples * this.CHANNELS);
    const bass = new Float32Array(numSamples * this.CHANNELS);
    const other = new Float32Array(numSamples * this.CHANNELS);

    // Output layout: [batch, source, channel, sample]
    // Sources: 0=drums, 1=bass, 2=other, 3=vocals
    const numSources = outputShape[1] || 4;
    const numChannels = outputShape[2] || this.CHANNELS;
    const samplesInOutput = outputShape[3] || numSamples;

    for (let i = 0; i < Math.min(samplesInOutput, numSamples); i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const outIdx = i * this.CHANNELS + ch;
        const srcBase = ch * samplesInOutput + i;

        drums[outIdx] = outputData[0 * numChannels * samplesInOutput + srcBase] || 0;
        bass[outIdx] = outputData[1 * numChannels * samplesInOutput + srcBase] || 0;
        other[outIdx] = outputData[2 * numChannels * samplesInOutput + srcBase] || 0;
        vocals[outIdx] = outputData[3 * numChannels * samplesInOutput + srcBase] || 0;
      }
    }

    return { vocals, drums, bass, other };
  }

  /**
   * Process frequency-domain (STFT) model output
   * Applies ISTFT to convert back to time domain
   */
  private processFrequencyDomainOutput(
    outputData: Float32Array,
    outputShape: number[],
    numSamples: number,
  ): {
    vocals: Float32Array;
    drums: Float32Array;
    bass: Float32Array;
    other: Float32Array;
  } {
    // Output shape: [batch, sources, channels, freq_bins, time_frames, 2]
    const numSources = outputShape[1] || 4;
    const numChannels = outputShape[2] || this.CHANNELS;
    const numBins = outputShape[3] || (this.N_FFT / 2 + 1);
    const numFrames = outputShape[4] || Math.floor((numSamples - this.N_FFT) / this.HOP_LENGTH) + 1;

    this.logger.debug(
      { numSources, numChannels, numBins, numFrames, numSamples },
      'Processing frequency domain output with ISTFT',
    );

    // Source indices: 0=drums, 1=bass, 2=other, 3=vocals
    const drums = this.reconstructFromSTFT(outputData, 0, numBins, numFrames, numSamples);
    const bass = this.reconstructFromSTFT(outputData, 1, numBins, numFrames, numSamples);
    const other = this.reconstructFromSTFT(outputData, 2, numBins, numFrames, numSamples);
    const vocals = this.reconstructFromSTFT(outputData, 3, numBins, numFrames, numSamples);

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

  /**
   * Initialize FFT and Hann window for STFT computation
   */
  private initializeFFT(): void {
    if (this.fft && this.hannWindow) return;

    // Create FFT instance
    this.fft = new FFT(this.N_FFT);

    // Create Hann window
    this.hannWindow = new Float32Array(this.WIN_LENGTH);
    for (let i = 0; i < this.WIN_LENGTH; i++) {
      this.hannWindow[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (this.WIN_LENGTH - 1)));
    }

    this.logger.debug(
      { nFft: this.N_FFT, hopLength: this.HOP_LENGTH, winLength: this.WIN_LENGTH },
      'FFT initialized for STFT',
    );
  }

  /**
   * Compute Short-Time Fourier Transform (STFT) for a single channel
   * Returns complex spectrogram in format [freq_bins, time_frames, 2]
   * where the last dimension is [real, imaginary]
   *
   * @param samples - Audio samples for one channel
   * @returns Complex spectrogram as Float32Array
   */
  private computeSTFT(samples: Float32Array): {
    data: Float32Array;
    numFrames: number;
    numBins: number;
  } {
    this.initializeFFT();

    if (!this.fft || !this.hannWindow) {
      throw new Error('FFT not initialized');
    }

    const numSamples = samples.length;
    const numFrames = Math.floor((numSamples - this.N_FFT) / this.HOP_LENGTH) + 1;
    const numBins = this.N_FFT / 2 + 1; // Only positive frequencies

    // Output: [freq_bins, time_frames, 2] for real and imaginary
    const stftData = new Float32Array(numBins * numFrames * 2);

    // Temporary buffers for FFT
    const windowed = new Float32Array(this.N_FFT);
    const fftOut = this.fft.createComplexArray();

    for (let frame = 0; frame < numFrames; frame++) {
      const start = frame * this.HOP_LENGTH;

      // Apply window
      for (let i = 0; i < this.N_FFT; i++) {
        const sampleIdx = start + i;
        windowed[i] = sampleIdx < numSamples
          ? samples[sampleIdx] * this.hannWindow[i]
          : 0;
      }

      // Perform FFT - fft.js uses interleaved complex format [re, im, re, im, ...]
      const fftIn = this.fft.toComplexArray(windowed, null);
      this.fft.transform(fftOut, fftIn);

      // Extract positive frequencies and store in output
      for (let bin = 0; bin < numBins; bin++) {
        // Output layout: [bin, frame, complex] where complex has 2 elements
        const outIdx = (bin * numFrames + frame) * 2;
        stftData[outIdx] = fftOut[bin * 2];     // Real
        stftData[outIdx + 1] = fftOut[bin * 2 + 1]; // Imaginary
      }
    }

    return { data: stftData, numFrames, numBins };
  }

  /**
   * Compute Inverse Short-Time Fourier Transform (ISTFT)
   * Reconstructs audio from complex spectrogram
   *
   * @param stftData - Complex spectrogram [freq_bins, time_frames, 2]
   * @param numFrames - Number of time frames
   * @param numBins - Number of frequency bins
   * @param outputLength - Expected output length in samples
   * @returns Reconstructed audio samples
   */
  private computeISTFT(
    stftData: Float32Array,
    numFrames: number,
    numBins: number,
    outputLength: number,
  ): Float32Array {
    this.initializeFFT();

    if (!this.fft || !this.hannWindow) {
      throw new Error('FFT not initialized');
    }

    const output = new Float32Array(outputLength);
    const windowSum = new Float32Array(outputLength);

    // Temporary buffers
    const fftIn = this.fft.createComplexArray();
    const ifftOut = this.fft.createComplexArray();

    for (let frame = 0; frame < numFrames; frame++) {
      // Build full spectrum (with conjugate symmetry)
      for (let i = 0; i < this.N_FFT; i++) {
        fftIn[i * 2] = 0;
        fftIn[i * 2 + 1] = 0;
      }

      // Copy positive frequencies
      for (let bin = 0; bin < numBins; bin++) {
        const inIdx = (bin * numFrames + frame) * 2;
        fftIn[bin * 2] = stftData[inIdx];     // Real
        fftIn[bin * 2 + 1] = stftData[inIdx + 1]; // Imaginary
      }

      // Add conjugate symmetry for negative frequencies
      for (let bin = 1; bin < numBins - 1; bin++) {
        const conjugateBin = this.N_FFT - bin;
        const inIdx = (bin * numFrames + frame) * 2;
        fftIn[conjugateBin * 2] = stftData[inIdx];       // Real (same)
        fftIn[conjugateBin * 2 + 1] = -stftData[inIdx + 1]; // Imaginary (negated)
      }

      // Perform inverse FFT
      this.fft.inverseTransform(ifftOut, fftIn);

      // Apply window and overlap-add
      const start = frame * this.HOP_LENGTH;
      for (let i = 0; i < this.N_FFT && start + i < outputLength; i++) {
        // fft.js inverse returns complex array, take real part
        const sample = ifftOut[i * 2] * this.hannWindow[i];
        output[start + i] += sample;
        windowSum[start + i] += this.hannWindow[i] * this.hannWindow[i];
      }
    }

    // Normalize by window sum (overlap-add normalization)
    for (let i = 0; i < outputLength; i++) {
      if (windowSum[i] > 1e-8) {
        output[i] /= windowSum[i];
      }
    }

    return output;
  }

  /**
   * Prepare STFT tensor for the model
   * Input format for htdemucs: [batch, channels, freq_bins, time_frames, 2]
   *
   * @param audioData - Interleaved stereo audio [L, R, L, R, ...]
   * @returns STFT tensor data and dimensions
   */
  private prepareSTFTInput(audioData: Float32Array): {
    data: Float32Array;
    shape: number[];
  } {
    // Deinterleave stereo audio
    const numSamples = audioData.length / this.CHANNELS;
    const leftChannel = new Float32Array(numSamples);
    const rightChannel = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      leftChannel[i] = audioData[i * 2];
      rightChannel[i] = audioData[i * 2 + 1];
    }

    // Compute STFT for each channel
    const leftSTFT = this.computeSTFT(leftChannel);
    const rightSTFT = this.computeSTFT(rightChannel);

    const numFrames = leftSTFT.numFrames;
    const numBins = leftSTFT.numBins;

    // Combine into tensor [1, 2, freq_bins, time_frames, 2]
    // Layout: batch * channels * bins * frames * complex
    const tensorSize = 1 * this.CHANNELS * numBins * numFrames * 2;
    const tensorData = new Float32Array(tensorSize);

    // Copy left channel STFT
    for (let bin = 0; bin < numBins; bin++) {
      for (let frame = 0; frame < numFrames; frame++) {
        const srcIdx = (bin * numFrames + frame) * 2;
        const dstIdx = ((0 * numBins + bin) * numFrames + frame) * 2;
        tensorData[dstIdx] = leftSTFT.data[srcIdx];
        tensorData[dstIdx + 1] = leftSTFT.data[srcIdx + 1];
      }
    }

    // Copy right channel STFT
    for (let bin = 0; bin < numBins; bin++) {
      for (let frame = 0; frame < numFrames; frame++) {
        const srcIdx = (bin * numFrames + frame) * 2;
        const dstIdx = ((1 * numBins + bin) * numFrames + frame) * 2;
        tensorData[dstIdx] = rightSTFT.data[srcIdx];
        tensorData[dstIdx + 1] = rightSTFT.data[srcIdx + 1];
      }
    }

    return {
      data: tensorData,
      shape: [1, this.CHANNELS, numBins, numFrames, 2],
    };
  }

  /**
   * Reconstruct audio from model output STFT
   * Output format from htdemucs: [batch, sources, channels, freq_bins, time_frames, 2]
   *
   * @param stftData - Model output STFT tensor
   * @param sourceIdx - Which source to extract (0=drums, 1=bass, 2=other, 3=vocals)
   * @param numBins - Number of frequency bins
   * @param numFrames - Number of time frames
   * @param outputLength - Expected output length per channel
   * @returns Interleaved stereo audio
   */
  private reconstructFromSTFT(
    stftData: Float32Array,
    sourceIdx: number,
    numBins: number,
    numFrames: number,
    outputLength: number,
  ): Float32Array {
    // Extract STFT for each channel of this source
    const leftSTFT = new Float32Array(numBins * numFrames * 2);
    const rightSTFT = new Float32Array(numBins * numFrames * 2);

    // Model output layout: [batch, sources, channels, bins, frames, complex]
    const sourcesPerBatch = 4;
    const channelsPerSource = this.CHANNELS;

    for (let bin = 0; bin < numBins; bin++) {
      for (let frame = 0; frame < numFrames; frame++) {
        const dstIdx = (bin * numFrames + frame) * 2;

        // Left channel index in flattened array
        const leftSrcIdx = (((sourceIdx * channelsPerSource + 0) * numBins + bin) * numFrames + frame) * 2;
        leftSTFT[dstIdx] = stftData[leftSrcIdx];
        leftSTFT[dstIdx + 1] = stftData[leftSrcIdx + 1];

        // Right channel index
        const rightSrcIdx = (((sourceIdx * channelsPerSource + 1) * numBins + bin) * numFrames + frame) * 2;
        rightSTFT[dstIdx] = stftData[rightSrcIdx];
        rightSTFT[dstIdx + 1] = stftData[rightSrcIdx + 1];
      }
    }

    // Apply ISTFT to each channel
    const leftAudio = this.computeISTFT(leftSTFT, numFrames, numBins, outputLength);
    const rightAudio = this.computeISTFT(rightSTFT, numFrames, numBins, outputLength);

    // Interleave stereo output
    const output = new Float32Array(outputLength * this.CHANNELS);
    for (let i = 0; i < outputLength; i++) {
      output[i * 2] = leftAudio[i];
      output[i * 2 + 1] = rightAudio[i];
    }

    return output;
  }
}
