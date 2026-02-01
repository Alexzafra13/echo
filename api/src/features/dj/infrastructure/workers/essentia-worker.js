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
let EssentiaWASM = null;

async function initEssentia() {
  if (essentia) return;

  try {
    const { Essentia, EssentiaWASM: WASM } = await import('essentia.js');
    EssentiaWASM = await WASM.default();
    essentia = new Essentia(EssentiaWASM);
  } catch (error) {
    throw new Error(`Failed to initialize Essentia: ${error.message}`);
  }
}

async function decodeAudio(filePath) {
  const { execFile } = require('child_process');
  const { promisify } = require('util');
  const execFileAsync = promisify(execFile);

  // Use ffmpeg to decode audio to raw PCM
  let ffmpegPath = 'ffmpeg';
  try {
    const ffmpegStatic = require('ffmpeg-static');
    if (ffmpegStatic) ffmpegPath = ffmpegStatic;
  } catch {
    // Use system ffmpeg
  }

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
}

function detectKey(essentia, audioVector) {
  try {
    // Use HPCP for key detection
    const frameSize = 4096;
    const hopSize = 2048;

    const frames = essentia.FrameGenerator(audioVector, frameSize, hopSize);
    const hpcpValues = [];

    for (const frame of frames) {
      const windowed = essentia.Windowing(frame, true, 'hann');
      const spectrum = essentia.Spectrum(windowed.frame);
      const peaks = essentia.SpectralPeaks(
        spectrum.spectrum,
        10000, // maxFrequency
        100,   // maxPeaks
        60,    // minFrequency
        1      // magnitudeThreshold
      );

      if (peaks.frequencies.length > 0) {
        const hpcp = essentia.HPCP(
          peaks.frequencies,
          peaks.magnitudes,
          true,     // harmonics
          500,      // maxFrequency
          100,      // minFrequency
          true,     // nonLinear
          12,       // size
          'squaredCosine', // weightType
          1         // windowSize
        );
        hpcpValues.push(Array.from(hpcp.hpcp));
      }
    }

    if (hpcpValues.length === 0) {
      return 'Unknown';
    }

    // Average HPCP values
    const avgHpcp = new Array(12).fill(0);
    for (const hpcp of hpcpValues) {
      for (let i = 0; i < 12; i++) {
        avgHpcp[i] += hpcp[i] / hpcpValues.length;
      }
    }

    // Find key using profiles
    const keyResult = essentia.Key(
      essentia.arrayToVector(avgHpcp),
      true,        // usePolyphony
      'temperley', // profileType
      4,           // numHarmonics
      4096,        // pcpSize
      'none',      // slope
      false        // useThreeChords
    );

    const key = keyResult.key;
    const scale = keyResult.scale;

    // Convert to Camelot notation
    return formatKey(key, scale);
  } catch (error) {
    return 'Unknown';
  }
}

function formatKey(key, scale) {
  // Convert to standard notation (e.g., "C major" -> "Cmaj", "A minor" -> "Am")
  if (!key || key === 'Unknown') return 'Unknown';

  const scaleAbbrev = scale === 'minor' ? 'm' : '';
  return `${key}${scaleAbbrev}`;
}

async function analyzeTrack(filePath) {
  await initEssentia();

  // Decode audio to PCM
  const audioData = await decodeAudio(filePath);

  // Convert to Essentia vector
  const audioVector = essentia.arrayToVector(audioData);

  // Analyze BPM
  let bpm = 0;
  try {
    const rhythmResult = essentia.RhythmExtractor2013(audioVector);
    bpm = Math.round(rhythmResult.bpm);

    // Validate BPM range (60-200 is typical for music)
    if (bpm < 60 || bpm > 200) {
      // Try to adjust (half or double tempo)
      if (bpm > 200 && bpm <= 400) bpm = Math.round(bpm / 2);
      else if (bpm < 60 && bpm >= 30) bpm = Math.round(bpm * 2);
      else bpm = 0; // Out of range
    }
  } catch {
    bpm = 0;
  }

  // Analyze Key
  let key = 'Unknown';
  try {
    key = detectKey(essentia, audioVector);
  } catch {
    key = 'Unknown';
  }

  // Analyze Energy (using Essentia's Energy algorithm)
  let energy = 0.5;
  try {
    const energyResult = essentia.Energy(audioVector);
    // Normalize to 0-1 range (log scale)
    const rawEnergy = energyResult.energy;
    energy = Math.min(1, Math.max(0, Math.log10(rawEnergy + 1) / 6));
  } catch {
    energy = 0.5;
  }

  // Analyze Danceability
  let danceability = undefined;
  try {
    const danceResult = essentia.Danceability(audioVector);
    danceability = danceResult.danceability;
  } catch {
    // Danceability is optional
  }

  return { bpm, key, energy, danceability };
}

// Handle messages from parent process
process.on('message', async (message) => {
  if (message.type === 'analyze') {
    try {
      const result = await analyzeTrack(message.filePath);
      process.send({ type: 'result', success: true, data: result });
    } catch (error) {
      process.send({ type: 'result', success: false, error: error.message });
    }
  } else if (message.type === 'exit') {
    process.exit(0);
  }
});

// Signal ready
process.send({ type: 'ready' });
