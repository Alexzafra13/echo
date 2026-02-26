import { Module } from '@nestjs/common';
import { CHAT_REPOSITORY } from './domain/ports';
import { DrizzleChatRepository } from './infrastructure/persistence/chat.repository';
import { ChatController } from './presentation/controller/chat.controller';
import { ChatGateway } from './infrastructure/gateways/chat.gateway';

@Module({
  controllers: [ChatController],
  providers: [
    {
      provide: CHAT_REPOSITORY,
      useClass: DrizzleChatRepository,
    },
    ChatGateway,
  ],
  exports: [CHAT_REPOSITORY],
})
export class ChatModule {}
