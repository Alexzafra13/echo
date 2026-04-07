import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { NotFoundError } from '@shared/errors';
import { StreamTrackUseCase } from './stream-track.use-case';
import {
  TRACK_REPOSITORY,
  ITrackRepository,
} from '@features/tracks/domain/ports/track-repository.port';
import { FilesystemService } from '@infrastructure/filesystem/filesystem.service';
import { Track } from '@features/tracks/domain/entities/track.entity';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock fs/promises module
jest.mock('fs/promises');

describe('StreamTrackUseCase', () => {
  let useCase: StreamTrackUseCase;
  let trackRepository: jest.Mocked<ITrackRepository>;
  let filesystemService: jest.Mocked<FilesystemService>;

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

  const mockFilesystemService: Partial<FilesystemService> = {
    validateMusicPath: jest.fn((filePath: string) => path.resolve(filePath)),
  };

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
        {
          provide: FilesystemService,
          useValue: mockFilesystemService,
        },
      ],
    }).compile();

    useCase = module.get<StreamTrackUseCase>(StreamTrackUseCase);
    trackRepository = module.get(TRACK_REPOSITORY);
    filesystemService = module.get(FilesystemService);

    jest.clearAllMocks();

    // Re-apply default mock after clearAllMocks
    (filesystemService.validateMusicPath as jest.Mock).mockImplementation((filePath: string) =>
      path.resolve(filePath)
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('execute', () => {
    it('should return track metadata for streaming', async () => {
      (trackRepository.findById as jest.Mock).mockResolvedValue(mockTrack);
      (fs.stat as jest.Mock).mockResolvedValue({
        isFile: () => true,
        size: 5242880,
      });

      const result = await useCase.execute({ trackId: 'track-1' });

      expect(trackRepository.findById).toHaveBeenCalledWith('track-1');
      expect(result).toEqual({
        trackId: 'track-1',
        filePath: path.resolve('/app/data/test-song.mp3'),
        fileName: 'test-song.mp3',
        fileSize: 5242880,
        mimeType: 'audio/mpeg',
        duration: 180,
      });
    });

    it('should throw NotFoundError if trackId is empty', async () => {
      await expect(useCase.execute({ trackId: '' })).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if trackId is whitespace only', async () => {
      await expect(useCase.execute({ trackId: '   ' })).rejects.toThrow(NotFoundError);
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

    it('should delegate path validation to FilesystemService.validateMusicPath', async () => {
      (trackRepository.findById as jest.Mock).mockResolvedValue(mockTrack);
      (fs.stat as jest.Mock).mockResolvedValue({
        isFile: () => true,
        size: 5242880,
      });

      await useCase.execute({ trackId: 'track-1' });

      expect(filesystemService.validateMusicPath).toHaveBeenCalledWith('/app/data/test-song.mp3');
    });

    it('should throw when FilesystemService rejects the path', async () => {
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
      (filesystemService.validateMusicPath as jest.Mock).mockImplementation(() => {
        throw new ForbiddenException('Access denied: path outside allowed music directories');
      });

      await expect(useCase.execute({ trackId: 'track-3' })).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundError if file does not exist on disk', async () => {
      (trackRepository.findById as jest.Mock).mockResolvedValue(mockTrack);
      (fs.stat as jest.Mock).mockRejectedValue(new Error('ENOENT: no such file'));

      await expect(useCase.execute({ trackId: 'track-1' })).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError if path is not a file', async () => {
      (trackRepository.findById as jest.Mock).mockResolvedValue(mockTrack);
      (fs.stat as jest.Mock).mockResolvedValue({
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
      (fs.stat as jest.Mock).mockResolvedValue({
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
      (fs.stat as jest.Mock).mockResolvedValue({
        isFile: () => true,
        size: 5242880,
      });

      const result = await useCase.execute({ trackId: 'track-1' });

      expect(result.fileName).toBe('01-come-together.mp3');
    });

    it('should return correct file size from fs.statSync', async () => {
      (trackRepository.findById as jest.Mock).mockResolvedValue(mockTrack);
      (fs.stat as jest.Mock).mockResolvedValue({
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
      (fs.stat as jest.Mock).mockResolvedValue({
        isFile: () => true,
        size: 5242880,
      });

      const result = await useCase.execute({ trackId: 'track-1' });

      expect(result.duration).toBe(300);
    });
  });
});
