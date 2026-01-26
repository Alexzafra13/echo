import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrackInfoModal } from './TrackInfoModal';
import type { Track } from '../../types';

// Mock the utils
vi.mock('@shared/utils/cover.utils', () => ({
  getCoverUrl: vi.fn((url: string) => url || '/default-cover.jpg'),
}));

describe('TrackInfoModal', () => {
  const mockTrack: Track = {
    id: 'track-1',
    title: 'Test Track',
    duration: 245,
    size: '8500000',
    suffix: 'flac',
    bitRate: 1411,
    trackNumber: 3,
    discNumber: 1,
    year: 2023,
    path: '/music/test-artist/test-album/03-test-track.flac',
    albumId: 'album-1',
    albumName: 'Test Album',
    artistId: 'artist-1',
    artistName: 'Test Artist',
    rgTrackGain: -6.5,
    rgTrackPeak: 0.95,
    createdAt: '2024-01-15T10:30:00.000Z',
    updatedAt: '2024-01-15T10:30:00.000Z',
  };

  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render modal title', () => {
      render(<TrackInfoModal track={mockTrack} onClose={mockOnClose} />);

      expect(screen.getByText('Información de la canción')).toBeInTheDocument();
    });

    it('should render track title', () => {
      render(<TrackInfoModal track={mockTrack} onClose={mockOnClose} />);

      // Title appears in hero and info section
      expect(screen.getAllByText('Test Track').length).toBeGreaterThanOrEqual(1);
    });

    it('should render artist name', () => {
      render(<TrackInfoModal track={mockTrack} onClose={mockOnClose} />);

      // Artist appears in hero and info section
      expect(screen.getAllByText('Test Artist').length).toBeGreaterThanOrEqual(1);
    });

    it('should render album name', () => {
      render(<TrackInfoModal track={mockTrack} onClose={mockOnClose} />);

      // Album appears in hero and info section
      expect(screen.getAllByText('Test Album').length).toBeGreaterThanOrEqual(1);
    });

    it('should render album cover image when albumId exists', () => {
      render(<TrackInfoModal track={mockTrack} onClose={mockOnClose} />);

      const coverImage = screen.getByAltText('Test Track');
      expect(coverImage).toBeInTheDocument();
    });

    it('should render close button with aria-label', () => {
      render(<TrackInfoModal track={mockTrack} onClose={mockOnClose} />);

      const closeButton = screen.getByLabelText('Cerrar');
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('general information', () => {
    it('should render general information section', () => {
      render(<TrackInfoModal track={mockTrack} onClose={mockOnClose} />);

      expect(screen.getByText('Información general')).toBeInTheDocument();
    });

    it('should render track year', () => {
      render(<TrackInfoModal track={mockTrack} onClose={mockOnClose} />);

      expect(screen.getByText('Año:')).toBeInTheDocument();
      expect(screen.getByText('2023')).toBeInTheDocument();
    });

    it('should render track duration', () => {
      render(<TrackInfoModal track={mockTrack} onClose={mockOnClose} />);

      expect(screen.getByText('Duración:')).toBeInTheDocument();
      // 245 seconds = 4:05
      expect(screen.getByText('4:05')).toBeInTheDocument();
    });

    it('should render disc and track number', () => {
      render(<TrackInfoModal track={mockTrack} onClose={mockOnClose} />);

      expect(screen.getByText('Disco:')).toBeInTheDocument();
      expect(screen.getByText('1 - Track 3')).toBeInTheDocument();
    });
  });

  describe('technical information', () => {
    it('should render technical information section', () => {
      render(<TrackInfoModal track={mockTrack} onClose={mockOnClose} />);

      expect(screen.getByText('Información técnica')).toBeInTheDocument();
    });

    it('should render format', () => {
      render(<TrackInfoModal track={mockTrack} onClose={mockOnClose} />);

      expect(screen.getByText('Formato:')).toBeInTheDocument();
      expect(screen.getByText('FLAC')).toBeInTheDocument();
    });

    it('should render bitrate', () => {
      render(<TrackInfoModal track={mockTrack} onClose={mockOnClose} />);

      expect(screen.getByText('Bitrate:')).toBeInTheDocument();
    });

    it('should render file size', () => {
      render(<TrackInfoModal track={mockTrack} onClose={mockOnClose} />);

      expect(screen.getByText('Tamaño:')).toBeInTheDocument();
    });

    it('should render file path', () => {
      render(<TrackInfoModal track={mockTrack} onClose={mockOnClose} />);

      expect(screen.getByText('Ubicación:')).toBeInTheDocument();
      expect(screen.getByText('/music/test-artist/test-album/03-test-track.flac')).toBeInTheDocument();
    });

    it('should render added date', () => {
      render(<TrackInfoModal track={mockTrack} onClose={mockOnClose} />);

      expect(screen.getByText('Agregado:')).toBeInTheDocument();
    });
  });

  describe('audio normalization', () => {
    it('should render normalization section', () => {
      render(<TrackInfoModal track={mockTrack} onClose={mockOnClose} />);

      expect(screen.getByText('Normalización de audio')).toBeInTheDocument();
    });

    it('should show analyzed status when track has gain data', () => {
      render(<TrackInfoModal track={mockTrack} onClose={mockOnClose} />);

      expect(screen.getByText('Analizada')).toBeInTheDocument();
    });

    it('should show pending status when track has no gain data', () => {
      const unanalyzedTrack: Track = {
        ...mockTrack,
        rgTrackGain: undefined,
        rgTrackPeak: undefined,
      };

      render(<TrackInfoModal track={unanalyzedTrack} onClose={mockOnClose} />);

      expect(screen.getByText('Pendiente')).toBeInTheDocument();
    });

    it('should show track gain when available', () => {
      render(<TrackInfoModal track={mockTrack} onClose={mockOnClose} />);

      expect(screen.getByText('Ganancia:')).toBeInTheDocument();
      expect(screen.getByText('-6.50 dB')).toBeInTheDocument();
    });

    it('should show track peak when available', () => {
      render(<TrackInfoModal track={mockTrack} onClose={mockOnClose} />);

      expect(screen.getByText('True Peak:')).toBeInTheDocument();
    });

    it('should show positive gain with plus sign', () => {
      const trackWithPositiveGain: Track = {
        ...mockTrack,
        rgTrackGain: 2.5,
      };

      render(<TrackInfoModal track={trackWithPositiveGain} onClose={mockOnClose} />);

      expect(screen.getByText('+2.50 dB')).toBeInTheDocument();
    });
  });

  describe('optional sections', () => {
    it('should render lyrics section when available', () => {
      const trackWithLyrics: Track = {
        ...mockTrack,
        lyrics: 'These are the lyrics',
      };

      render(<TrackInfoModal track={trackWithLyrics} onClose={mockOnClose} />);

      expect(screen.getByText('Letra')).toBeInTheDocument();
      expect(screen.getByText('These are the lyrics')).toBeInTheDocument();
    });

    it('should not render lyrics section when not available', () => {
      render(<TrackInfoModal track={mockTrack} onClose={mockOnClose} />);

      expect(screen.queryByText('Letra')).not.toBeInTheDocument();
    });

    it('should render comment section when available', () => {
      const trackWithComment: Track = {
        ...mockTrack,
        comment: 'This is a comment',
      };

      render(<TrackInfoModal track={trackWithComment} onClose={mockOnClose} />);

      expect(screen.getByText('Comentario')).toBeInTheDocument();
      expect(screen.getByText('This is a comment')).toBeInTheDocument();
    });

    it('should not render comment section when not available', () => {
      render(<TrackInfoModal track={mockTrack} onClose={mockOnClose} />);

      expect(screen.queryByText('Comentario')).not.toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onClose when close button is clicked', () => {
      render(<TrackInfoModal track={mockTrack} onClose={mockOnClose} />);

      const closeButton = screen.getByLabelText('Cerrar');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when clicking overlay', () => {
      render(<TrackInfoModal track={mockTrack} onClose={mockOnClose} />);

      const overlay = document.querySelector('[class*="trackInfoModal"]');
      if (overlay) {
        fireEvent.click(overlay);
      }

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when clicking modal content', () => {
      render(<TrackInfoModal track={mockTrack} onClose={mockOnClose} />);

      const content = document.querySelector('[class*="content"]');
      if (content) {
        fireEvent.click(content);
      }

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should show placeholder when no albumId', () => {
      const trackWithoutAlbum: Track = {
        ...mockTrack,
        albumId: undefined,
      };

      render(<TrackInfoModal track={trackWithoutAlbum} onClose={mockOnClose} />);

      // Should show placeholder instead of image
      expect(screen.getByText('?')).toBeInTheDocument();
    });

    it('should handle track without optional fields', () => {
      const minimalTrack: Track = {
        id: 'track-min',
        title: 'Minimal Track',
        duration: 180,
        size: '3000000',
        discNumber: 1,
        trackNumber: 1,
        path: '/music/track.mp3',
        createdAt: '2024-01-15T10:30:00.000Z',
        updatedAt: '2024-01-15T10:30:00.000Z',
      };

      render(<TrackInfoModal track={minimalTrack} onClose={mockOnClose} />);

      // Title appears in multiple places
      expect(screen.getAllByText('Minimal Track').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText('Artista:')).not.toBeInTheDocument();
      expect(screen.queryByText('Álbum:')).not.toBeInTheDocument();
    });

    it('should default to disc 1 when discNumber is not provided', () => {
      const trackWithoutDisc: Track = {
        ...mockTrack,
        discNumber: undefined,
      };

      render(<TrackInfoModal track={trackWithoutDisc as Track} onClose={mockOnClose} />);

      expect(screen.getByText('1 - Track 3')).toBeInTheDocument();
    });
  });
});
