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
  Sse,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { FastifyRequest } from 'fastify';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { Public } from '@shared/decorators/public.decorator';
import { SecuritySecretsService } from '@config/security-secrets.service';
import {
  SendFriendRequestUseCase,
  AcceptFriendRequestUseCase,
  RemoveFriendshipUseCase,
  GetFriendsUseCase,
  GetPendingRequestsUseCase,
  GetListeningFriendsUseCase,
  GetFriendsActivityUseCase,
  SearchUsersUseCase,
} from '../../domain/use-cases';
import {
  SendFriendRequestDto,
  FriendshipIdParamDto,
  SearchUsersQueryDto,
  ActivityQueryDto,
  FriendResponseDto,
  FriendshipResponseDto,
  PendingRequestsResponseDto,
  ListeningUserResponseDto,
  ActivityItemResponseDto,
  SearchUserResultDto,
  SocialOverviewResponseDto,
} from '../dtos/social.dto';
import { SocialMapper } from '../../infrastructure/mappers/social.mapper';
import {
  ListeningNowService,
  ListeningNowUpdate,
} from '../../domain/services/listening-now.service';

interface RequestWithUser extends Request {
  user: { id: string };
}

@ApiTags('social')
@ApiBearerAuth('JWT-auth')
@Controller('social')
@UseGuards(JwtAuthGuard)
export class SocialController {
  constructor(
    private readonly sendFriendRequestUseCase: SendFriendRequestUseCase,
    private readonly acceptFriendRequestUseCase: AcceptFriendRequestUseCase,
    private readonly removeFriendshipUseCase: RemoveFriendshipUseCase,
    private readonly getFriendsUseCase: GetFriendsUseCase,
    private readonly getPendingRequestsUseCase: GetPendingRequestsUseCase,
    private readonly getListeningFriendsUseCase: GetListeningFriendsUseCase,
    private readonly getFriendsActivityUseCase: GetFriendsActivityUseCase,
    private readonly searchUsersUseCase: SearchUsersUseCase,
    private readonly listeningNowService: ListeningNowService,
    private readonly jwtService: JwtService,
    private readonly secretsService: SecuritySecretsService
  ) {}

  // ============================================
  // Social Overview (main page data)
  // ============================================

  @Get()
  @ApiOperation({
    summary: 'Get social overview',
    description:
      'Returns friends, pending requests, listening now, and recent activity for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Social overview data',
    type: SocialOverviewResponseDto,
  })
  async getSocialOverview(@Request() req: RequestWithUser): Promise<SocialOverviewResponseDto> {
    const userId = req.user.id;

    const [friends, pendingRequests, listeningNow, recentActivity] = await Promise.all([
      this.getFriendsUseCase.execute(userId),
      this.getPendingRequestsUseCase.execute(userId),
      this.getListeningFriendsUseCase.execute(userId),
      this.getFriendsActivityUseCase.execute(userId, 10),
    ]);

    return {
      friends: friends.map(SocialMapper.toFriendResponse),
      pendingRequests: {
        received: pendingRequests.received.map(SocialMapper.toFriendResponse),
        sent: pendingRequests.sent.map(SocialMapper.toFriendResponse),
        count: pendingRequests.count,
      },
      listeningNow: listeningNow.map(SocialMapper.toListeningUserResponse),
      recentActivity: recentActivity.map(SocialMapper.toActivityItemResponse),
    };
  }

  // ============================================
  // Friends
  // ============================================

  @Get('friends')
  @ApiOperation({
    summary: 'Get friends list',
    description: 'Returns all accepted friends for the authenticated user',
  })
  @ApiResponse({ status: 200, description: 'List of friends', type: [FriendResponseDto] })
  async getFriends(@Request() req: RequestWithUser): Promise<FriendResponseDto[]> {
    const friends = await this.getFriendsUseCase.execute(req.user.id);
    return friends.map(SocialMapper.toFriendResponse);
  }

