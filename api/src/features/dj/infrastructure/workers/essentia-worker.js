/**
 * Essentia.js Worker - Runs in separate process with suppressed stdout
 *
 * This worker is spawned as a child process to isolate Essentia.js WASM
 * output from the main Node.js process. The parent process redirects
 * this worker's stdout/stderr to /dev/null.
 *
 * Communication is done via IPC (process.send/process.on).
 */

const fs = require('fs');
const path = require('path');

let essentia = null;
let essentiaInitError = null;

async function initEssentia() {
  if (essentia) return true;
  if (essentiaInitError) throw new Error(essentiaInitError);

  try {
    // Use require for CommonJS module (essentia.js uses CommonJS)
    const EssentiaModule = require('essentia.js');

    // Handle both ESM default export and CommonJS exports
    let EssentiaWASM = EssentiaModule.EssentiaWASM || EssentiaModule.default?.EssentiaWASM;
    const Essentia = EssentiaModule.Essentia || EssentiaModule.default?.Essentia;

    if (!EssentiaWASM || !Essentia) {
      throw new Error(`Essentia module not found. Keys: ${Object.keys(EssentiaModule).join(', ')}`);
    }

    // EssentiaWASM may be a factory function that returns a promise (depends on version)
    // Handle both pre-initialized module and factory function patterns
    if (typeof EssentiaWASM === 'function' && !EssentiaWASM.RhythmExtractor2013) {
      try {
        EssentiaWASM = await EssentiaWASM();
      } catch (wasmError) {
        throw new Error(`WASM factory initialization failed: ${wasmError.message || wasmError}`);
      }
    }

    essentia = new Essentia(EssentiaWASM);
    return true;
  } catch (error) {
    essentiaInitError = `Failed to initialize Essentia: ${error.message || error}`;
    throw new Error(essentiaInitError);
  }
}

/**
 * Get audio duration via FFprobe (fast, reads container headers only).
 */
async function getAudioDuration(filePath, ffprobePath) {
  const { execFile } = require('child_process');
  const { promisify } = require('util');
  const execFileAsync = promisify(execFile);
  const ffprobe = ffprobePath || 'ffprobe';

  try {
    const { stdout } = await execFileAsync(
      ffprobe,
      ['-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', filePath],
      { encoding: 'utf8', timeout: 10000 }
    );
    return parseFloat(stdout.trim()) || 0;
  } catch {
    return 0; // Unknown duration — will decode full track as fallback
  }
}

/**
 * Decode audio to mono 44.1kHz float32 PCM.
 * Extracts only a representative segment from the core section (skipping
 * intro/outro) for faster processing. Segment length depends on analysis needs:
 * - 60s for full analysis (BPM + Key + Energy)
 * - 30s for energy-only (when BPM/Key come from ID3 tags)
 */
async function decodeAudio(filePath, ffmpegPath, ffprobePath, segmentLength) {
  const { execFile } = require('child_process');
  const { promisify } = require('util');
  const execFileAsync = promisify(execFile);
  const ffmpeg = ffmpegPath || 'ffmpeg';

  try {
    // Get duration to determine optimal analysis segment
    const duration = await getAudioDuration(filePath, ffprobePath);

    const SEGMENT_LENGTH = segmentLength || 60;
    const ffmpegArgs = [];

    if (duration > SEGMENT_LENGTH + 30) {
      // Long track (>90s): seek to 15% to skip intro, analyze 60s of core
      const seekTo = Math.floor(duration * 0.15);
      ffmpegArgs.push('-ss', String(seekTo)); // -ss before -i = fast keyframe seek
    }

    ffmpegArgs.push('-i', filePath);

    if (duration > SEGMENT_LENGTH) {
      // Cap output to segment length
      ffmpegArgs.push('-t', String(SEGMENT_LENGTH));
    }
    // Short tracks (< SEGMENT_LENGTH): decode full track

    ffmpegArgs.push(
      '-ac', '1',           // mono
      '-ar', '44100',       // 44.1kHz
      '-f', 'f32le',        // 32-bit float little-endian
      '-acodec', 'pcm_f32le',
      'pipe:1',
    );

    const { stdout } = await execFileAsync(
      ffmpeg,
      ffmpegArgs,
      {
        encoding: 'buffer',
        maxBuffer: 20 * 1024 * 1024, // 20MB buffer (60s mono 44.1kHz = ~10.6MB)
        timeout: 30000, // 30s — enough for a 60s segment decode
      }
    );

    if (stdout.length % 4 !== 0) {
      throw new Error(`Invalid PCM buffer length: ${stdout.length} (not divisible by 4)`);
    }

    return new Float32Array(stdout.buffer, stdout.byteOffset, stdout.length / 4);
  } catch (error) {
    throw new Error(`FFmpeg decode failed: ${error.message || error}`);
  }
}

function formatKey(key, scale) {
  if (!key || key === 'Unknown') return 'Unknown';
  const scaleAbbrev = scale === 'minor' ? 'm' : '';
  return `${key}${scaleAbbrev}`;
}

