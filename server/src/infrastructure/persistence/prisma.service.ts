import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(
    @InjectPinoLogger(PrismaService.name)
    private readonly logger: PinoLogger,
  ) {
    // Prisma 7: datasource URL ya no está en schema.prisma
    super({
      datasourceUrl: process.env.DATABASE_URL,
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.info('Prisma connected to database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.info('Prisma disconnected from database');
  }
}