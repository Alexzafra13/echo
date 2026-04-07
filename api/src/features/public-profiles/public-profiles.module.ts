import { Module } from '@nestjs/common';
import { AuthModule } from '@features/auth/auth.module';
import { PublicProfilesController } from './presentation/public-profiles.controller';
import { GetPublicProfileUseCase } from './domain/use-cases/get-public-profile';

@Module({
  imports: [AuthModule],
  controllers: [PublicProfilesController],
  providers: [
    GetPublicProfileUseCase,
  ],
  exports: [GetPublicProfileUseCase],
})
export class PublicProfilesModule {}
