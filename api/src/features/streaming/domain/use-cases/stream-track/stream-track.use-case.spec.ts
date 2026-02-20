import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundError } from '@shared/errors';
import { StreamTrackUseCase } from './stream-track.use-case';
import { TRACK_REPOSITORY, ITrackRepository } from '@features/tracks/domain/ports/track-repository.port';
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

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('debería retornar metadata del track para streaming', async () => {
      // Arrange
      (trackRepository.findById as jest.Mock).mockResolvedValue(mockTrack);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({
        isFile: () => true,
        size: 5242880, // 5 MB
      });

      // Act
      const result = await useCase.execute({ trackId: 'track-1' });

      // Assert
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

    it('debería lanzar NotFoundError si trackId está vacío', async () => {
      // Act & Assert
      await expect(useCase.execute({ trackId: '' })).rejects.toThrow(
        NotFoundError,
      );
      expect(trackRepository.findById).not.toHaveBeenCalled();
    });

    it('debería lanzar NotFoundError si trackId es solo espacios', async () => {
      // Act & Assert
      await expect(useCase.execute({ trackId: '   ' })).rejects.toThrow(
        NotFoundError,
      );
      expect(trackRepository.findById).not.toHaveBeenCalled();
    });

    it('debería lanzar NotFoundError si el track no existe', async () => {
      // Arrange
      (trackRepository.findById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute({ trackId: 'nonexistent' })).rejects.toThrow(
        NotFoundError,
      );
      expect(trackRepository.findById).toHaveBeenCalledWith('nonexistent');
    });

    it('debería lanzar NotFoundError si el track no tiene path', async () => {
      // Arrange
      const trackWithoutPath = Track.reconstruct({
        id: 'track-2',
        title: 'No Path Song',
        path: undefined as any,
        discNumber: 1,
        compilation: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (trackRepository.findById as jest.Mock).mockResolvedValue(trackWithoutPath);

      // Act & Assert
      await expect(useCase.execute({ trackId: 'track-2' })).rejects.toThrow(
        NotFoundError,
      );
    });

    it('debería lanzar NotFoundError si el archivo no existe', async () => {
      // Arrange
      (trackRepository.findById as jest.Mock).mockResolvedValue(mockTrack);
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // Act & Assert
      await expect(useCase.execute({ trackId: 'track-1' })).rejects.toThrow(
        NotFoundError,
      );
    });

    it('debería lanzar NotFoundError si el path no es un archivo', async () => {
      // Arrange
      (trackRepository.findById as jest.Mock).mockResolvedValue(mockTrack);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({
        isFile: () => false, // Es un directorio
      });

      // Act & Assert
      await expect(useCase.execute({ trackId: 'track-1' })).rejects.toThrow(
        NotFoundError,
      );
    });

    it('debería detectar MIME type para MP3', async () => {
      // Arrange
      (trackRepository.findById as jest.Mock).mockResolvedValue(mockTrack);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({
        isFile: () => true,
        size: 5242880,
      });

      // Act
      const result = await useCase.execute({ trackId: 'track-1' });

      // Assert
      expect(result.mimeType).toBe('audio/mpeg');
    });

    it('debería detectar MIME type para FLAC', async () => {
      // Arrange
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

      // Act
      const result = await useCase.execute({ trackId: 'track-1' });

      // Assert
      expect(result.mimeType).toBe('audio/flac');
    });

    it('debería usar audio/mpeg por defecto para extensiones desconocidas', async () => {
      // Arrange
      const unknownTrack = Track.reconstruct({
        ...mockTrack.toPrimitives(),
        path: '/app/data/test-song.xyz',
      });
      (trackRepository.findById as jest.Mock).mockResolvedValue(unknownTrack);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({
        isFile: () => true,
        size: 5242880,
      });

      // Act
      const result = await useCase.execute({ trackId: 'track-1' });

      // Assert
      expect(result.mimeType).toBe('audio/mpeg');
    });

    it('debería extraer correctamente el nombre del archivo', async () => {
      // Arrange
      const trackWithLongPath = Track.reconstruct({
        ...mockTrack.toPrimitives(),
        path: '/app/data/music/library/rock/beatles/abbey-road/01-come-together.mp3',
      });
      (trackRepository.findById as jest.Mock).mockResolvedValue(trackWithLongPath);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.statSync as jest.Mock).mockReturnValue({
        isFile: () => true,
        size: 5242880,
      });

      // Act
      const result = await useCase.execute({ trackId: 'track-1' });

      // Assert
      expect(result.fileName).toBe('01-come-together.mp3');
    });
  });
});
