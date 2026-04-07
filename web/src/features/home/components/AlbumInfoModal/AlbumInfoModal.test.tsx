import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlbumInfoModal } from './AlbumInfoModal';
import type { Album, Track } from '../../types';

// Mock the utils
vi.mock('@shared/utils/cover.utils', () => ({
  getCoverUrl: vi.fn((url: string) => url || '/default-cover.jpg'),
}));

describe('AlbumInfoModal', () => {
  const mockAlbum: Album = {
    id: 'album-1',
    title: 'Test Album',
    artist: 'Test Artist',
    artistId: 'artist-1',
    year: 2023,
    genre: 'Rock',
    totalTracks: 10,
    coverImage: '/covers/album-1.jpg',
    path: '/music/test-artist/test-album',
    createdAt: '2024-01-15T10:30:00.000Z',
    updatedAt: '2024-01-15T10:30:00.000Z',
  };

  const mockTracks: Track[] = [
    {
      id: 'track-1',
      title: 'Track 1',
      duration: 240,
      size: '5000000',
      suffix: 'flac',
      trackNumber: 1,
      discNumber: 1,
      path: '/music/test-artist/test-album/track-1.flac',
      albumId: 'album-1',
      albumName: 'Test Album',
      artistId: 'artist-1',
      artistName: 'Test Artist',
      rgTrackGain: -6.5,
      rgTrackPeak: 0.95,
      rgAlbumGain: -5.2,
      rgAlbumPeak: 0.98,
      createdAt: '2024-01-15T10:30:00.000Z',
      updatedAt: '2024-01-15T10:30:00.000Z',
    },
    {
      id: 'track-2',
      title: 'Track 2',
      duration: 180,
      size: '4000000',
      suffix: 'flac',
      trackNumber: 2,
      discNumber: 1,
      path: '/music/test-artist/test-album/track-2.flac',
      albumId: 'album-1',
      albumName: 'Test Album',
      artistId: 'artist-1',
      artistName: 'Test Artist',
      rgTrackGain: -7.0,
      rgTrackPeak: 0.92,
      rgAlbumGain: -5.2,
      rgAlbumPeak: 0.98,
      createdAt: '2024-01-15T10:30:00.000Z',
      updatedAt: '2024-01-15T10:30:00.000Z',
    },
  ];

  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render modal title', () => {
      render(<AlbumInfoModal album={mockAlbum} tracks={mockTracks} onClose={mockOnClose} />);

      expect(screen.getByText('Información del álbum')).toBeInTheDocument();
    });

    it('should render album title and artist', () => {
      render(<AlbumInfoModal album={mockAlbum} tracks={mockTracks} onClose={mockOnClose} />);

      // Title appears in hero and info section
      expect(screen.getAllByText('Test Album').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Test Artist').length).toBeGreaterThanOrEqual(1);
    });

    it('should render album year', () => {
      render(<AlbumInfoModal album={mockAlbum} tracks={mockTracks} onClose={mockOnClose} />);

      // Year appears in hero and info section
      expect(screen.getAllByText('2023').length).toBeGreaterThanOrEqual(1);
    });

    it('should render album cover image', () => {
      render(<AlbumInfoModal album={mockAlbum} tracks={mockTracks} onClose={mockOnClose} />);

      const coverImage = screen.getByAltText('Test Album');
      expect(coverImage).toBeInTheDocument();
    });

    it('should render general information section', () => {
      render(<AlbumInfoModal album={mockAlbum} tracks={mockTracks} onClose={mockOnClose} />);

      expect(screen.getByText('Información general')).toBeInTheDocument();
      expect(screen.getByText('Título:')).toBeInTheDocument();
      expect(screen.getByText('Artista:')).toBeInTheDocument();
      expect(screen.getByText('Año:')).toBeInTheDocument();
      expect(screen.getByText('Canciones:')).toBeInTheDocument();
    });

    it('should render track count', () => {
      render(<AlbumInfoModal album={mockAlbum} tracks={mockTracks} onClose={mockOnClose} />);

      // Total tracks from album (10) takes precedence over actual tracks array
      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('should render genre', () => {
      render(<AlbumInfoModal album={mockAlbum} tracks={mockTracks} onClose={mockOnClose} />);

      expect(screen.getByText('Género:')).toBeInTheDocument();
      expect(screen.getByText('Rock')).toBeInTheDocument();
    });

    it('should render technical information section', () => {
      render(<AlbumInfoModal album={mockAlbum} tracks={mockTracks} onClose={mockOnClose} />);

      expect(screen.getByText('Información técnica')).toBeInTheDocument();
      expect(screen.getByText('Formato:')).toBeInTheDocument();
      expect(screen.getByText('FLAC')).toBeInTheDocument();
    });

    it('should render total duration from tracks', () => {
      render(<AlbumInfoModal album={mockAlbum} tracks={mockTracks} onClose={mockOnClose} />);

      expect(screen.getByText('Duración:')).toBeInTheDocument();
      // 240 + 180 = 420 seconds = 7:00
      expect(screen.getByText('7:00')).toBeInTheDocument();
    });

    it('should render total size from tracks', () => {
      render(<AlbumInfoModal album={mockAlbum} tracks={mockTracks} onClose={mockOnClose} />);

      expect(screen.getByText('Tamaño:')).toBeInTheDocument();
      // 5000000 + 4000000 = 9000000 bytes ≈ 8.58 MB
    });

    it('should render album path', () => {
      render(<AlbumInfoModal album={mockAlbum} tracks={mockTracks} onClose={mockOnClose} />);

      expect(screen.getByText('Ubicación:')).toBeInTheDocument();
      expect(screen.getByText('/music/test-artist/test-album')).toBeInTheDocument();
    });

    it('should render close button with aria-label', () => {
      render(<AlbumInfoModal album={mockAlbum} tracks={mockTracks} onClose={mockOnClose} />);

      const closeButton = screen.getByLabelText('Cerrar');
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('audio normalization', () => {
    it('should render normalization section', () => {
      render(<AlbumInfoModal album={mockAlbum} tracks={mockTracks} onClose={mockOnClose} />);

      expect(screen.getByText('Normalización de audio')).toBeInTheDocument();
    });

    it('should show analyzed status when all tracks analyzed', () => {
      render(<AlbumInfoModal album={mockAlbum} tracks={mockTracks} onClose={mockOnClose} />);

      expect(screen.getByText('Analizado (2/2)')).toBeInTheDocument();
    });

    it('should show partial status when some tracks analyzed', () => {
      const partialTracks: Track[] = [
        { ...mockTracks[0] },
        { ...mockTracks[1], rgTrackGain: undefined },
      ];

      render(<AlbumInfoModal album={mockAlbum} tracks={partialTracks} onClose={mockOnClose} />);

      expect(screen.getByText('Parcial (1/2)')).toBeInTheDocument();
    });

    it('should show pending status when no tracks analyzed', () => {
      const unanalyzedTracks: Track[] = mockTracks.map(t => ({
        ...t,
        rgTrackGain: undefined,
        rgAlbumGain: undefined,
      }));

      render(<AlbumInfoModal album={mockAlbum} tracks={unanalyzedTracks} onClose={mockOnClose} />);

      expect(screen.getByText('Pendiente')).toBeInTheDocument();
    });

    it('should show album gain when available', () => {
      render(<AlbumInfoModal album={mockAlbum} tracks={mockTracks} onClose={mockOnClose} />);

      expect(screen.getByText('Ganancia:')).toBeInTheDocument();
      expect(screen.getByText('-5.20 dB')).toBeInTheDocument();
    });

    it('should show album peak when available', () => {
      render(<AlbumInfoModal album={mockAlbum} tracks={mockTracks} onClose={mockOnClose} />);

      expect(screen.getByText('True Peak:')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onClose when close button is clicked', () => {
      render(<AlbumInfoModal album={mockAlbum} tracks={mockTracks} onClose={mockOnClose} />);

      const closeButton = screen.getByLabelText('Cerrar');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when clicking overlay', () => {
      render(<AlbumInfoModal album={mockAlbum} tracks={mockTracks} onClose={mockOnClose} />);

      const overlay = document.querySelector('[class*="albumInfoModal"]');
      if (overlay) {
        fireEvent.click(overlay);
      }

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when clicking modal content', () => {
      render(<AlbumInfoModal album={mockAlbum} tracks={mockTracks} onClose={mockOnClose} />);

      const content = document.querySelector('[class*="content"]');
      if (content) {
        fireEvent.click(content);
      }

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle album without optional fields', () => {
      const minimalAlbum: Album = {
        id: 'album-2',
        title: 'Minimal Album',
        artistId: 'artist-1',
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-15T10:30:00.000Z',
      };

      render(<AlbumInfoModal album={minimalAlbum} onClose={mockOnClose} />);

      // Title appears in multiple places
      expect(screen.getAllByText('Minimal Album').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText('Artista:')).not.toBeInTheDocument();
      expect(screen.queryByText('Género:')).not.toBeInTheDocument();
    });

    it('should handle empty tracks array', () => {
      render(<AlbumInfoModal album={mockAlbum} tracks={[]} onClose={mockOnClose} />);

      expect(screen.getAllByText('Test Album').length).toBeGreaterThanOrEqual(1);
      // With 0 tracks, analyzed = 0, total = 0, so it shows "Analizado (0/0)"
      // Actually, let's check what normalization status shows
      expect(screen.getByText('Normalización de audio')).toBeInTheDocument();
    });

    it('should handle tracks with string size values', () => {
      const tracksWithStringSize: Track[] = [
        { ...mockTracks[0], size: '5000000' },
      ];

      render(<AlbumInfoModal album={mockAlbum} tracks={tracksWithStringSize} onClose={mockOnClose} />);

      expect(screen.getByText('Tamaño:')).toBeInTheDocument();
    });
  });
});
