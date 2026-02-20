import { Test, TestingModule } from '@nestjs/testing';
import { EnrichmentHistoryController } from './enrichment-history.controller';
import { ListEnrichmentLogsUseCase } from '../infrastructure/use-cases/list-enrichment-logs';
import { GetEnrichmentStatsUseCase } from '../infrastructure/use-cases/get-enrichment-stats';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';

jest.mock('./dtos', () => ({
  ListEnrichmentLogsResponseDto: { fromDomain: jest.fn((data) => data) },
  GetEnrichmentStatsResponseDto: { fromDomain: jest.fn((data) => data) },
  ListEnrichmentLogsRequestDto: jest.fn(),
  GetEnrichmentStatsRequestDto: jest.fn(),
}));

describe('EnrichmentHistoryController', () => {
  let controller: EnrichmentHistoryController;
  let listEnrichmentLogsUseCase: jest.Mocked<ListEnrichmentLogsUseCase>;
  let getEnrichmentStatsUseCase: jest.Mocked<GetEnrichmentStatsUseCase>;

  const mockListEnrichmentLogsUseCase = {
    execute: jest.fn(),
  };

  const mockGetEnrichmentStatsUseCase = {
    execute: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnrichmentHistoryController],
      providers: [
        {
          provide: ListEnrichmentLogsUseCase,
          useValue: mockListEnrichmentLogsUseCase,
        },
        {
          provide: GetEnrichmentStatsUseCase,
          useValue: mockGetEnrichmentStatsUseCase,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<EnrichmentHistoryController>(EnrichmentHistoryController);
    listEnrichmentLogsUseCase = module.get(ListEnrichmentLogsUseCase);
    getEnrichmentStatsUseCase = module.get(GetEnrichmentStatsUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('listEnrichmentLogs', () => {
    it('should pass query params to use case and call fromDomain', async () => {
      const query = {
        skip: 0,
        take: 10,
        entityType: 'SONG',
        provider: 'SPOTIFY',
        status: 'SUCCESS',
        entityId: 'entity-123',
        userId: 'user-123',
      };

      const mockResult = {
        logs: [],
        total: 0,
      };

      mockListEnrichmentLogsUseCase.execute.mockResolvedValue(mockResult);

      const { ListEnrichmentLogsResponseDto } = await import('./dtos');

      await controller.listEnrichmentLogs(query);

      expect(mockListEnrichmentLogsUseCase.execute).toHaveBeenCalledWith({
        skip: query.skip,
        take: query.take,
        entityType: query.entityType,
        provider: query.provider,
        status: query.status,
        entityId: query.entityId,
        userId: query.userId,
        startDate: undefined,
        endDate: undefined,
      });

      expect(ListEnrichmentLogsResponseDto.fromDomain).toHaveBeenCalledWith(mockResult);
    });

    it('should convert startDate and endDate strings to Date objects', async () => {
      const query = {
        skip: 0,
        take: 10,
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-12-31T23:59:59.999Z',
      };

      const mockResult = {
        logs: [],
        total: 0,
      };

      mockListEnrichmentLogsUseCase.execute.mockResolvedValue(mockResult);

      const { ListEnrichmentLogsResponseDto } = await import('./dtos');

      await controller.listEnrichmentLogs(query);

      expect(mockListEnrichmentLogsUseCase.execute).toHaveBeenCalledWith({
        skip: query.skip,
        take: query.take,
        entityType: undefined,
        provider: undefined,
        status: undefined,
        entityId: undefined,
        userId: undefined,
        startDate: new Date(query.startDate),
        endDate: new Date(query.endDate),
      });

      expect(ListEnrichmentLogsResponseDto.fromDomain).toHaveBeenCalledWith(mockResult);
    });
  });

  describe('getEnrichmentStats', () => {
    it('should pass period to use case and call fromDomain', async () => {
      const query = {
        period: 'WEEK',
      };

      const mockResult = {
        totalEnrichments: 100,
        successRate: 95.5,
        providerStats: [],
      };

      mockGetEnrichmentStatsUseCase.execute.mockResolvedValue(mockResult);

      const { GetEnrichmentStatsResponseDto } = await import('./dtos');

      await controller.getEnrichmentStats(query);

      expect(mockGetEnrichmentStatsUseCase.execute).toHaveBeenCalledWith({
        period: query.period,
      });

      expect(GetEnrichmentStatsResponseDto.fromDomain).toHaveBeenCalledWith(mockResult);
    });
  });
});
