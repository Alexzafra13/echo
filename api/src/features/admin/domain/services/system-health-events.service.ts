import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter } from 'events';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { SystemHealthService } from './system-health.service';
import { StorageBreakdownService } from './storage-breakdown.service';
import { AlertsService } from './alerts.service';
import { SystemHealth, ActiveAlerts } from '../use-cases/get-dashboard-stats/get-dashboard-stats.dto';

export interface HealthChangeEvent {
  type: 'health:changed';
  data: {
    systemHealth: SystemHealth;
    activeAlerts: ActiveAlerts;
    changedFields: string[];
    timestamp: string;
  };
}

/**
 * Service that monitors system health and emits SSE events when changes occur.
 * Checks health every 15 seconds and notifies subscribers of any changes.
 */
@Injectable()
export class SystemHealthEventsService implements OnModuleInit, OnModuleDestroy {
  private readonly emitter = new EventEmitter();
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private previousHealth: SystemHealth | null = null;
  private previousAlerts: ActiveAlerts | null = null;

  private readonly CHECK_INTERVAL_MS = 15000; // 15 seconds

  constructor(
    @InjectPinoLogger(SystemHealthEventsService.name)
    private readonly logger: PinoLogger,
    private readonly systemHealthService: SystemHealthService,
    private readonly storageBreakdownService: StorageBreakdownService,
    private readonly alertsService: AlertsService,
  ) {
    this.emitter.setMaxListeners(100);
  }

  onModuleInit() {
    this.startMonitoring();
  }

  onModuleDestroy() {
    this.stopMonitoring();
  }

  private startMonitoring() {
    // Initial check
    this.checkHealth();

    // Periodic checks
    this.checkInterval = setInterval(() => {
      this.checkHealth();
    }, this.CHECK_INTERVAL_MS);

    this.logger.info('System health monitoring started (15s interval)');
  }

  private stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private async checkHealth() {
    try {
      const storageBreakdown = await this.storageBreakdownService.get();
      const [systemHealth, activeAlerts] = await Promise.all([
        this.systemHealthService.check(storageBreakdown),
        this.alertsService.get(storageBreakdown),
      ]);

      const changedFields = this.detectChanges(systemHealth, activeAlerts);

      if (changedFields.length > 0) {
        this.logger.info({ changedFields }, 'System health changed');
        this.emit({
          type: 'health:changed',
          data: {
            systemHealth,
            activeAlerts,
            changedFields,
            timestamp: new Date().toISOString(),
          },
        });
      }

      this.previousHealth = systemHealth;
      this.previousAlerts = activeAlerts;
    } catch (error) {
      this.logger.error({ error }, 'Failed to check system health');
    }
  }

  private detectChanges(
    currentHealth: SystemHealth,
    currentAlerts: ActiveAlerts,
  ): string[] {
    const changes: string[] = [];

    if (!this.previousHealth) {
      // First check - emit initial state
      return ['initial'];
    }

    // Check health changes
    if (this.previousHealth.database !== currentHealth.database) {
      changes.push(`database:${currentHealth.database}`);
    }
    if (this.previousHealth.redis !== currentHealth.redis) {
      changes.push(`redis:${currentHealth.redis}`);
    }
    if (this.previousHealth.scanner !== currentHealth.scanner) {
      changes.push(`scanner:${currentHealth.scanner}`);
    }
    if (this.previousHealth.storage !== currentHealth.storage) {
      changes.push(`storage:${currentHealth.storage}`);
    }

    // Check alert changes
    if (this.previousAlerts) {
      if (this.previousAlerts.scanErrors !== currentAlerts.scanErrors) {
        changes.push(`scanErrors:${currentAlerts.scanErrors}`);
      }
      if (this.previousAlerts.missingFiles !== currentAlerts.missingFiles) {
        changes.push(`missingFiles:${currentAlerts.missingFiles}`);
      }
    }

    return changes;
  }

  /**
   * Emit a health change event
   */
  private emit(event: HealthChangeEvent): void {
    this.emitter.emit('health-event', event);
  }

  /**
   * Subscribe to health events
   */
  subscribe(
    callback: (event: HealthChangeEvent) => void,
  ): () => void {
    this.emitter.on('health-event', callback);
    return () => this.emitter.off('health-event', callback);
  }

  /**
   * Get current health status (for initial SSE connection)
   */
  async getCurrentHealth(): Promise<{ systemHealth: SystemHealth; activeAlerts: ActiveAlerts }> {
    const storageBreakdown = await this.storageBreakdownService.get();
    const [systemHealth, activeAlerts] = await Promise.all([
      this.systemHealthService.check(storageBreakdown),
      this.alertsService.get(storageBreakdown),
    ]);
    return { systemHealth, activeAlerts };
  }
}
