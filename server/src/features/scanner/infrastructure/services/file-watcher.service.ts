import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import chokidar, { FSWatcher } from 'chokidar';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { join } from 'path';
import { stat } from 'fs/promises';

/**
 * FileWatcherService - Monitorea cambios en la biblioteca de música
 *
 * Funcionalidad:
 * - Detecta archivos nuevos/modificados/eliminados automáticamente
 * - Escanea incrementalmente solo los archivos que cambiaron
 * - Debouncing para evitar escaneos mientras se copian archivos
 * - Configurable (se puede desactivar con AUTO_SCAN=false)
 *
 * Similar a Navidrome: Los discos nuevos aparecen automáticamente sin intervención manual
 */
@Injectable()
export class FileWatcherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FileWatcherService.name);
  private watcher?: FSWatcher;
  private pendingFiles = new Set<string>();
  private debounceTimer?: NodeJS.Timeout;
  private readonly DEBOUNCE_MS = 5000; // 5 segundos después del último cambio
  private readonly SUPPORTED_EXTENSIONS = ['.mp3', '.flac', '.m4a', '.ogg', '.wav', '.opus'];

  constructor(
    private readonly configService: ConfigService,
    @InjectQueue('scanner') private scannerQueue: Queue,
  ) {}

  /**
   * Inicia el file watcher al iniciar el módulo
   */
  async onModuleInit() {
    const autoScanEnabled = this.configService.get<string>('AUTO_SCAN', 'true') === 'true';

    if (!autoScanEnabled) {
      this.logger.log('📁 Auto-scan desactivado (AUTO_SCAN=false)');
      return;
    }

    const musicPath = this.configService.get<string>('UPLOAD_PATH');

    if (!musicPath) {
      this.logger.warn('⚠️ UPLOAD_PATH no configurado, auto-scan desactivado');
      return;
    }

    await this.startWatching(musicPath);
  }

  /**
   * Detiene el file watcher al destruir el módulo
   */
  async onModuleDestroy() {
    await this.stopWatching();
  }

  /**
   * Inicia el monitoreo de la carpeta de música
   */
  private async startWatching(path: string): Promise<void> {
    try {
      this.logger.log(`🔍 Iniciando file watcher en: ${path}`);

      this.watcher = chokidar.watch(path, {
        ignored: [
          /(^|[\/\\])\../, // Archivos ocultos
          '**/node_modules/**',
          '**/.git/**',
          '**/covers/**', // Ignorar cache de covers
        ],
        persistent: true,
        ignoreInitial: true, // No escanear archivos existentes al iniciar
        awaitWriteFinish: {
          stabilityThreshold: 2000, // Esperar 2s de estabilidad
          pollInterval: 100,
        },
        depth: 10, // Máximo 10 niveles de profundidad
        usePolling: false, // Usar eventos nativos del OS
        alwaysStat: true, // Obtener stats de los archivos
      });

      // Eventos del watcher
      this.watcher
        .on('add', (filePath) => this.handleFileAdded(filePath))
        .on('change', (filePath) => this.handleFileChanged(filePath))
        .on('unlink', (filePath) => this.handleFileDeleted(filePath))
        .on('error', (error) => this.handleError(error))
        .on('ready', () => this.handleReady(path));

    } catch (error) {
      this.logger.error(`❌ Error iniciando file watcher:`, error);
    }
  }

  /**
   * Detiene el file watcher
   */
  private async stopWatching(): Promise<void> {
    if (this.watcher) {
      this.logger.log('⏹️ Deteniendo file watcher...');
      await this.watcher.close();
      this.watcher = undefined;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }

  /**
   * Maneja archivos nuevos detectados
   */
  private handleFileAdded(filePath: string): void {
    if (!this.isSupportedFile(filePath)) {
      return;
    }

    this.logger.debug(`📄 Archivo nuevo detectado: ${filePath}`);
    this.addToPendingQueue(filePath);
  }

  /**
   * Maneja archivos modificados
   */
  private handleFileChanged(filePath: string): void {
    if (!this.isSupportedFile(filePath)) {
      return;
    }

    this.logger.debug(`🔄 Archivo modificado: ${filePath}`);
    this.addToPendingQueue(filePath);
  }

  /**
   * Maneja archivos eliminados
   */
  private handleFileDeleted(filePath: string): void {
    if (!this.isSupportedFile(filePath)) {
      return;
    }

    this.logger.debug(`🗑️ Archivo eliminado: ${filePath}`);
    // TODO: Implementar eliminación de tracks de la BD
    // Por ahora lo dejamos, el scan completo manual limpiará tracks huérfanos
  }

  /**
   * Maneja errores del watcher
   */
  private handleError(error: Error): void {
    this.logger.error(`❌ Error en file watcher:`, error);
  }

  /**
   * Watcher listo y monitoreando
   */
  private handleReady(path: string): void {
    this.logger.log(`✅ File watcher activo, monitoreando: ${path}`);
    this.logger.log(`🎵 Extensiones soportadas: ${this.SUPPORTED_EXTENSIONS.join(', ')}`);
    this.logger.log(`⏱️ Debounce: ${this.DEBOUNCE_MS / 1000}s después del último cambio`);
  }

  /**
   * Verifica si el archivo es soportado (por extensión)
   */
  private isSupportedFile(filePath: string): boolean {
    const ext = filePath.toLowerCase();
    return this.SUPPORTED_EXTENSIONS.some(supported => ext.endsWith(supported));
  }

  /**
   * Agrega archivo a la cola de pendientes y programa escaneo
   */
  private addToPendingQueue(filePath: string): void {
    this.pendingFiles.add(filePath);

    // Reiniciar timer de debounce
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.processPendingFiles();
    }, this.DEBOUNCE_MS);
  }

  /**
   * Procesa archivos pendientes (después del debounce)
   */
  private async processPendingFiles(): Promise<void> {
    if (this.pendingFiles.size === 0) {
      return;
    }

    const files = Array.from(this.pendingFiles);
    this.pendingFiles.clear();

    this.logger.log(`🚀 Procesando ${files.length} archivo(s) detectado(s)...`);

    try {
      // Verificar que los archivos existan (podrían haberse borrado)
      const existingFiles: string[] = [];
      for (const file of files) {
        try {
          await stat(file);
          existingFiles.push(file);
        } catch {
          this.logger.debug(`⚠️ Archivo ya no existe: ${file}`);
        }
      }

      if (existingFiles.length === 0) {
        this.logger.log('ℹ️ No hay archivos válidos para procesar');
        return;
      }

      // Agregar job de escaneo incremental a la cola
      await this.scannerQueue.add('incremental-scan', {
        files: existingFiles,
        source: 'file-watcher',
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`✅ ${existingFiles.length} archivo(s) agregado(s) a cola de escaneo`);
    } catch (error) {
      this.logger.error(`❌ Error procesando archivos pendientes:`, error);
    }
  }

  /**
   * Obtiene estadísticas del watcher
   */
  getStats() {
    return {
      active: !!this.watcher,
      pendingFiles: this.pendingFiles.size,
      watchedPath: this.configService.get<string>('UPLOAD_PATH'),
    };
  }

  /**
   * Permite pausar/reanudar el watcher manualmente
   */
  async pause(): Promise<void> {
    await this.stopWatching();
    this.logger.log('⏸️ File watcher pausado');
  }

  async resume(): Promise<void> {
    const musicPath = this.configService.get<string>('UPLOAD_PATH');
    if (musicPath) {
      await this.startWatching(musicPath);
      this.logger.log('▶️ File watcher reanudado');
    }
  }
}