  @Post('friends/request')
  @ApiOperation({
    summary: 'Send friend request',
    description: 'Sends a friend request to another user',
  })
  @ApiResponse({ status: 201, description: 'Friend request sent', type: FriendshipResponseDto })
  @ApiResponse({ status: 409, description: 'Request already exists' })
  async sendFriendRequest(
    @Request() req: RequestWithUser,
    @Body() dto: SendFriendRequestDto
  ): Promise<FriendshipResponseDto> {
    const friendship = await this.sendFriendRequestUseCase.execute(req.user.id, dto.addresseeId);
    return SocialMapper.toFriendshipResponse(friendship);
  }

  @Post('friends/accept/:friendshipId')
  @ApiOperation({
    summary: 'Accept friend request',
    description: 'Accepts a pending friend request',
  })
  @ApiResponse({ status: 200, description: 'Friend request accepted', type: FriendshipResponseDto })
  @ApiResponse({ status: 404, description: 'Friend request not found' })
  async acceptFriendRequest(
    @Request() req: RequestWithUser,
    @Param() params: FriendshipIdParamDto
  ): Promise<FriendshipResponseDto> {
    const friendship = await this.acceptFriendRequestUseCase.execute(
      params.friendshipId,
      req.user.id
    );
    return SocialMapper.toFriendshipResponse(friendship);
  }

  @Delete('friends/:friendshipId')
  @ApiOperation({
    summary: 'Remove friendship',
    description: 'Removes an existing friendship or cancels a pending request',
  })
  @ApiResponse({ status: 200, description: 'Friendship removed' })
  @ApiResponse({ status: 404, description: 'Friendship not found' })
  async removeFriendship(
    @Request() req: RequestWithUser,
    @Param() params: FriendshipIdParamDto
  ): Promise<{ success: boolean }> {
    await this.removeFriendshipUseCase.execute(params.friendshipId, req.user.id);
    return { success: true };
  }

  // ============================================
  // Pending Requests
  // ============================================

  @Get('friends/pending')
  @ApiOperation({
    summary: 'Get pending friend requests',
    description: 'Returns received and sent pending friend requests',
  })
  @ApiResponse({ status: 200, description: 'Pending requests', type: PendingRequestsResponseDto })
  async getPendingRequests(@Request() req: RequestWithUser): Promise<PendingRequestsResponseDto> {
    const result = await this.getPendingRequestsUseCase.execute(req.user.id);
    return {
      received: result.received.map(SocialMapper.toFriendResponse),
      sent: result.sent.map(SocialMapper.toFriendResponse),
      count: result.count,
    };
  }

  // ============================================
  // Listening Now
  // ============================================

  @Get('listening')
  @ApiOperation({
    summary: 'Get friends currently listening',
    description: 'Returns friends that are currently playing music',
  })
  @ApiResponse({
    status: 200,
    description: 'Friends listening now',
    type: [ListeningUserResponseDto],
  })
  async getListeningFriends(@Request() req: RequestWithUser): Promise<ListeningUserResponseDto[]> {
    const users = await this.getListeningFriendsUseCase.execute(req.user.id);
    return users.map(SocialMapper.toListeningUserResponse);
  }

  // ============================================
  // Activity Feed
  // ============================================

  @Get('activity')
  @ApiOperation({
    summary: 'Get friends activity feed',
    description: 'Returns recent listening activity from friends',
  })
  @ApiResponse({ status: 200, description: 'Activity feed', type: [ActivityItemResponseDto] })
  async getFriendsActivity(
    @Request() req: RequestWithUser,
    @Query() query: ActivityQueryDto
  ): Promise<ActivityItemResponseDto[]> {
    const activities = await this.getFriendsActivityUseCase.execute(req.user.id, query.limit || 20);
    return activities.map(SocialMapper.toActivityItemResponse);
  }

  // ============================================
  // User Search
  // ============================================

