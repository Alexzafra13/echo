import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * Resultado del análisis de loudness
 */
export interface LufsAnalysisResult {
  inputLufs: number; // Loudness integrado del archivo (LUFS)
  inputPeak: number; // True peak del archivo (dBTP)
  trackGain: number; // Ganancia necesaria para llegar al target (dB)
  trackPeak: number; // Peak normalizado (0-1)
  outroStart?: number; // Seconds where outro/silence begins (for smart crossfade)
}

/**
 * LufsAnalyzerService
 *
 * Analiza archivos de audio usando FFmpeg para obtener valores de loudness (LUFS)
 * cuando los archivos no tienen tags de ReplayGain embebidos.
 *
 * Usa el filtro loudnorm de FFmpeg para medir:
 * - Integrated loudness (LUFS)
 * - True peak (dBTP)
 *
 * Target: -16 LUFS (estilo Apple Music, más conservador)
 */
@Injectable()
export class LufsAnalyzerService {
  // Target LUFS para normalización (Apple Music usa -16, Spotify usa -14)
  private readonly TARGET_LUFS = -16;

  constructor(
    @InjectPinoLogger(LufsAnalyzerService.name)
    private readonly logger: PinoLogger,
  ) {}

  /**
   * Analiza un archivo de audio y devuelve los valores de loudness
   * También detecta el inicio del outro/silencio para crossfade inteligente
   * @param filePath Ruta al archivo de audio
   * @returns Resultado del análisis o null si falla
   */
  async analyzeFile(filePath: string): Promise<LufsAnalysisResult | null> {
    try {
      // Run loudness analysis and silence detection in parallel
      const [lufsResult, outroStart] = await Promise.all([
        this.analyzeLoudness(filePath),
        this.detectOutroStart(filePath),
      ]);

      if (!lufsResult) {
        this.logger.warn({ filePath }, 'No se pudo parsear el output de FFmpeg');
        return null;
      }

      // Calcular ganancia necesaria para llegar al target
      const trackGain = this.TARGET_LUFS - lufsResult.inputLufs;

      // Convertir true peak de dBTP a ratio (0-1)
      // dBTP a linear: 10^(dBTP/20)
      const trackPeak = Math.pow(10, lufsResult.inputPeak / 20);

      this.logger.debug(
        {
          filePath,
          inputLufs: lufsResult.inputLufs,
          inputPeak: lufsResult.inputPeak,
          trackGain,
          trackPeak,
          outroStart,
        },
        'Análisis LUFS completado',
      );

      return {
        inputLufs: lufsResult.inputLufs,
        inputPeak: lufsResult.inputPeak,
        trackGain,
        trackPeak, // No clamp: True Peak puede ser > 1.0 (> 0 dBTP) en audio con clipping
        outroStart,
      };
    } catch (error) {
      this.logger.error(
        { err: error, filePath },
        'Error analizando archivo con FFmpeg',
      );
      return null;
    }
  }

  /**
   * Analyze loudness using FFmpeg loudnorm filter
   */
  private async analyzeLoudness(filePath: string): Promise<{ inputLufs: number; inputPeak: number } | null> {
    try {
      const { stderr } = await execFileAsync(
        'ffmpeg',
        [
          '-nostdin',
          '-hide_banner',
          '-i', filePath,
          '-af', 'loudnorm=print_format=json',
          '-f', 'null',
          '-',
        ],
        {
          timeout: 60000,
          maxBuffer: 10 * 1024 * 1024,
        },
      );
      return this.parseFFmpegOutput(stderr);
    } catch {
      return null;
    }
  }

