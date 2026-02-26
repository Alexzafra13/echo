import { IsString, IsNotEmpty, MaxLength, IsOptional, IsUUID } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content!: string;
}

export class StartConversationDto {
  @IsUUID()
  @IsNotEmpty()
  otherUserId!: string;
}

export class GetMessagesQueryDto {
  @IsOptional()
  @IsString()
  before?: string;
}
