/**
 * DJ Analysis Types
 */

export interface CamelotColor {
  bg: string;
  text: string;
  name: string;
}

export interface DjAnalysis {
  status: 'pending' | 'analyzing' | 'completed' | 'failed';
  bpm?: number;
  key?: string;
  camelotKey?: string;
  camelotColor?: CamelotColor;
  energy?: number;
  danceability?: number;
  analysisError?: string;
  analyzedAt?: string;
}
