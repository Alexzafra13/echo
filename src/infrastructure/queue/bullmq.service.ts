import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { cacheConfig } from '@config/cache.config';

@Injectable()
export class BullmqService implements OnModuleInit, OnModuleDestroy {
  private queues: Map<string, Queue> = new Map();
  private redisConnection!: Redis;
  private workers: Worker[] = [];

  async onModuleInit() {
    this.redisConnection = new Redis({
      host: cacheConfig.redis_host,
      port: cacheConfig.redis_port,
      password: cacheConfig.redis_password,
    });

    this.redisConnection.on('connect', () => {
      console.log('✅ BullMQ Redis conectado');
    });

    this.redisConnection.on('error', (err) => {
      console.error('❌ Error en BullMQ Redis:', err);
    });

    console.log('✅ BullMQ Service iniciado');
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
  ) {
    const worker = new Worker(queueName, processor, {
      connection: this.redisConnection,
    });

    worker.on('completed', (job) => {
      console.log(`✅ Job ${job.id} completado`);
    });

    worker.on('failed', (job, err) => {
      console.error(`❌ Job ${job?.id} falló:`, err);
    });

    this.workers.push(worker);
  }
}