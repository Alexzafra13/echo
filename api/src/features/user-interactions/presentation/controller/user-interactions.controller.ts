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
  ToggleLikeUseCase,
  ToggleDislikeUseCase,
  SetRatingUseCase,
  RemoveRatingUseCase,
  GetUserInteractionsUseCase,
  GetItemSummaryUseCase,
} from '../../domain/use-cases';
import {
  ToggleLikeDto,
  ToggleDislikeDto,
  SetRatingDto,
  GetUserInteractionsDto,
  GetItemSummaryDto,
  ItemTypeDto,
} from '../dtos/interaction.dto';
import {
  ToggleLikeResponseDto,
  ToggleDislikeResponseDto,
  RatingResponseDto,
  UserInteractionDto,
  ItemInteractionSummaryDto,
  InteractionStatsDto,
} from '../dtos/interaction-response.dto';

@ApiTags('interactions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('interactions')
export class UserInteractionsController {
  constructor(
    private readonly toggleLikeUseCase: ToggleLikeUseCase,
    private readonly toggleDislikeUseCase: ToggleDislikeUseCase,
    private readonly setRatingUseCase: SetRatingUseCase,
    private readonly removeRatingUseCase: RemoveRatingUseCase,
    private readonly getUserInteractionsUseCase: GetUserInteractionsUseCase,
    private readonly getItemSummaryUseCase: GetItemSummaryUseCase,
  ) {}

  /**
   * POST /interactions/like
   * Toggle like on an item (track, album, artist, playlist)
   */
  @Post('like')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle like on an item' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Like toggled successfully',
    type: ToggleLikeResponseDto,
  })
  async toggleLike(@Body() dto: ToggleLikeDto, @Req() req: RequestWithUser): Promise<ToggleLikeResponseDto> {
    const userId = req.user.id;
    const result = await this.toggleLikeUseCase.execute(userId, dto.itemId, dto.itemType as any);

    return {
      liked: result.liked,
      likedAt: result.data?.starredAt,
    };
  }

  /**
   * POST /interactions/dislike
   * Toggle dislike on an item (track, album, artist, playlist)
   */
  @Post('dislike')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle dislike on an item' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dislike toggled successfully',
    type: ToggleDislikeResponseDto,
  })
  async toggleDislike(@Body() dto: ToggleDislikeDto, @Req() req: RequestWithUser): Promise<ToggleDislikeResponseDto> {
    const userId = req.user.id;
    const result = await this.toggleDislikeUseCase.execute(userId, dto.itemId, dto.itemType as any);

    return {
      disliked: result.disliked,
      dislikedAt: result.data?.starredAt,
    };
  }

  /**
   * POST /interactions/rating
   * Set rating for an item (1-5 stars)
   */
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
    const result = await this.setRatingUseCase.execute(userId, dto.itemId, dto.itemType as any, dto.rating);

    return {
      userId: result.userId,
      itemId: result.itemId,
      itemType: result.itemType,
      rating: result.rating,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  /**
   * DELETE /interactions/rating/:itemId/:itemType
   * Remove rating from an item
   */
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
    await this.removeRatingUseCase.execute(userId, itemId, itemType as any);
  }

  /**
   * GET /interactions/me
   * Get all interactions for the current user
   */
  @SkipThrottle() // Skip rate limiting for read-only endpoint
  @Get('me')
  @ApiOperation({ summary: 'Get all interactions for the current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User interactions retrieved successfully',
    type: [UserInteractionDto],
  })
  async getUserInteractions(
    @Query() query: GetUserInteractionsDto,
    @Req() req: RequestWithUser,
  ): Promise<UserInteractionDto[]> {
    const userId = req.user.id;
    const interactions = await this.getUserInteractionsUseCase.execute(userId, query.itemType as any);

    return interactions.map((interaction) => ({
      userId: interaction.userId,
      itemId: interaction.itemId,
      itemType: interaction.itemType,
      sentiment: interaction.sentiment,
      rating: interaction.rating,
      isStarred: interaction.isStarred,
      starredAt: interaction.starredAt,
      ratedAt: interaction.ratedAt,
    }));
  }

  /**
   * GET /interactions/item/:itemType/:itemId
   * Get interaction summary for an item
   */
  @SkipThrottle() // Skip rate limiting for read-only endpoint (prevents 429 errors on track lists)
  @Get('item/:itemType/:itemId')
  @ApiOperation({ summary: 'Get interaction summary for an item' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Item interaction summary retrieved successfully',
    type: ItemInteractionSummaryDto,
  })
  async getItemSummary(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Param('itemType') itemType: ItemTypeDto,
    @Req() req: RequestWithUser,
  ): Promise<ItemInteractionSummaryDto> {
    const userId = req.user.id;
    const summary = await this.getItemSummaryUseCase.execute(itemId, itemType as any, userId);

    return {
      itemId: summary.itemId,
      itemType: summary.itemType,
      userSentiment: summary.userSentiment,
      userRating: summary.userRating,
      totalLikes: summary.totalLikes,
      totalDislikes: summary.totalDislikes,
      averageRating: summary.averageRating,
      totalRatings: summary.totalRatings,
    };
  }
}
