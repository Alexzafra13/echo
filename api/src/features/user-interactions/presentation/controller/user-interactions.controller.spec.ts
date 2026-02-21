import { Test, TestingModule } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { UserInteractionsController } from './user-interactions.controller';
import {
  SetRatingUseCase,
  RemoveRatingUseCase,
  GetUserInteractionsUseCase,
  GetItemSummaryUseCase,
} from '../../domain/use-cases';
import { RequestWithUser } from '@shared/types/request.types';
import { SetRatingDto, GetUserInteractionsDto, ItemTypeDto } from '../dtos/interaction.dto';
import {
  RatingResponseDto,
  UserInteractionDto,
  ItemInteractionSummaryDto,
} from '../dtos/interaction-response.dto';

describe('UserInteractionsController', () => {
  let controller: UserInteractionsController;
  let setRatingUseCase: jest.Mocked<SetRatingUseCase>;
  let removeRatingUseCase: jest.Mocked<RemoveRatingUseCase>;
  let getUserInteractionsUseCase: jest.Mocked<GetUserInteractionsUseCase>;
  let getItemSummaryUseCase: jest.Mocked<GetItemSummaryUseCase>;

  const mockUser = { id: 'user-1', username: 'testuser' };

  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserInteractionsController],
      providers: [
        { provide: SetRatingUseCase, useValue: { execute: jest.fn() } },
        { provide: RemoveRatingUseCase, useValue: { execute: jest.fn() } },
        { provide: GetUserInteractionsUseCase, useValue: { execute: jest.fn() } },
        { provide: GetItemSummaryUseCase, useValue: { execute: jest.fn() } },
        { provide: getLoggerToken(UserInteractionsController.name), useValue: mockLogger },
      ],
    }).compile();

    controller = module.get<UserInteractionsController>(UserInteractionsController);
    setRatingUseCase = module.get(SetRatingUseCase);
    removeRatingUseCase = module.get(RemoveRatingUseCase);
    getUserInteractionsUseCase = module.get(GetUserInteractionsUseCase);
    getItemSummaryUseCase = module.get(GetItemSummaryUseCase);
  });

  describe('setRating', () => {
    it('should set a rating and return the result', async () => {
      const mockResult = {
        userId: 'user-1',
        itemId: 'track-1',
        itemType: 'track',
        rating: 5,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      };

      setRatingUseCase.execute.mockResolvedValue(mockResult as unknown as RatingResponseDto);

      const dto = { itemId: 'track-1', itemType: 'track', rating: 5 };
      const req = { user: mockUser } as unknown as RequestWithUser;

      const result = await controller.setRating(dto as SetRatingDto, req);

      expect(setRatingUseCase.execute).toHaveBeenCalledWith('user-1', 'track-1', 'track', 5);
      expect(result.rating).toBe(5);
      expect(result.itemId).toBe('track-1');
    });
  });

  describe('removeRating', () => {
    it('should remove a rating for an item', async () => {
      removeRatingUseCase.execute.mockResolvedValue(undefined);

      const req = { user: mockUser } as unknown as RequestWithUser;

      await controller.removeRating('track-1', 'track' as ItemTypeDto, req);

      expect(removeRatingUseCase.execute).toHaveBeenCalledWith('user-1', 'track-1', 'track');
    });
  });

  describe('getUserInteractions', () => {
    it('should return user interactions', async () => {
      const mockInteractions = [
        {
          userId: 'user-1',
          itemId: 'track-1',
          itemType: 'track',
          rating: 4,
          ratedAt: new Date('2025-01-01'),
        },
      ];

      getUserInteractionsUseCase.execute.mockResolvedValue(
        mockInteractions as unknown as UserInteractionDto[]
      );

      const req = { user: mockUser } as unknown as RequestWithUser;
      const query = { itemType: 'track' };

      const result = await controller.getUserInteractions(query as GetUserInteractionsDto, req);

      expect(getUserInteractionsUseCase.execute).toHaveBeenCalledWith('user-1', 'track');
      expect(result).toHaveLength(1);
      expect(result[0].rating).toBe(4);
    });

    it('should return all interactions when no itemType filter', async () => {
      getUserInteractionsUseCase.execute.mockResolvedValue([]);

      const req = { user: mockUser } as unknown as RequestWithUser;
      const query = {};

      const result = await controller.getUserInteractions(query as GetUserInteractionsDto, req);

      expect(getUserInteractionsUseCase.execute).toHaveBeenCalledWith('user-1', undefined);
      expect(result).toEqual([]);
    });
  });

  describe('getItemSummary', () => {
    it('should return the rating summary for an item', async () => {
      const mockSummary = {
        itemId: 'track-1',
        itemType: 'track',
        userRating: 5,
        averageRating: 4.2,
        totalRatings: 10,
      };

      getItemSummaryUseCase.execute.mockResolvedValue(
        mockSummary as unknown as ItemInteractionSummaryDto
      );

      const req = { user: mockUser } as unknown as RequestWithUser;

      const result = await controller.getItemSummary('track-1', 'track' as ItemTypeDto, req);

      expect(getItemSummaryUseCase.execute).toHaveBeenCalledWith('track-1', 'track', 'user-1');
      expect(result.averageRating).toBe(4.2);
      expect(result.totalRatings).toBe(10);
      expect(result.userRating).toBe(5);
    });
  });
});
