import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '@infrastructure/persistence/prisma.module';
import { AuthController } from './presentation/auth.controller';
import { LoginUseCase, RegisterUserUseCase, RefreshTokenUseCase } from './domain/use-cases';
import { PrismaUserRepository } from './infrastructure/persistence/user.repository';
import { JwtAdapter } from './infrastructure/adapters/jwt.adapter';
import { BcryptAdapter } from './infrastructure/adapters/bcrypt.adapter';
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { USER_REPOSITORY, TOKEN_SERVICE, PASSWORD_SERVICE } from './domain/ports';

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secret',
      signOptions: {
        expiresIn: process.env.JWT_EXPIRATION || '24h',
      } as any,
    }),
  ],
  controllers: [AuthController],
  providers: [
    // Use Cases
    LoginUseCase,
    RegisterUserUseCase,
    RefreshTokenUseCase,

    // Repository
    PrismaUserRepository,

    // Repository implementation
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },

    // Service implementations
    {
      provide: TOKEN_SERVICE,
      useClass: JwtAdapter,
    },
    {
      provide: PASSWORD_SERVICE,
      useClass: BcryptAdapter,
    },

    // Passport strategy
    JwtStrategy,
  ],
  exports: [USER_REPOSITORY, TOKEN_SERVICE, PASSWORD_SERVICE],
})
export class AuthModule {}