  @Get('users/search')
  @ApiOperation({ summary: 'Search users', description: 'Search for users by username or name' })
  @ApiResponse({ status: 200, description: 'User search results', type: [SearchUserResultDto] })
  async searchUsers(
    @Request() req: RequestWithUser,
    @Query() query: SearchUsersQueryDto
  ): Promise<SearchUserResultDto[]> {
    const users = await this.searchUsersUseCase.execute(query.q, req.user.id, query.limit || 10);
    return users.map(SocialMapper.toSearchUserResult);
  }

  // ============================================
  // SSE: Real-time Listening Now Updates
  // ============================================

  // SSE: Listening now stream.
  // SECURITY: Requiere token JWT via query param (EventSource no soporta headers).
  // Se valida que el userId del query coincida con el del token para prevenir espionaje.
  @Sse('listening/stream')
  @Public()
  @ApiOperation({
    summary: 'Stream listening now updates (SSE)',
    description:
      'Server-Sent Events stream for real-time friend listening updates. Requires JWT token via query param.',
  })
  @ApiQuery({ name: 'userId', required: true, description: 'Authenticated user ID' })
  @ApiQuery({ name: 'token', required: true, description: 'JWT token for authentication' })
  @ApiResponse({ status: 200, description: 'SSE stream established' })
  streamListeningNow(
    @Query('userId') userId: string,
    @Query('token') token: string,
    @Req() request: FastifyRequest
  ): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      const validateAndStart = async () => {
        try {
          if (!token) {
            subscriber.error(new Error('Authentication required: token query parameter missing'));
            return;
          }

          // Verificar token JWT usando los servicios inyectados por NestJS DI
          const payload = await this.jwtService.verifyAsync(token, {
            secret: this.secretsService.jwtSecret,
          });
          const authenticatedUserId = payload.userId || payload.sub;

          // SECURITY: Verificar que el userId del query coincide con el del token
          if (userId !== authenticatedUserId) {
            subscriber.next({
              type: 'error',
              data: { message: 'Forbidden: userId does not match authenticated user' },
            } as MessageEvent);
            subscriber.complete();
            return;
          }

          // Autenticación exitosa, proceder con el stream
          this.startListeningStream(userId, subscriber, request);
        } catch {
          subscriber.next({
            type: 'error',
            data: { message: 'Invalid or expired token' },
          } as MessageEvent);
          subscriber.complete();
        }
      };

      validateAndStart();
    });
  }

  private startListeningStream(
    userId: string,
    subscriber: import('rxjs').Subscriber<MessageEvent>,
    request: FastifyRequest
  ): void {
    let friendIds: string[] = [];

    const refreshFriends = async () => {
      try {
        const friends = await this.getFriendsUseCase.execute(userId);
        friendIds = friends.map((f) => f.id);
      } catch {
        // Ignore errors, keep using cached friendIds
      }
    };

    refreshFriends();

    const friendsRefreshInterval = setInterval(refreshFriends, 5 * 60 * 1000);

    const handleUpdate = (update: ListeningNowUpdate) => {
      if (friendIds.includes(update.userId)) {
        subscriber.next({
          type: 'listening-update',
          data: {
            userId: update.userId,
            isPlaying: update.isPlaying,
            currentTrackId: update.currentTrackId,
            timestamp: update.timestamp.toISOString(),
          },
        } as MessageEvent);
      }
    };

    const unsubscribe = this.listeningNowService.subscribe(handleUpdate);

    const keepaliveInterval = setInterval(() => {
      subscriber.next({
        type: 'keepalive',
        data: { timestamp: Date.now() },
      } as MessageEvent);
    }, 30000);

    subscriber.next({
      type: 'connected',
      data: { userId, timestamp: Date.now() },
    } as MessageEvent);

    request.raw.on('close', () => {
      unsubscribe();
      clearInterval(keepaliveInterval);
      clearInterval(friendsRefreshInterval);
      subscriber.complete();
    });
  }
}
