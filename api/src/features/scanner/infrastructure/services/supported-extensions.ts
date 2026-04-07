/** Extensiones de audio soportadas — fuente de verdad única para scanner y file watcher */
export const SUPPORTED_AUDIO_EXTENSIONS = [
  '.mp3',
  '.flac',
  '.m4a',
  '.aac',
  '.ogg',
  '.opus',
  '.wav',
  '.wma',
  '.ape',
] as const;

export const SUPPORTED_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.m4v'] as const;
