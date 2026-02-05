import { Test, TestingModule } from '@nestjs/testing';
import { TracksController } from './tracks.controller';
import { GetTrackUseCase } from '../../domain/use-cases/get-track/get-track.use-case';
import { GetTracksUseCase } from '../../domain/use-cases/get-tracks/get-tracks.use-case';
import { SearchTracksUseCase } from '../../domain/use-cases/search-tracks/search-tracks.use-case';
import { GetShuffledTracksUseCase } from '../../domain/use-cases/get-shuffled-tracks/get-shuffled-tracks.use-case';
import { GetDjShuffledTracksUseCase } from '../../domain/use-cases/get-dj-shuffled-tracks/get-dj-shuffled-tracks.use-case';
import { Track } from '../../domain/entities/track.entity';
import { DJ_ANALYSIS_REPOSITORY } from '@features/dj/domain/ports/dj-analysis.repository.port';

describe('TracksController', () => {
  let controller: TracksController;
  let getTrackUseCase: jest.Mocked<GetTrackUseCase>;
  let getTracksUseCase: jest.Mocked<GetTracksUseCase>;
  let searchTracksUseCase: jest.Mocked<SearchTracksUseCase>;
  let getShuffledTracksUseCase: jest.Mocked<GetShuffledTracksUseCase>;
  let getDjShuffledTracksUseCase: jest.Mocked<GetDjShuffledTracksUseCase>;

  const mockTrack = Track.reconstruct({
    id: 'track-1',
    title: 'Come Together',
    artistId: 'artist-1',
    artistName: 'The Beatles',
    albumId: 'album-1',
    albumName: 'Abbey Road',
    duration: 259,
    trackNumber: 1,
    discNumber: 1,
    path: '/music/beatles/abbey-road/01-come-together.flac',
    bitrate: 1411,
    sampleRate: 44100,
    channels: 2,
    codec: 'flac',
    size: Number(45000000),
    mimeType: 'audio/flac',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  });

  beforeEach(async () => {
    const mockGetTrackUseCase = {
      execute: jest.fn(),
    };

    const mockGetTracksUseCase = {
      execute: jest.fn(),
    };

    const mockSearchTracksUseCase = {
      execute: jest.fn(),
    };

    const mockGetShuffledTracksUseCase = {
      execute: jest.fn(),
    };

    const mockGetDjShuffledTracksUseCase = {
      execute: jest.fn(),
    };

    const mockDjAnalysisRepository = {
      findByTrackId: jest.fn(),
      findByTrackIds: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TracksController],
      providers: [
        { provide: GetTrackUseCase, useValue: mockGetTrackUseCase },
        { provide: GetTracksUseCase, useValue: mockGetTracksUseCase },
        { provide: SearchTracksUseCase, useValue: mockSearchTracksUseCase },
        { provide: GetShuffledTracksUseCase, useValue: mockGetShuffledTracksUseCase },
        { provide: GetDjShuffledTracksUseCase, useValue: mockGetDjShuffledTracksUseCase },
        { provide: DJ_ANALYSIS_REPOSITORY, useValue: mockDjAnalysisRepository },
      ],
    }).compile();

    controller = module.get<TracksController>(TracksController);
    getTrackUseCase = module.get(GetTrackUseCase);
    getTracksUseCase = module.get(GetTracksUseCase);
    searchTracksUseCase = module.get(SearchTracksUseCase);
    getShuffledTracksUseCase = module.get(GetShuffledTracksUseCase);
    getDjShuffledTracksUseCase = module.get(GetDjShuffledTracksUseCase);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getTrack', () => {
    it('debería retornar un track por ID', async () => {
      // Arrange
      getTrackUseCase.execute.mockResolvedValue(mockTrack.toPrimitives());

      // Act
      const result = await controller.getTrack('track-1');

      // Assert
      expect(getTrackUseCase.execute).toHaveBeenCalledWith({ id: 'track-1' });
      expect(result.id).toBe('track-1');
      expect(result.title).toBe('Come Together');
    });
  });

  describe('getTracks', () => {
    it('debería retornar lista paginada de tracks', async () => {
      // Arrange
      getTracksUseCase.execute.mockResolvedValue({
        data: [mockTrack.toPrimitives()],
        skip: 0,
        take: 10,
        hasMore: false,
      });

      // Act
      const result = await controller.getTracks('0', '10');

      // Assert
      expect(getTracksUseCase.execute).toHaveBeenCalledWith({ skip: 0, take: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.hasMore).toBe(false);
    });

    it('debería usar valores por defecto si no se proporcionan', async () => {
      // Arrange
      getTracksUseCase.execute.mockResolvedValue({
        data: [],
        skip: 0,
        take: 10,
        hasMore: false,
      });

      // Act
      await controller.getTracks();

      // Assert
      expect(getTracksUseCase.execute).toHaveBeenCalledWith({ skip: 0, take: 10 });
    });
  });

  describe('searchTracks', () => {
    it('debería buscar tracks por query', async () => {
      // Arrange
      searchTracksUseCase.execute.mockResolvedValue({
        data: [mockTrack.toPrimitives()],
        query: 'come',
        skip: 0,
        take: 10,
        hasMore: false,
      });

      // Act
      const result = await controller.searchTracks('come', '0', '10');

      // Assert
      expect(searchTracksUseCase.execute).toHaveBeenCalledWith({
        query: 'come',
        skip: 0,
        take: 10,
      });
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getShuffledTracks', () => {
    it('debería retornar tracks aleatorios', async () => {
      // Arrange
      getShuffledTracksUseCase.execute.mockResolvedValue({
        data: [mockTrack.toPrimitives()],
        seed: 0.5,
        skip: 0,
        take: 50,
        hasMore: true,
        total: 100,
      });

      // Act
      const result = await controller.getShuffledTracks('0.5', '0', '50');

      // Assert
      expect(getShuffledTracksUseCase.execute).toHaveBeenCalledWith({
        seed: 0.5,
        skip: 0,
        take: 50,
      });
      expect(result.seed).toBe(0.5);
    });

    it('debería generar seed si no se proporciona', async () => {
      // Arrange
      getShuffledTracksUseCase.execute.mockResolvedValue({
        data: [],
        seed: 0.123,
        skip: 0,
        take: 50,
        hasMore: false,
        total: 0,
      });

      // Act
      await controller.getShuffledTracks();

      // Assert
      expect(getShuffledTracksUseCase.execute).toHaveBeenCalledWith({
        seed: undefined,
        skip: 0,
        take: 50,
      });
    });
  });

  describe('getDjShuffledTracks', () => {
    it('debería retornar tracks con ordenamiento DJ', async () => {
      // Arrange
      getDjShuffledTracksUseCase.execute.mockResolvedValue({
        data: [mockTrack.toPrimitives()],
        seed: 0.5,
        skip: 0,
        take: 50,
        hasMore: true,
        total: 100,
        djMode: true,
      });

      // Act
      const result = await controller.getDjShuffledTracks('0.5', '0', '50');

      // Assert
      expect(getDjShuffledTracksUseCase.execute).toHaveBeenCalledWith({
        seed: 0.5,
        skip: 0,
        take: 50,
      });
      expect(result.seed).toBe(0.5);
      expect(result.djMode).toBe(true);
    });

    it('debería retornar djMode false cuando no hay suficiente análisis DJ', async () => {
      // Arrange
      getDjShuffledTracksUseCase.execute.mockResolvedValue({
        data: [mockTrack.toPrimitives()],
        seed: 0.5,
        skip: 0,
        take: 50,
        hasMore: true,
        total: 100,
        djMode: false,
      });

      // Act
      const result = await controller.getDjShuffledTracks('0.5');

      // Assert
      expect(result.djMode).toBe(false);
    });
  });
});
