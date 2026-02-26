import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RequestWithUser } from '@shared/types/request.types';
import { Inject } from '@nestjs/common';
import { CHAT_REPOSITORY, IChatRepository } from '../../domain/ports';
import { SendMessageDto, StartConversationDto, GetMessagesQueryDto } from '../dtos/chat.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    @Inject(CHAT_REPOSITORY)
    private readonly chatRepo: IChatRepository
  ) {}

  @Get('conversations')
  async getConversations(@Request() req: RequestWithUser) {
    return this.chatRepo.getConversations(req.user.id);
  }

  @Post('conversations')
  async startConversation(@Request() req: RequestWithUser, @Body() dto: StartConversationDto) {
    const conversationId = await this.chatRepo.getOrCreateConversation(
      req.user.id,
      dto.otherUserId
    );
    return { conversationId };
  }

  @Get('conversations/:id/messages')
  async getMessages(
    @Request() req: RequestWithUser,
    @Param('id') conversationId: string,
    @Query() query: GetMessagesQueryDto
  ) {
    const isParticipant = await this.chatRepo.isParticipant(conversationId, req.user.id);
    if (!isParticipant) {
      throw new ForbiddenException('Not a participant of this conversation');
    }

    return this.chatRepo.getMessages(conversationId, req.user.id, 50, query.before);
  }

  @Post('conversations/:id/messages')
  async sendMessage(
    @Request() req: RequestWithUser,
    @Param('id') conversationId: string,
    @Body() dto: SendMessageDto
  ) {
    const isParticipant = await this.chatRepo.isParticipant(conversationId, req.user.id);
    if (!isParticipant) {
      throw new ForbiddenException('Not a participant of this conversation');
    }

    return this.chatRepo.sendMessage(conversationId, req.user.id, dto.content);
  }

  @Post('conversations/:id/read')
  async markAsRead(@Request() req: RequestWithUser, @Param('id') conversationId: string) {
    const isParticipant = await this.chatRepo.isParticipant(conversationId, req.user.id);
    if (!isParticipant) {
      throw new ForbiddenException('Not a participant of this conversation');
    }

    await this.chatRepo.markAsRead(conversationId, req.user.id);
    return { success: true };
  }

  @Delete('conversations/:id')
  async deleteConversation(@Request() req: RequestWithUser, @Param('id') conversationId: string) {
    await this.chatRepo.deleteConversation(conversationId, req.user.id);
    return { success: true };
  }
}