// Handle messages from parent process
process.on('message', async (message) => {
  if (message.type === 'analyze') {
    const requestId = message.requestId; // Track requestId for response correlation
    let audioVector = null;
    try {
      // Send debug info via IPC
      const hints = message.hints || {};
      const energyOnly = hints.bpm > 0 && hints.key && hints.key !== 'Unknown' && hints.key !== '';
      const segmentLength = energyOnly ? 30 : 60; // 30s is enough for energy-only analysis
      process.send({ type: 'debug', step: 'start', filePath: message.filePath, requestId, energyOnly, segmentLength });

      // Step 1: Init Essentia
      process.send({ type: 'debug', step: 'init_essentia' });
      await initEssentia();
      process.send({ type: 'debug', step: 'essentia_ready' });

      // Step 2: Decode audio
      process.send({ type: 'debug', step: 'decode_audio' });
      const audioData = await decodeAudio(message.filePath, message.ffmpegPath, message.ffprobePath, segmentLength);
      process.send({ type: 'debug', step: 'decoded', samples: audioData?.length || 0 });

      if (!audioData || audioData.length === 0) {
        throw new Error('Audio decode produced empty data');
      }

      // Step 3: Convert to vector
      process.send({ type: 'debug', step: 'convert_vector' });
      audioVector = essentia.arrayToVector(audioData);
      // audioData can now be GC'd — we only need audioVector from here
      process.send({ type: 'debug', step: 'vector_ready' });

      // Step 4: Analyze
      process.send({ type: 'debug', step: 'analyze', hasHints: { bpm: !!hints.bpm, key: !!hints.key } });

      // BPM — skip RhythmExtractor2013 if ID3 tag provides BPM (saves ~40-60% of total time)
      let bpm = 0;
      if (hints.bpm > 0) {
        bpm = hints.bpm;
        process.send({ type: 'debug', step: 'bpm_from_hints', bpm });
      } else {
        try {
          const rhythmResult = essentia.RhythmExtractor2013(audioVector);
          bpm = Math.round(rhythmResult.bpm);
          if (bpm < 60 || bpm > 200) {
            if (bpm > 200 && bpm <= 400) bpm = Math.round(bpm / 2);
            else if (bpm < 60 && bpm >= 30) bpm = Math.round(bpm * 2);
            else bpm = 0;
          }
          process.send({ type: 'debug', step: 'bpm_done', bpm });
        } catch (e) {
          process.send({ type: 'debug', step: 'bpm_failed', error: e?.message || String(e) });
          bpm = 0;
        }
      }

      // Key — skip KeyExtractor if ID3 tag provides key
      let key = 'Unknown';
      if (hints.key && hints.key !== 'Unknown' && hints.key !== '') {
        key = hints.key;
        process.send({ type: 'debug', step: 'key_from_hints', key });
      } else {
        try {
          const keyResult = essentia.KeyExtractor(audioVector);
          if (keyResult && keyResult.key && keyResult.key !== '') {
            key = formatKey(keyResult.key, keyResult.scale);
          }
          process.send({ type: 'debug', step: 'key_done', key });
        } catch (e) {
          process.send({ type: 'debug', step: 'key_failed', error: e?.message || String(e) });
          key = 'Unknown';
        }
      }

      // Energy - Spotify-style perceptual energy combining 5 features:
      // 1. Perceived loudness (RMS)
      // 2. Dynamic range (DynamicComplexity)
      // 3. Timbre/brightness (Spectral Centroid)
      // 4. Onset rate (how busy/active the track is)
      // 5. Spectral entropy (general complexity/noise)
      //
      // Normalization ranges are calibrated for typical music to produce
      // well-distributed values across 0-1. A final sigmoid curve enhances
      // contrast to prevent clustering around the mean.
      let energy = 0.5;
      try {
        // Pre-compute spectrum once (reused by centroid and entropy)
        let spectrum = null;
        try {
          spectrum = essentia.Spectrum(audioVector).spectrum;
        } catch (e) { /* spectrum unavailable, dependent features will use defaults */ }

        // 1. Spectral centroid (timbre) — high = bright/aggressive, low = dark/calm
        //    Log-frequency scale for perceptual accuracy
        //    Most music: 800-4000 Hz centroid range
        let spectralScore = 0.5;
        try {
          if (spectrum) {
            const centroidResult = essentia.Centroid(spectrum);
            const centroidHz = centroidResult.centroid * 22050;
            // Log2 scale: 500Hz→0, 1000Hz→0.33, 2000Hz→0.67, 4000Hz→1.0
            spectralScore = Math.min(1, Math.max(0, (Math.log2(Math.max(centroidHz, 500)) - 9) / 3));
          }
        } catch (e) { /* use default */ }

        // 2. Dynamic complexity — inverted: compressed/loud = more energetic
        //    Typical music: 2-12 complexity range
        let dynamicScore = 0.5;
        try {
          const dynResult = essentia.DynamicComplexity(audioVector);
          dynamicScore = Math.min(1, Math.max(0, 1 - (dynResult.dynamicComplexity / 12)));
        } catch (e) { /* use default */ }

        // 3. RMS (perceived loudness) — dB scale with music-calibrated range
        //    Typical music: -40dB (quiet acoustic) to -3dB (loud mastered)
        let rmsScore = 0.5;
        try {
          const rmsResult = essentia.RMS(audioVector);
          const rms = rmsResult.rms;
          if (rms > 0) {
            const rmsDb = 20 * Math.log10(rms);
            rmsScore = Math.min(1, Math.max(0, (rmsDb + 40) / 37));
          } else {
            rmsScore = 0;
          }
        } catch (e) { /* use default */ }

        // 4. Onset rate — log scale for perceptual accuracy
        //    Ballad ~1-3/s, Pop ~4-6/s, Metal/EDM ~8-15/s
        //    Log2: 1/s→0, 3/s→0.37, 8/s→0.69, 20/s→1.0
        let onsetScore = 0.5;
        try {
          const onsetResult = essentia.OnsetRate(audioVector);
          const onsetsPerSecond = onsetResult.onsetRate;
          onsetScore = Math.min(1, Math.max(0, Math.log2(Math.max(onsetsPerSecond, 1)) / Math.log2(20)));
        } catch (e) { /* use default */ }

        // 5. Spectral entropy — general complexity/noise of the spectrum
        //    Tonal/simple music has low entropy, noisy/complex has high
        //    Typical music spectra: entropy 3-8 range
        let entropyScore = 0.5;
        try {
          if (spectrum) {
            const entropyResult = essentia.Entropy(spectrum);
            entropyScore = Math.min(1, Math.max(0, (entropyResult.entropy - 3) / 5));
          }
        } catch (e) { /* use default */ }

        // Weighted combination (inspired by Spotify/EchoNest):
        // Loudness 30%, Onset rate 25%, Timbre 15%, Dynamics 15%, Entropy 15%
        // RMS and onset rate are the strongest perceptual energy correlates
        const rawEnergy = rmsScore * 0.30 + onsetScore * 0.25 + spectralScore * 0.15 + dynamicScore * 0.15 + entropyScore * 0.15;

        // Apply sigmoid contrast enhancement to spread values across full 0-1 range
        // Without this, averaging 5 features causes regression to the mean (~0.5-0.7)
        // Center at 0.77: empirically calibrated from real library analysis (~4000 tracks)
        // Steepness 12: maps 0.60→0.12, 0.70→0.30, 0.77→0.50, 0.84→0.70, 0.90→0.83
        energy = 1 / (1 + Math.exp(-12 * (rawEnergy - 0.77)));
        energy = Math.min(1, Math.max(0, energy));

        process.send({ type: 'debug', step: 'energy_done', rmsScore, spectralScore, dynamicScore, onsetScore, entropyScore, rawEnergy, energy });
      } catch (e) {
        process.send({ type: 'debug', step: 'energy_failed', error: e?.message || String(e) });
        energy = 0.5;
      }

      // Danceability (optional) — Essentia returns ~0-3, normalize to 0-1
      let danceability = undefined;
      try {
        const danceResult = essentia.Danceability(audioVector);
        danceability = Math.min(1, Math.max(0, danceResult.danceability / 2.5));
        process.send({ type: 'debug', step: 'danceability_done', danceability });
      } catch (e) {
        process.send({ type: 'debug', step: 'danceability_failed', error: e?.message || String(e) });
        // Danceability is optional, leave as undefined
      }

      // Free WASM vector to prevent memory leak
      if (audioVector && typeof audioVector.delete === 'function') {
        audioVector.delete();
        audioVector = null;
      }

      process.send({ type: 'result', requestId, success: true, data: { bpm, key, energy, danceability } });
    } catch (error) {
      // Free WASM vector on error too
      if (audioVector && typeof audioVector.delete === 'function') {
        try { audioVector.delete(); } catch { /* ignore */ }
      }
      // Serialize error properly
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      process.send({ type: 'result', requestId, success: false, error: errorMessage, stack: errorStack });
    }
  } else if (message.type === 'exit') {
    process.exit(0);
  }
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  process.send({ type: 'result', success: false, error: `Uncaught: ${errorMessage}` });
});

process.on('unhandledRejection', (reason) => {
  const errorMessage = reason instanceof Error ? reason.message : String(reason);
  process.send({ type: 'result', success: false, error: `Unhandled: ${errorMessage}` });
});

// Initialize WASM eagerly before signaling ready
// This prevents the first analysis requests from crashing due to uninitialized WASM
(async () => {
  try {
    await initEssentia();
    process.send({ type: 'ready' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    process.send({ type: 'init_error', error: errorMessage });
    // Exit so parent knows to fall back to FFmpeg
    process.exit(1);
  }
})();
