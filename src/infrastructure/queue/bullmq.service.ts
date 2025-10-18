import { Injectable, OnModuleInit } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { cacheConfig } from 'src/config/cache.config';

@Injectable()
export class BullmqService implements OnModuleInit {
  private queues: Map<string, Queue> = new Map();
  private redisConnection: Redis;

  async onModuleInit() {
    this.redisConnection = new Redis({
      host: cacheConfig.redis_host,
      port: cacheConfig.redis_port,
      password: cacheConfig.redis_password,
    });

    console.log('✅ BullMQ Service iniciado');
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

  registerProcessor(queueName: string, processor: (job: any) => Promise<any>) {
    const queue = this.createQueue(queueName);
    new Worker(queueName, processor, {
      connection: this.redisConnection,
    });
  }
}