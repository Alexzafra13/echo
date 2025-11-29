import { Module } from '@nestjs/common';
import { ExploreController } from './presentation/controller/explore.controller';
import { ExploreService } from './domain/services/explore.service';

/**
 * DrizzleService is provided globally via DrizzleModule
 */
@Module({
  controllers: [ExploreController],
  providers: [ExploreService],
  exports: [ExploreService],
})
export class ExploreModule {}
