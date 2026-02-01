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
    const EssentiaWASM = EssentiaModule.EssentiaWASM || EssentiaModule.default?.EssentiaWASM;
    const Essentia = EssentiaModule.Essentia || EssentiaModule.default?.Essentia;

    if (!EssentiaWASM || !Essentia) {
      throw new Error(`Essentia module not found. Keys: ${Object.keys(EssentiaModule).join(', ')}`);
    }

    // Initialize WASM
    const wasmModule = await EssentiaWASM();
    essentia = new Essentia(wasmModule);
    return true;
  } catch (error) {
    essentiaInitError = `Failed to initialize Essentia: ${error.message || error}`;
    throw new Error(essentiaInitError);
  }
}

async function decodeAudio(filePath) {
  const { execFile } = require('child_process');
  const { promisify } = require('util');
  const execFileAsync = promisify(execFile);

  // Use system ffmpeg (should be in PATH after installation)
  const ffmpegPath = 'ffmpeg';

  try {
    // Decode to mono 44.1kHz float32 PCM
    const { stdout } = await execFileAsync(
      ffmpegPath,
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
      }
    );

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
    try {
      // Send debug info via IPC
      process.send({ type: 'debug', step: 'start', filePath: message.filePath });

      // Step 1: Init Essentia
      process.send({ type: 'debug', step: 'init_essentia' });
      await initEssentia();
      process.send({ type: 'debug', step: 'essentia_ready' });

      // Step 2: Decode audio
      process.send({ type: 'debug', step: 'decode_audio' });
      const audioData = await decodeAudio(message.filePath);
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

      // Energy
      let energy = 0.5;
      try {
        const energyResult = essentia.Energy(audioVector);
        const rawEnergy = energyResult.energy;
        energy = Math.min(1, Math.max(0, Math.log10(rawEnergy + 1) / 6));
      } catch (e) {
        energy = 0.5;
      }

      // Danceability (optional)
      let danceability = undefined;
      try {
        const danceResult = essentia.Danceability(audioVector);
        danceability = danceResult.danceability;
      } catch (e) {
        // Optional
      }

      process.send({ type: 'result', success: true, data: { bpm, key, energy, danceability } });
    } catch (error) {
      // Serialize error properly
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      process.send({ type: 'result', success: false, error: errorMessage, stack: errorStack });
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