  /**
   * Detect where the outro/silence starts at the end of the track
   * Uses FFmpeg silencedetect filter to find the last silence in the track
   * Returns the timestamp in seconds where meaningful audio ends
   */
  private async detectOutroStart(filePath: string): Promise<number | undefined> {
    try {
      // Use silencedetect to find silence periods
      // -60dB threshold: only actual silence/near-silence (not just quiet parts)
      // d=1.0: minimum silence duration of 1 second (avoid brief pauses)
      const { stderr } = await execFileAsync(
        'ffmpeg',
        [
          '-nostdin',
          '-hide_banner',
          '-i', filePath,
          '-af', 'silencedetect=noise=-60dB:d=1.0',
          '-f', 'null',
          '-',
        ],
        {
          timeout: 60000,
          maxBuffer: 10 * 1024 * 1024,
        },
      );

      // Parse silence detection output
      // Format: [silencedetect @ xxx] silence_start: 234.567
      const silenceMatches = stderr.matchAll(/silence_start:\s*([\d.]+)/g);
      const silenceStarts: number[] = [];

      for (const match of silenceMatches) {
        silenceStarts.push(parseFloat(match[1]));
      }

      if (silenceStarts.length === 0) {
        // No silence detected - track plays to the very end
        return undefined;
      }

      // Get track duration from FFmpeg output
      const durationMatch = stderr.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
      if (!durationMatch) {
        return undefined;
      }

      const hours = parseInt(durationMatch[1], 10);
      const minutes = parseInt(durationMatch[2], 10);
      const seconds = parseInt(durationMatch[3], 10);
      const centiseconds = parseInt(durationMatch[4], 10);
      const duration = hours * 3600 + minutes * 60 + seconds + centiseconds / 100;

      // Find silence that's near the end of the track (within last 15 seconds)
      // Only use silences that are very close to the end - this is the actual outro
      const outroSilences = silenceStarts
        .filter(s => s > duration - 15 && s > duration * 0.85) // Last 15s AND after 85% of track
        .sort((a, b) => a - b);

      const lastSilence = outroSilences[0]; // Get the first (earliest) one near the end

      if (lastSilence === undefined) {
        return undefined;
      }

      // Sanity check: outroStart should be at least 3 seconds before end
      // and at least 60 seconds into the track (skip intros that might have silence)
      if (lastSilence < 60 || lastSilence > duration - 3) {
        return undefined;
      }

      return lastSilence;
    } catch (error) {
      this.logger.debug({ err: error, filePath }, 'Error detecting outro start');
      return undefined;
    }
  }

  /**
   * Parsea el output JSON de FFmpeg loudnorm
   */
  private parseFFmpegOutput(
    output: string,
  ): { inputLufs: number; inputPeak: number } | null {
    try {
      // El output de loudnorm está en formato JSON al final del stderr
      // Aparece después de [Parsed_loudnorm...] con formato:
      // {
      //     "input_i" : "-5.02",
      //     "input_tp" : "1.31",
      //     ...
      // }

      // Buscar el bloque JSON que empieza con "input_i" (específico de loudnorm)
      // Usamos regex no-greedy y anclamos al inicio del JSON de loudnorm
      const jsonMatch = output.match(/\{\s*"input_i"\s*:\s*"[^"]+"\s*,[\s\S]*?"target_offset"\s*:\s*"[^"]+"\s*\}/);
      if (!jsonMatch) {
        // Fallback: buscar cualquier JSON que contenga input_i cerca del final
        const lines = output.split('\n');
        const lastLines = lines.slice(-20).join('\n');
        const fallbackMatch = lastLines.match(/\{[^{}]*"input_i"[^{}]*\}/);
        if (!fallbackMatch) {
          return null;
        }
        const data = JSON.parse(fallbackMatch[0]);
        const inputLufs = parseFloat(data.input_i);
        const inputPeak = parseFloat(data.input_tp);
        if (isNaN(inputLufs) || isNaN(inputPeak)) {
          return null;
        }
        return { inputLufs, inputPeak };
      }

      const data = JSON.parse(jsonMatch[0]);

      // input_i = integrated loudness
      // input_tp = true peak
      const inputLufs = parseFloat(data.input_i);
      const inputPeak = parseFloat(data.input_tp);

      if (isNaN(inputLufs) || isNaN(inputPeak)) {
        return null;
      }

      return { inputLufs, inputPeak };
    } catch {
      return null;
    }
  }

  /**
   * Verifica si FFmpeg está disponible en el sistema
   */
  async isFFmpegAvailable(): Promise<boolean> {
    try {
      await execFileAsync('ffmpeg', ['-version']);
      return true;
    } catch {
      return false;
    }
  }
}
