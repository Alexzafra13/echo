declare module 'essentia.js' {
  export interface EssentiaWASMModule {
    // WASM module for Essentia
  }

  export interface EssentiaInstance {
    PercivalBpmEstimator(signal: Float32Array): { bpm: number };
    KeyExtractor(signal: Float32Array): { key: string; scale: string; strength: number };
    Energy(signal: Float32Array): { energy: number };
    Danceability(signal: Float32Array): { danceability: number };
    BeatTrackerMultiFeature(signal: Float32Array): { ticks: number[]; confidence: number };
  }

  export interface EssentiaExtractorInstance {
    // Extractor instance methods
  }

  export const EssentiaWASM: EssentiaWASMModule;

  export class Essentia {
    constructor(wasmModule: EssentiaWASMModule);
    PercivalBpmEstimator(signal: Float32Array): { bpm: number };
    KeyExtractor(signal: Float32Array): { key: string; scale: string; strength: number };
    Energy(signal: Float32Array): { energy: number };
    Danceability(signal: Float32Array): { danceability: number };
    BeatTrackerMultiFeature(signal: Float32Array): { ticks: number[]; confidence: number };
  }

  export class EssentiaExtractor {
    constructor(wasmModule: EssentiaWASMModule);
  }
}
