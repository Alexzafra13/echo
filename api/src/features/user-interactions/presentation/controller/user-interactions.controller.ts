import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { RequestWithUser } from '@shared/types/request.types';
import {
  SetRatingUseCase,
  RemoveRatingUseCase,
  GetUserInteractionsUseCase,
  GetItemSummaryUseCase,
} from '../../domain/use-cases';
import { ItemType } from '../../domain/entities/user-interaction.entity';
import {
  SetRatingDto,
  GetUserInteractionsDto,
  ItemTypeDto,
} from '../dtos/interaction.dto';
import {
  RatingResponseDto,
  UserInteractionDto,
  ItemInteractionSummaryDto,
} from '../dtos/interaction-response.dto';

@ApiTags('interactions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('interactions')
export class UserInteractionsController {
  constructor(
    private readonly setRatingUseCase: SetRatingUseCase,
    private readonly removeRatingUseCase: RemoveRatingUseCase,
    private readonly getUserInteractionsUseCase: GetUserInteractionsUseCase,
    private readonly getItemSummaryUseCase: GetItemSummaryUseCase,
  ) {}

  @Post('rating')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set rating for an item (1-5 stars)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Rating set successfully',
    type: RatingResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid rating value' })
  async setRating(@Body() dto: SetRatingDto, @Req() req: RequestWithUser): Promise<RatingResponseDto> {
    const userId = req.user.id;
    const result = await this.setRatingUseCase.execute(userId, dto.itemId, dto.itemType as ItemType, dto.rating);

    return {
      userId: result.userId,
      itemId: result.itemId,
      itemType: result.itemType,
      rating: result.rating,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  @Delete('rating/:itemType/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove rating from an item' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Rating removed successfully',
  })
  async removeRating(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Param('itemType') itemType: ItemTypeDto,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    const userId = req.user.id;
    await this.removeRatingUseCase.execute(userId, itemId, itemType as ItemType);
  }

  @SkipThrottle()
  @Get('me')
  @ApiOperation({ summary: 'Get all ratings for the current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User ratings retrieved successfully',
    type: [UserInteractionDto],
  })
  async getUserInteractions(
    @Query() query: GetUserInteractionsDto,
    @Req() req: RequestWithUser,
  ): Promise<UserInteractionDto[]> {
    const userId = req.user.id;
    const interactions = await this.getUserInteractionsUseCase.execute(userId, query.itemType as ItemType | undefined);

    return interactions.map((interaction) => ({
      userId: interaction.userId,
      itemId: interaction.itemId,
      itemType: interaction.itemType,
      rating: interaction.rating,
      ratedAt: interaction.ratedAt,
    }));
  }

  @SkipThrottle()
  @Get('item/:itemType/:itemId')
  @ApiOperation({ summary: 'Get rating summary for an item' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Item rating summary retrieved successfully',
    type: ItemInteractionSummaryDto,
  })
  async getItemSummary(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Param('itemType') itemType: ItemTypeDto,
    @Req() req: RequestWithUser,
  ): Promise<ItemInteractionSummaryDto> {
    const userId = req.user.id;
    const summary = await this.getItemSummaryUseCase.execute(itemId, itemType as ItemType, userId);

    return {
      itemId: summary.itemId,
      itemType: summary.itemType,
      userRating: summary.userRating,
      averageRating: summary.averageRating,
      totalRatings: summary.totalRatings,
    };
  }
}
