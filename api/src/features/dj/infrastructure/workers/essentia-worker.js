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

async function decodeAudio(filePath, ffmpegPath) {
  const { execFile } = require('child_process');
  const { promisify } = require('util');
  const execFileAsync = promisify(execFile);

  // Use ffmpegPath passed from parent service, fallback to system ffmpeg
  const ffmpeg = ffmpegPath || 'ffmpeg';

  try {
    // Decode to mono 44.1kHz float32 PCM
    const { stdout } = await execFileAsync(
      ffmpeg,
      [
        '-i', filePath,
        '-ac', '1',           // mono
        '-ar', '44100',       // 44.1kHz
        '-f', 'f32le',        // 32-bit float little-endian
        '-acodec', 'pcm_f32le',
        'pipe:1',             // output to stdout
      ],
      {
        encoding: 'buffer',
        maxBuffer: 100 * 1024 * 1024, // 100MB buffer
        timeout: 120000, // 2 minute timeout to prevent hanging
      }
    );

    // Validate buffer length is divisible by 4 (float32 = 4 bytes)
    if (stdout.length % 4 !== 0) {
      throw new Error(`Invalid PCM buffer length: ${stdout.length} (not divisible by 4)`);
    }

    // Convert buffer to Float32Array
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
    try {
      // Send debug info via IPC
      process.send({ type: 'debug', step: 'start', filePath: message.filePath, requestId });

      // Step 1: Init Essentia
      process.send({ type: 'debug', step: 'init_essentia' });
      await initEssentia();
      process.send({ type: 'debug', step: 'essentia_ready' });

      // Step 2: Decode audio
      process.send({ type: 'debug', step: 'decode_audio' });
      const audioData = await decodeAudio(message.filePath, message.ffmpegPath);
      process.send({ type: 'debug', step: 'decoded', samples: audioData?.length || 0 });

      if (!audioData || audioData.length === 0) {
        throw new Error('Audio decode produced empty data');
      }

      // Step 3: Convert to vector
      process.send({ type: 'debug', step: 'convert_vector' });
      const audioVector = essentia.arrayToVector(audioData);
      process.send({ type: 'debug', step: 'vector_ready' });

      // Step 4: Analyze
      process.send({ type: 'debug', step: 'analyze' });

      // BPM
      let bpm = 0;
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

      // Key
      let key = 'Unknown';
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

      // Energy - use RMS for better normalization
      let energy = 0.5;
      try {
        // Calculate RMS (Root Mean Square) for normalized energy
        const rmsResult = essentia.RMS(audioVector);
        const rms = rmsResult.rms;

        // RMS is typically 0-1 for normalized audio, but can vary
        // Use a sigmoid-like scaling for better distribution
        const rawEnergy = rms;
        energy = Math.min(1, Math.max(0, rawEnergy * 3)); // Scale up since RMS is usually < 0.5

        process.send({ type: 'debug', step: 'energy_done', rawRms: rms, energy });
      } catch (e) {
        // Fallback: try simple Energy algorithm
        try {
          const energyResult = essentia.Energy(audioVector);
          const rawEnergy = energyResult.energy;
          // Energy is sum of squares, so very large for full tracks
          // Normalize by sample count and apply log scale
          const normalizedEnergy = rawEnergy / audioData.length;
          energy = Math.min(1, Math.max(0, Math.sqrt(normalizedEnergy) * 3));
          process.send({ type: 'debug', step: 'energy_fallback', rawEnergy, normalizedEnergy, energy });
        } catch (e2) {
          process.send({ type: 'debug', step: 'energy_failed', error: e2?.message || String(e2) });
          energy = 0.5;
        }
      }

      // Danceability (optional)
      let danceability = undefined;
      try {
        const danceResult = essentia.Danceability(audioVector);
        danceability = danceResult.danceability;
        process.send({ type: 'debug', step: 'danceability_done', danceability });
      } catch (e) {
        process.send({ type: 'debug', step: 'danceability_failed', error: e?.message || String(e) });
        // Danceability is optional, leave as undefined
      }

      process.send({ type: 'result', requestId, success: true, data: { bpm, key, energy, danceability } });
    } catch (error) {
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

// Signal ready
process.send({ type: 'ready' });
