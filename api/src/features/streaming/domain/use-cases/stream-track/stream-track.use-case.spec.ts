import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundError, ForbiddenError } from '@shared/errors';
import { StreamTrackUseCase } from './stream-track.use-case';
import {
  TRACK_REPOSITORY,
  ITrackRepository,
} from '@features/tracks/domain/ports/track-repository.port';
import { Track } from '@features/tracks/domain/entities/track.entity';
import * as fs from 'fs';

// Mock fs module
jest.mock('fs');

describe('StreamTrackUseCase', () => {
  let useCase: StreamTrackUseCase;
  let trackRepository: jest.Mocked<ITrackRepository>;

  const mockLogger = {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  const mockTrack = Track.reconstruct({
    id: 'track-1',
    title: 'Test Song',
    path: '/app/data/test-song.mp3',
    duration: 180,
    discNumber: 1,
    compilation: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {

    const mockTrackRepository: Partial<ITrackRepository> = {
      findById: jest.fn(),
      findAll: jest.fn(),
      search: jest.fn(),
      findByAlbumId: jest.fn(),
      findByArtistId: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreamTrackUseCase,
        {
          provide: `PinoLogger:${StreamTrackUseCase.name}`,
          useValue: mockLogger,
        },
        {
          provide: TRACK_REPOSITORY,
          useValue: mockTrackRepository,
        },
      ],
    }).compile();

    useCase = module.get<StreamTrackUseCase>(StreamTrackUseCase);
    trackRepository = module.get(TRACK_REPOSITORY);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('execute', () => {
    it('should return track metadata for streaming', async () => {
      (trackRepository.findById as jest.Mock).mockResolvedValue(mockTrack);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({
        isFile: () => true,
        size: 5242880,
      });

      const result = await useCase.execute({ trackId: 'track-1' });

      expect(trackRepository.findById).toHaveBeenCalledWith('track-1');
      expect(result).toEqual({
        trackId: 'track-1',
        filePath: '/app/data/test-song.mp3',
        fileName: 'test-song.mp3',
        fileSize: 5242880,
        mimeType: 'audio/mpeg',
        duration: 180,
      });
    });

    it('should throw NotFoundError if trackId is empty', async () => {
      await expect(useCase.execute({ trackId: '' })).rejects.toThrow(NotFoundError);
      expect(trackRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError if trackId is whitespace only', async () => {
      await expect(useCase.execute({ trackId: '   ' })).rejects.toThrow(NotFoundError);
      expect(trackRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError if track does not exist', async () => {
      (trackRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(useCase.execute({ trackId: 'nonexistent' })).rejects.toThrow(NotFoundError);
      expect(trackRepository.findById).toHaveBeenCalledWith('nonexistent');
    });

    it('should throw NotFoundError if track has no path', async () => {
      const trackWithoutPath = Track.reconstruct({
        id: 'track-2',
        title: 'No Path Song',
        path: undefined as unknown as string,
        discNumber: 1,
        compilation: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (trackRepository.findById as jest.Mock).mockResolvedValue(trackWithoutPath);

      await expect(useCase.execute({ trackId: 'track-2' })).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if file path is outside allowed roots', async () => {
      const trackOutsideData = Track.reconstruct({
        id: 'track-3',
        title: 'Bad Path Song',
        path: '/etc/passwd',
        discNumber: 1,
        compilation: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (trackRepository.findById as jest.Mock).mockResolvedValue(trackOutsideData);

      await expect(useCase.execute({ trackId: 'track-3' })).rejects.toThrow(ForbiddenError);
    });

    it('should allow file paths under any allowed root (/mnt, /media, /music, etc.)', async () => {
      const trackOnMnt = Track.reconstruct({
        id: 'track-mnt',
        title: 'Mounted Song',
        path: '/mnt/navidrome/musica/artist/song.mp3',
        duration: 200,
        discNumber: 1,
        compilation: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (trackRepository.findById as jest.Mock).mockResolvedValue(trackOnMnt);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({
        isFile: () => true,
        size: 5242880,
      });

      const result = await useCase.execute({ trackId: 'track-mnt' });

      expect(result.filePath).toBe('/mnt/navidrome/musica/artist/song.mp3');
      expect(result.mimeType).toBe('audio/mpeg');
    });

    it('should throw NotFoundError if file does not exist on disk', async () => {
      (trackRepository.findById as jest.Mock).mockResolvedValue(mockTrack);
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(useCase.execute({ trackId: 'track-1' })).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if path is not a file', async () => {
      (trackRepository.findById as jest.Mock).mockResolvedValue(mockTrack);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({
        isFile: () => false,
      });

      await expect(useCase.execute({ trackId: 'track-1' })).rejects.toThrow(NotFoundError);
    });

    it('should detect MIME type for FLAC files', async () => {
      const flacTrack = Track.reconstruct({
        ...mockTrack.toPrimitives(),
        path: '/app/data/test-song.flac',
      });
      (trackRepository.findById as jest.Mock).mockResolvedValue(flacTrack);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({
        isFile: () => true,
        size: 15728640,
      });

      const result = await useCase.execute({ trackId: 'track-1' });

      expect(result.mimeType).toBe('audio/flac');
    });

    it('should extract the correct file name from path', async () => {
      const trackWithLongPath = Track.reconstruct({
        ...mockTrack.toPrimitives(),
        path: '/app/data/music/rock/beatles/01-come-together.mp3',
      });
      (trackRepository.findById as jest.Mock).mockResolvedValue(trackWithLongPath);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({
        isFile: () => true,
        size: 5242880,
      });

      const result = await useCase.execute({ trackId: 'track-1' });

      expect(result.fileName).toBe('01-come-together.mp3');
    });

    it('should return correct file size from fs.statSync', async () => {
      (trackRepository.findById as jest.Mock).mockResolvedValue(mockTrack);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({
        isFile: () => true,
        size: 10485760,
      });

      const result = await useCase.execute({ trackId: 'track-1' });

      expect(result.fileSize).toBe(10485760);
    });

    it('should include track duration in output', async () => {
      const trackWithDuration = Track.reconstruct({
        ...mockTrack.toPrimitives(),
        duration: 300,
      });
      (trackRepository.findById as jest.Mock).mockResolvedValue(trackWithDuration);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({
        isFile: () => true,
        size: 5242880,
      });

      const result = await useCase.execute({ trackId: 'track-1' });

      expect(result.duration).toBe(300);
    });
  });
});
