import { GetScansHistoryUseCase } from './get-scans-history.use-case';
import { IScannerRepository } from '../../ports/scanner-repository.port';
import { LibraryScan } from '../../entities/library-scan.entity';

describe('GetScansHistoryUseCase', () => {
  let useCase: GetScansHistoryUseCase;
  let mockRepo: jest.Mocked<IScannerRepository>;

  const createScan = (overrides: Partial<{
    id: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    startedAt: Date;
    finishedAt: Date;
    tracksAdded: number;
    tracksUpdated: number;
    tracksDeleted: number;
    errorMessage: string;
  }> = {}) => LibraryScan.fromPrimitives({
    id: overrides.id || 'scan-1',
    status: overrides.status || 'completed',
    startedAt: overrides.startedAt || new Date('2024-01-01T10:00:00Z'),
    finishedAt: overrides.finishedAt || new Date('2024-01-01T10:05:00Z'),
    tracksAdded: overrides.tracksAdded ?? 10,
    tracksUpdated: overrides.tracksUpdated ?? 5,
    tracksDeleted: overrides.tracksDeleted ?? 2,
    errorMessage: overrides.errorMessage,
  });

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findLatest: jest.fn(),
      findByStatus: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    };

    useCase = new GetScansHistoryUseCase(mockRepo);
  });

  it('should return paginated scan history with defaults', async () => {
    const scans = [createScan({ id: 'scan-1' }), createScan({ id: 'scan-2' })];
    mockRepo.findAll.mockResolvedValue(scans);
    mockRepo.count.mockResolvedValue(2);

    const result = await useCase.execute();

    expect(mockRepo.findAll).toHaveBeenCalledWith(0, 20);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.total).toBe(2);
    expect(result.totalPages).toBe(1);
    expect(result.scans).toHaveLength(2);
  });

  it('should calculate skip correctly for page 2', async () => {
    mockRepo.findAll.mockResolvedValue([]);
    mockRepo.count.mockResolvedValue(30);

    const result = await useCase.execute({ page: 2, limit: 10 });

    expect(mockRepo.findAll).toHaveBeenCalledWith(10, 10);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
    expect(result.totalPages).toBe(3);
  });

  it('should map scan entities to history items with totalChanges', async () => {
    const scan = createScan({
      tracksAdded: 10,
      tracksUpdated: 5,
      tracksDeleted: 2,
    });
    mockRepo.findAll.mockResolvedValue([scan]);
    mockRepo.count.mockResolvedValue(1);

    const result = await useCase.execute();

    expect(result.scans[0]).toEqual({
      id: 'scan-1',
      status: 'completed',
      startedAt: new Date('2024-01-01T10:00:00Z'),
      finishedAt: new Date('2024-01-01T10:05:00Z'),
      tracksAdded: 10,
      tracksUpdated: 5,
      tracksDeleted: 2,
      totalChanges: 17,
      durationMs: 300000,
      errorMessage: undefined,
    });
  });

  it('should set durationMs to undefined for running scans', async () => {
    const runningScan = LibraryScan.fromPrimitives({
      id: 'scan-running',
      status: 'running',
      startedAt: new Date('2024-01-01T10:00:00Z'),
      finishedAt: undefined,
      tracksAdded: 3,
      tracksUpdated: 0,
      tracksDeleted: 0,
    });
    mockRepo.findAll.mockResolvedValue([runningScan]);
    mockRepo.count.mockResolvedValue(1);

    const result = await useCase.execute();

    expect(result.scans[0].durationMs).toBeUndefined();
    expect(result.scans[0].status).toBe('running');
  });

  it('should include errorMessage for failed scans', async () => {
    const failedScan = createScan({
      status: 'failed',
      errorMessage: 'Disk full',
    });
    mockRepo.findAll.mockResolvedValue([failedScan]);
    mockRepo.count.mockResolvedValue(1);

    const result = await useCase.execute();

    expect(result.scans[0].errorMessage).toBe('Disk full');
    expect(result.scans[0].status).toBe('failed');
  });

  it('should return empty scans array when no history exists', async () => {
    mockRepo.findAll.mockResolvedValue([]);
    mockRepo.count.mockResolvedValue(0);

    const result = await useCase.execute();

    expect(result.scans).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  it('should calculate totalPages correctly', async () => {
    mockRepo.findAll.mockResolvedValue([]);
    mockRepo.count.mockResolvedValue(25);

    const result = await useCase.execute({ limit: 10 });

    expect(result.totalPages).toBe(3);
  });
});
