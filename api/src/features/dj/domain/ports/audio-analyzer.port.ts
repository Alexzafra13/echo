export interface AudioAnalysisResult {
  bpm: number;
  key: string;
  energy: number;
  rawEnergy?: number;
  danceability?: number;
}

// Hints de ID3 tags para evitar algoritmos costosos cuando ya hay datos
export interface AnalysisHints {
  bpm?: number;
  key?: string;
}

export interface IAudioAnalyzer {
  analyze(filePath: string, hints?: AnalysisHints): Promise<AudioAnalysisResult>;
  isAvailable(): Promise<boolean>;
  getName(): string;
  getError?(): string | null;
}

export const AUDIO_ANALYZER = 'IAudioAnalyzer';
