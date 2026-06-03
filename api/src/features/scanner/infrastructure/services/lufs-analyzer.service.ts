import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { getFfmpegPath } from '@features/dj/infrastructure/utils/ffmpeg.util';

const execFileAsync = promisify(execFile);

export interface LufsAnalysisResult {
  inputLufs: number; // Loudness integrado del archivo (LUFS)
  inputPeak: number; // True peak del archivo (dBTP)
  trackGain: number; // Ganancia necesaria para llegar al target (dB)
  trackPeak: number; // Peak normalizado (0-1)
  outroStart?: number; // Segundo donde empieza el outro/silencio (para crossfade)
}

/**
 * Mide el loudness (LUFS) de un archivo con el filtro loudnorm de FFmpeg,
 * pensado para audio sin tags de ReplayGain. Target: -16 LUFS (estilo Apple Music).
 */
@Injectable()
export class LufsAnalyzerService {
  // Apple Music usa -16, Spotify -14
  private readonly TARGET_LUFS = -16;

  constructor(
    @InjectPinoLogger(LufsAnalyzerService.name)
    private readonly logger: PinoLogger
  ) {}

  // Devuelve loudness + inicio del outro (para crossfade). null si falla
  async analyzeFile(filePath: string): Promise<LufsAnalysisResult | null> {
    try {
      // Un solo proceso FFmpeg: ambos filtros (loudnorm + silencedetect) en un
      // audio split para leer y decodificar el archivo una sola vez.
      // Con 6 workers esto evita 12 procesos FFmpeg simultáneos (eran 2 por archivo).
      const combined = await this.analyzeCombined(filePath);
      const lufsResult = combined?.lufs ?? null;
      const outroStart = combined?.outroStart;

      if (!lufsResult) {
        this.logger.warn({ filePath }, 'No se pudo parsear el output de FFmpeg');
        return null;
      }

      // Ganancia necesaria para alcanzar el target
      const trackGain = this.TARGET_LUFS - lufsResult.inputLufs;

      // True peak de dBTP a ratio lineal (0-1): 10^(dBTP/20)
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
        'Análisis LUFS completado'
      );

      return {
        inputLufs: lufsResult.inputLufs,
        inputPeak: lufsResult.inputPeak,
        trackGain,
        trackPeak, // Sin clamp: el True Peak puede ser > 1.0 (> 0 dBTP) en audio con clipping
        outroStart,
      };
    } catch (error) {
      this.logger.error({ err: error, filePath }, 'Error analizando archivo con FFmpeg');
      return null;
    }
  }

  /**
   * loudnorm + silencedetect en un solo proceso: asplit bifurca el audio decodificado
   * a ambos filtros para no leer el archivo dos veces.
   */
  private async analyzeCombined(
    filePath: string
  ): Promise<{
    lufs: { inputLufs: number; inputPeak: number } | null;
    outroStart?: number;
  } | null> {
    try {
      const { stderr } = await execFileAsync(
        getFfmpegPath(),
        [
          '-nostdin',
          '-hide_banner',
          '-i',
          filePath,
          '-filter_complex',
          '[0:a]asplit=2[a1][a2];[a1]loudnorm=print_format=json[out1];[a2]silencedetect=noise=-60dB:d=1.0[out2]',
          '-map',
          '[out1]',
          '-f',
          'null',
          '-',
          '-map',
          '[out2]',
          '-f',
          'null',
          '-',
        ],
        {
          timeout: 120000,
          maxBuffer: 10 * 1024 * 1024,
        }
      );

      const lufs = this.parseFFmpegOutput(stderr);
      const outroStart = this.parseOutroFromCombinedOutput(stderr);

      return { lufs, outroStart };
    } catch {
      // Si el filtro combinado falla (ej: audio mono con asplit), retornar null
      // para que analyzeFile use el fallback de analyzeLoudness solo
      return null;
    }
  }

  // Saca silence_start del output combinado para detectar el outro
  private parseOutroFromCombinedOutput(stderr: string): number | undefined {
    const silenceMatches = stderr.matchAll(/silence_start:\s*([\d.]+)/g);
    const silenceStarts: number[] = [];
    for (const match of silenceMatches) {
      silenceStarts.push(parseFloat(match[1]));
    }
    if (silenceStarts.length === 0) return undefined;

    const durationMatch = stderr.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
    if (!durationMatch) return undefined;

    const duration =
      parseInt(durationMatch[1], 10) * 3600 +
      parseInt(durationMatch[2], 10) * 60 +
      parseInt(durationMatch[3], 10) +
      parseInt(durationMatch[4], 10) / 100;

    const outroSilences = silenceStarts
      .filter((s) => s > duration - 15 && s > duration * 0.85)
      .sort((a, b) => a - b);

    const lastSilence = outroSilences[0];
    if (lastSilence === undefined || lastSilence < 60 || lastSilence > duration - 3) {
      return undefined;
    }

    return lastSilence;
  }

  // Fallback: solo loudness, sin detección de silencio
  private async analyzeLoudness(
    filePath: string
  ): Promise<{ inputLufs: number; inputPeak: number } | null> {
    try {
      const { stderr } = await execFileAsync(
        getFfmpegPath(),
        [
          '-nostdin',
          '-hide_banner',
          '-i',
          filePath,
          '-af',
          'loudnorm=print_format=json',
          '-f',
          'null',
          '-',
        ],
        {
          timeout: 60000,
          maxBuffer: 10 * 1024 * 1024,
        }
      );
      return this.parseFFmpegOutput(stderr);
    } catch {
      return null;
    }
  }

  // Detecta dónde empieza el outro/silencio final con el filtro silencedetect
  private async detectOutroStart(filePath: string): Promise<number | undefined> {
    try {
      // Umbral -60dB: solo silencio real, no partes simplemente flojas.
      // d=1.0: mínimo 1s de silencio, para ignorar pausas breves.
      const { stderr } = await execFileAsync(
        getFfmpegPath(),
        [
          '-nostdin',
          '-hide_banner',
          '-i',
          filePath,
          '-af',
          'silencedetect=noise=-60dB:d=1.0',
          '-f',
          'null',
          '-',
        ],
        {
          timeout: 60000,
          maxBuffer: 10 * 1024 * 1024,
        }
      );

      // Formato del output: "silence_start: 234.567"
      const silenceMatches = stderr.matchAll(/silence_start:\s*([\d.]+)/g);
      const silenceStarts: number[] = [];

      for (const match of silenceMatches) {
        silenceStarts.push(parseFloat(match[1]));
      }

      if (silenceStarts.length === 0) {
        // Sin silencio: el track suena hasta el final
        return undefined;
      }

      const durationMatch = stderr.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
      if (!durationMatch) {
        return undefined;
      }

      const hours = parseInt(durationMatch[1], 10);
      const minutes = parseInt(durationMatch[2], 10);
      const seconds = parseInt(durationMatch[3], 10);
      const centiseconds = parseInt(durationMatch[4], 10);
      const duration = hours * 3600 + minutes * 60 + seconds + centiseconds / 100;

      // Solo silencios pegados al final (últimos 15s y pasado el 85% del track): ese es el outro
      const outroSilences = silenceStarts
        .filter((s) => s > duration - 15 && s > duration * 0.85)
        .sort((a, b) => a - b);

      const lastSilence = outroSilences[0]; // el más temprano cerca del final

      if (lastSilence === undefined) {
        return undefined;
      }

      // Descarta valores raros: al menos 3s antes del fin y pasado el primer minuto
      if (lastSilence < 60 || lastSilence > duration - 3) {
        return undefined;
      }

      return lastSilence;
    } catch (error) {
      this.logger.debug({ err: error, filePath }, 'Error detecting outro start');
      return undefined;
    }
  }

  private parseFFmpegOutput(output: string): { inputLufs: number; inputPeak: number } | null {
    try {
      // loudnorm imprime un bloque JSON al final del stderr (input_i, input_tp, ...).
      // Lo buscamos anclando al inicio del JSON propio de loudnorm.
      const jsonMatch = output.match(
        /\{\s*"input_i"\s*:\s*"[^"]+"\s*,[\s\S]*?"target_offset"\s*:\s*"[^"]+"\s*\}/
      );
      if (!jsonMatch) {
        // Fallback: cualquier JSON con input_i cerca del final
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

      // input_i = loudness integrado, input_tp = true peak
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

  async isFFmpegAvailable(): Promise<boolean> {
    try {
      await execFileAsync(getFfmpegPath(), ['-version']);
      return true;
    } catch {
      return false;
    }
  }
}
