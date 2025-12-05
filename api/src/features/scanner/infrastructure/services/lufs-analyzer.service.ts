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
   * @param filePath Ruta al archivo de audio
   * @returns Resultado del análisis o null si falla
   */
  async analyzeFile(filePath: string): Promise<LufsAnalysisResult | null> {
    try {
      // Usar loudnorm en modo de análisis (print_format=json)
      // -nostdin: evita bloqueo esperando entrada
      // -hide_banner: menos output
      // Usamos execFile con array de argumentos para evitar command injection
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
          timeout: 60000, // 60 segundos máximo
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        },
      );

      // FFmpeg escribe el resultado en stderr
      const result = this.parseFFmpegOutput(stderr);

      if (!result) {
        this.logger.warn({ filePath }, 'No se pudo parsear el output de FFmpeg');
        return null;
      }

      // Calcular ganancia necesaria para llegar al target
      const trackGain = this.TARGET_LUFS - result.inputLufs;

      // Convertir true peak de dBTP a ratio (0-1)
      // dBTP a linear: 10^(dBTP/20)
      const trackPeak = Math.pow(10, result.inputPeak / 20);

      this.logger.debug(
        {
          filePath,
          inputLufs: result.inputLufs,
          inputPeak: result.inputPeak,
          trackGain,
          trackPeak,
        },
        'Análisis LUFS completado',
      );

      return {
        inputLufs: result.inputLufs,
        inputPeak: result.inputPeak,
        trackGain,
        trackPeak, // No clamp: True Peak puede ser > 1.0 (> 0 dBTP) en audio con clipping
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
