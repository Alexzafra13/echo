import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { cacheConfig } from '@config/cache.config';

@Injectable()
export class BullmqService implements OnModuleInit, OnModuleDestroy {
  private queues: Map<string, Queue> = new Map();
  private redisConnection!: Redis;
  private workers: Worker[] = [];

  constructor(
    @InjectPinoLogger(BullmqService.name)
    private readonly logger: PinoLogger,
  ) {}

  async onModuleInit() {
    this.redisConnection = new Redis({
      host: cacheConfig.redis_host,
      port: cacheConfig.redis_port,
      password: cacheConfig.redis_password,
      maxRetriesPerRequest: null, // Required by BullMQ for blocking operations
    });

    this.redisConnection.on('connect', () => {
      this.logger.info({
        host: cacheConfig.redis_host,
        port: cacheConfig.redis_port,
      }, 'BullMQ Redis connected');
    });

    this.redisConnection.on('error', (err) => {
      this.logger.error({
        error: err,
        host: cacheConfig.redis_host,
        port: cacheConfig.redis_port,
      }, 'BullMQ Redis error');
    });

    this.logger.info('BullMQ Service initialized');
  }

  async onModuleDestroy() {
    // Cerrar todos los workers
    for (const worker of this.workers) {
      await worker.close();
    }

    // Cerrar todas las queues
    for (const queue of this.queues.values()) {
      await queue.close();
    }

    // Cerrar la conexión Redis
    await this.redisConnection.quit();
  }

  createQueue(name: string): Queue {
    const existingQueue = this.queues.get(name);
    if (existingQueue) {
      return existingQueue;
    }

    const queue = new Queue(name, {
      connection: this.redisConnection,
    });

    this.queues.set(name, queue);
    return queue;
  }

  async addJob(queueName: string, jobName: string, data: any, opts?: any) {
    const queue = this.createQueue(queueName);
    return await queue.add(jobName, data, opts);
  }

  registerProcessor(
    queueName: string,
    processor: (job: any) => Promise<any>,
    options?: { concurrency?: number },
  ): Worker | null {
    try {
      const worker = new Worker(queueName, processor, {
        connection: this.redisConnection,
        concurrency: options?.concurrency ?? 1,
      });

      worker.on('completed', (job) => {
        this.logger.debug({
          jobId: job.id,
          jobName: job.name,
          queueName,
        }, 'Job completed successfully');
      });

      worker.on('failed', (job, err) => {
        this.logger.error({
          jobId: job?.id,
          jobName: job?.name,
          queueName,
          error: err.message,
        }, 'Job failed');
      });

      worker.on('error', (err) => {
        this.logger.error({
          queueName,
          error: err.message,
        }, 'Worker error');
      });

      this.workers.push(worker);
      this.logger.info({ queueName, concurrency: options?.concurrency ?? 1 }, 'Worker registered');

      return worker;
    } catch (error) {
      this.logger.error({
        queueName,
        error: error instanceof Error ? error.message : String(error),
      }, 'Failed to register processor');
      return null;
    }
  }
}