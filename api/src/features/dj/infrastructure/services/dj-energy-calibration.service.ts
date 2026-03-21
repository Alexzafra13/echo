import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { DrizzleService } from '../../../../infrastructure/database/drizzle.service';
import { djAnalysis } from '../../../../infrastructure/database/schema';
import { eq, count, sql } from 'drizzle-orm';

/**
 * Calibración automática de energía usando la mediana real de rawEnergy.
 *
 * La energía cruda (media ponderada de 5 features de audio) se agrupa
 * alrededor de un centro específico de cada biblioteca según los géneros.
 * Este servicio aplica una sigmoid centrada en la mediana para distribuir
 * los valores entre 0 y 1 de forma uniforme.
 */
@Injectable()
export class DjEnergyCalibrationService {
  constructor(
    @InjectPinoLogger(DjEnergyCalibrationService.name)
    private readonly logger: PinoLogger,
    private readonly drizzle: DrizzleService,
  ) {}

  /**
   * Recalibra la energía de todas las pistas completadas.
   * Necesita al menos 20 pistas para tener una mediana fiable.
   */
  async recalibrate(): Promise<void> {
    const countResult = await this.drizzle.db
      .select({ value: count() })
      .from(djAnalysis)
      .where(eq(djAnalysis.status, 'completed'));

    const totalCompleted = countResult[0]?.value ?? 0;
    if (totalCompleted < 20) {
      this.logger.debug(
        { totalCompleted },
        'Calibración omitida — se necesitan al menos 20 pistas'
      );
      return;
    }

    // Mediana con percentile_cont de PostgreSQL
    const medianResult = await this.drizzle.db.execute(
      sql`SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY raw_energy) AS median
          FROM dj_analysis
          WHERE status = 'completed' AND raw_energy IS NOT NULL`
    );

    const rawResult = medianResult as unknown as {
      rows?: Array<{ median?: string | number }>;
    } & Array<{ median?: string | number }>;
    const median = parseFloat(String(rawResult.rows?.[0]?.median ?? rawResult[0]?.median));

    if (isNaN(median) || median <= 0 || median >= 1) {
      this.logger.debug({ median }, 'Calibración omitida — mediana inválida');
      return;
    }

    // Sigmoid: energy = 1 / (1 + exp(-12 * (raw_energy - median)))
    // Pendiente 12 da buen contraste sin comprimir extremos
    await this.drizzle.db.execute(
      sql`UPDATE dj_analysis
          SET energy = 1.0 / (1.0 + exp(-12.0 * (raw_energy - ${median}))),
              updated_at = NOW()
          WHERE status = 'completed' AND raw_energy IS NOT NULL`
    );

    this.logger.info(
      { median: median.toFixed(4), totalCompleted },
      'Energía recalibrada con la mediana de la biblioteca'
    );
  }
}
