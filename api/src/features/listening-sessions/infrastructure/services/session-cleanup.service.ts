import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { BullmqService } from '@infrastructure/queue/bullmq.service';
import { IListeningSessionRepository, LISTENING_SESSION_REPOSITORY } from '../../domain/ports/listening-session-repository.port';
import { ListeningSessionsGateway } from '../../presentation/gateway/listening-sessions.gateway';

// Tiempo sin actividad antes de cerrar la sesion (30 minutos)
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
// Tiempo sin host conectado antes de cerrar (5 minutos)
const HOST_DISCONNECT_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * SessionCleanupService
 *
 * Gestiona el auto-cierre de sesiones de escucha inactivas usando BullMQ.
 * - Al crear/activar una sesion, programa un job de timeout por inactividad
 * - Cada actividad (add queue, skip, join) resetea el timer
 * - Al desconectarse el host del WebSocket, programa un cierre en 5 min
 * - Si el host reconecta, cancela el cierre
 */
@Injectable()
export class SessionCleanupService implements OnModuleInit {
  private readonly QUEUE_NAME = 'session-cleanup';

  constructor(
    @InjectPinoLogger(SessionCleanupService.name)
    private readonly logger: PinoLogger,
    private readonly bullmqService: BullmqService,
    @Inject(LISTENING_SESSION_REPOSITORY)
    private readonly sessionRepository: IListeningSessionRepository,
    private readonly gateway: ListeningSessionsGateway,
  ) {}

  async onModuleInit() {
    this.bullmqService.registerProcessor(this.QUEUE_NAME, async (job) => {
      const { sessionId, reason } = job.data as { sessionId: string; reason: string };
      this.logger.info({ sessionId, reason, jobName: job.name }, 'Procesando cierre de sesion');

      try {
        const session = await this.sessionRepository.findById(sessionId);
        if (!session || !session.isActive) {
          this.logger.debug({ sessionId }, 'Sesion ya cerrada, ignorando');
          return;
        }

        await this.sessionRepository.end(sessionId);
        this.gateway.notifySessionEnded(sessionId);
        this.logger.info({ sessionId, reason }, 'Sesion cerrada automaticamente');
      } catch (error) {
        this.logger.error({ sessionId, error }, 'Error al cerrar sesion');
        throw error;
      }
    });

    this.logger.info('Session cleanup service inicializado');
  }

  /**
   * Programar cierre por inactividad. Se llama al crear la sesion
   * y se resetea con cada actividad.
   */
  async scheduleInactivityTimeout(sessionId: string): Promise<void> {
    const jobId = `inactivity-${sessionId}`;

    // Eliminar job anterior si existe (resetear timer)
    await this.removeJob(jobId);

    await this.bullmqService.addJob(
      this.QUEUE_NAME,
      'session-inactivity-timeout',
      { sessionId, reason: 'inactividad (30 min sin actividad)' },
      { jobId, delay: INACTIVITY_TIMEOUT_MS, removeOnComplete: true, removeOnFail: true },
    );

    this.logger.debug({ sessionId }, 'Timer de inactividad programado (30 min)');
  }

  /**
   * Resetear timer de inactividad. Se llama en cada actividad
   * (add queue, skip, join, etc.)
   */
  async resetInactivityTimeout(sessionId: string): Promise<void> {
    await this.scheduleInactivityTimeout(sessionId);
  }

  /**
   * Programar cierre por desconexion del host (5 min de gracia)
   */
  async scheduleHostDisconnectTimeout(sessionId: string): Promise<void> {
    const jobId = `host-disconnect-${sessionId}`;

    await this.bullmqService.addJob(
      this.QUEUE_NAME,
      'session-host-disconnect',
      { sessionId, reason: 'host desconectado (5 min sin reconectar)' },
      { jobId, delay: HOST_DISCONNECT_TIMEOUT_MS, removeOnComplete: true, removeOnFail: true },
    );

    this.logger.info({ sessionId }, 'Timer de desconexion del host programado (5 min)');
  }

  /**
   * Cancelar cierre por desconexion (el host reconecto)
   */
  async cancelHostDisconnectTimeout(sessionId: string): Promise<void> {
    const jobId = `host-disconnect-${sessionId}`;
    await this.removeJob(jobId);
    this.logger.debug({ sessionId }, 'Timer de desconexion del host cancelado');
  }

  /**
   * Limpiar todos los jobs de una sesion (al terminarla manualmente)
   */
  async clearSessionJobs(sessionId: string): Promise<void> {
    await this.removeJob(`inactivity-${sessionId}`);
    await this.removeJob(`host-disconnect-${sessionId}`);
  }

  private async removeJob(jobId: string): Promise<void> {
    try {
      const queue = this.bullmqService.createQueue(this.QUEUE_NAME);
      const job = await queue.getJob(jobId);
      if (job) {
        await job.remove();
      }
    } catch {
      // Job no existia, OK
    }
  }
}
