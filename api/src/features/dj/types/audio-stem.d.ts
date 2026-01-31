declare module '@prodemmi/audio-stem' {
  export interface StemSeparationOptions {
    model?: string;
    outputDir?: string;
  }

  export interface StemResult {
    vocals: string;
    drums: string;
    bass: string;
    other: string;
  }

  interface AudioStemAPI {
    separate(
      inputPath: string,
      outputDir: string,
      onProgress: (progress: number) => void,
    ): void;
  }

  const api: AudioStemAPI;
  export default api;
}
