import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TrackList } from './TrackList';
import type { Track } from '../../types';

// Mock wouter
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/', mockSetLocation],
}));

// Mock player context
const mockAddToQueue = vi.fn();
const mockTogglePlayPause = vi.fn();
vi.mock('@features/player/context/PlayerContext', () => ({
  usePlayer: () => ({
    addToQueue: mockAddToQueue,
    isPlaying: false,
    togglePlayPause: mockTogglePlayPause,
  }),
}));

// Mock logger
vi.mock('@shared/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock download service
vi.mock('@shared/services/download.service', () => ({
  downloadService: {
    downloadTrack: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock child components
vi.mock('@features/playlists/components/AddToPlaylistModal', () => ({
  AddToPlaylistModal: ({ track, onClose }: { track: Track; onClose: () => void }) => (
    <div data-testid="add-to-playlist-modal">
      <span>Add to Playlist: {track.title}</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('../TrackInfoModal', () => ({
  TrackInfoModal: ({ track, onClose }: { track: Track; onClose: () => void }) => (
    <div data-testid="track-info-modal">
      <span>Track Info: {track.title}</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('../TrackOptionsMenu/TrackOptionsMenu', () => ({
  TrackOptionsMenu: ({
    track,
    onAddToPlaylist,
    onAddToQueue,
    onGoToAlbum,
    onGoToArtist,
    onShowInfo,
    onRemoveFromPlaylist,
    onDownload,
  }: {
    track: Track;
    onAddToPlaylist?: (track: Track) => void;
    onAddToQueue?: (track: Track) => void;
    onGoToAlbum?: (track: Track) => void;
    onGoToArtist?: (track: Track) => void;
    onShowInfo?: (track: Track) => void;
    onRemoveFromPlaylist?: (track: Track) => void;
    onDownload?: (track: Track) => void;
  }) => (
    <div data-testid={`track-options-${track.id}`}>
      {onAddToPlaylist && (
        <button onClick={() => onAddToPlaylist(track)}>Add to Playlist</button>
      )}
      {onAddToQueue && <button onClick={() => onAddToQueue(track)}>Add to Queue</button>}
      {onGoToAlbum && <button onClick={() => onGoToAlbum(track)}>Go to Album</button>}
      {onGoToArtist && <button onClick={() => onGoToArtist(track)}>Go to Artist</button>}
      {onShowInfo && <button onClick={() => onShowInfo(track)}>Show Info</button>}
      {onRemoveFromPlaylist && (
        <button onClick={() => onRemoveFromPlaylist(track)}>Remove from Playlist</button>
      )}
      {onDownload && <button onClick={() => onDownload(track)}>Download</button>}
    </div>
  ),
}));

vi.mock('@shared/components/ui/RatingStars', () => ({
  RatingStars: ({ itemId }: { itemId: string }) => (
    <div data-testid={`rating-stars-${itemId}`}>Rating Stars</div>
  ),
}));

// Mock data
const mockTracks: Track[] = [
  {
    id: 'track-1',
    title: 'Comfortably Numb',
    artistName: 'Pink Floyd',
    artistId: 'artist-1',
    albumId: 'album-1',
    albumName: 'The Wall',
    duration: 382,
    trackNumber: 1,
    discNumber: 1,
    suffix: 'flac',
    bitRate: 1411000,
  },
  {
    id: 'track-2',
    title: 'Another Brick in the Wall',
    artistName: 'Pink Floyd',
    artistId: 'artist-1',
    albumId: 'album-1',
    albumName: 'The Wall',
    duration: 239,
    trackNumber: 2,
    discNumber: 1,
    suffix: 'mp3',
    bitRate: 320000,
  },
  {
    id: 'track-3',
    title: 'Hey You',
    artistName: 'Pink Floyd',
    artistId: 'artist-1',
    albumId: 'album-1',
    albumName: 'The Wall',
    duration: 284,
    trackNumber: 3,
    discNumber: 1,
    suffix: 'flac',
    bitRate: 1411000,
  },
];

const mockMultiDiscTracks: Track[] = [
  {
    id: 'track-d1-1',
    title: 'Track 1 Disc 1',
    artistName: 'Artist',
    artistId: 'artist-1',
    albumId: 'album-1',
    albumName: 'Double Album',
    duration: 200,
    trackNumber: 1,
    discNumber: 1,
    suffix: 'flac',
    bitRate: 1411000,
  },
  {
    id: 'track-d1-2',
    title: 'Track 2 Disc 1',
    artistName: 'Artist',
    artistId: 'artist-1',
    albumId: 'album-1',
    albumName: 'Double Album',
    duration: 200,
    trackNumber: 2,
    discNumber: 1,
    suffix: 'flac',
    bitRate: 1411000,
  },
  {
    id: 'track-d2-1',
    title: 'Track 1 Disc 2',
    artistName: 'Artist',
    artistId: 'artist-1',
    albumId: 'album-1',
    albumName: 'Double Album',
    duration: 200,
    trackNumber: 1,
    discNumber: 2,
    suffix: 'flac',
    bitRate: 1411000,
  },
];

const mockMissingTrack: Track = {
  id: 'track-missing',
  title: 'Missing Track',
  artistName: 'Artist',
  artistId: 'artist-1',
  albumId: 'album-1',
  albumName: 'Album',
  duration: 200,
  trackNumber: 1,
  isMissing: true,
};

describe('TrackList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.innerWidth for desktop
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  describe('rendering', () => {
    it('should render track titles', () => {
      render(<TrackList tracks={mockTracks} />);

      expect(screen.getByText('Comfortably Numb')).toBeInTheDocument();
      expect(screen.getByText('Another Brick in the Wall')).toBeInTheDocument();
      expect(screen.getByText('Hey You')).toBeInTheDocument();
    });

    it('should render artist names', () => {
      render(<TrackList tracks={mockTracks} />);

      const artistElements = screen.getAllByText('Pink Floyd');
      expect(artistElements.length).toBe(3);
    });

    it('should render track numbers', () => {
      render(<TrackList tracks={mockTracks} />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should render header row', () => {
      render(<TrackList tracks={mockTracks} />);

      expect(screen.getByText('#')).toBeInTheDocument();
      expect(screen.getByText('Título')).toBeInTheDocument();
      expect(screen.getByText('Formato')).toBeInTheDocument();
      expect(screen.getByText('Duración')).toBeInTheDocument();
      expect(screen.getByText('Calificación')).toBeInTheDocument();
    });

    it('should render track options menu for each track', () => {
      render(<TrackList tracks={mockTracks} />);

      expect(screen.getByTestId('track-options-track-1')).toBeInTheDocument();
      expect(screen.getByTestId('track-options-track-2')).toBeInTheDocument();
      expect(screen.getByTestId('track-options-track-3')).toBeInTheDocument();
    });

    it('should render rating stars on desktop', () => {
      render(<TrackList tracks={mockTracks} />);

      expect(screen.getByTestId('rating-stars-track-1')).toBeInTheDocument();
      expect(screen.getByTestId('rating-stars-track-2')).toBeInTheDocument();
    });
  });

  describe('format display', () => {
    it('should render file format in uppercase', () => {
      render(<TrackList tracks={mockTracks} />);

      const flacElements = screen.getAllByText('FLAC');
      expect(flacElements.length).toBe(2);
      expect(screen.getByText('MP3')).toBeInTheDocument();
    });

    it('should render bitrate in kbps', () => {
      render(<TrackList tracks={mockTracks} />);

      const highBitrateElements = screen.getAllByText('1411 kbps');
      expect(highBitrateElements.length).toBe(2);
      expect(screen.getByText('320 kbps')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should render empty state when no tracks', () => {
      render(<TrackList tracks={[]} />);

      expect(screen.getByText('No se encontraron canciones en este álbum')).toBeInTheDocument();
    });
  });

  describe('play functionality', () => {
    it('should call onTrackPlay when clicking track', () => {
      const mockOnTrackPlay = vi.fn();
      render(<TrackList tracks={mockTracks} onTrackPlay={mockOnTrackPlay} />);

      fireEvent.click(screen.getByText('Comfortably Numb'));

      expect(mockOnTrackPlay).toHaveBeenCalledWith(mockTracks[0]);
    });

    it('should call togglePlayPause when clicking current track', () => {
      const mockOnTrackPlay = vi.fn();
      render(
        <TrackList
          tracks={mockTracks}
          onTrackPlay={mockOnTrackPlay}
          currentTrackId="track-1"
        />
      );

      fireEvent.click(screen.getByText('Comfortably Numb'));

      expect(mockTogglePlayPause).toHaveBeenCalled();
      expect(mockOnTrackPlay).not.toHaveBeenCalled();
    });

    it('should render play button with correct aria-label', () => {
      render(<TrackList tracks={mockTracks} />);

      expect(screen.getByLabelText('Play Comfortably Numb')).toBeInTheDocument();
    });
  });

  describe('multiple discs', () => {
    it('should render disc separators for multi-disc albums', () => {
      render(<TrackList tracks={mockMultiDiscTracks} />);

      expect(screen.getByText('CD 1')).toBeInTheDocument();
      expect(screen.getByText('CD 2')).toBeInTheDocument();
    });

    it('should not render disc separators for single disc albums', () => {
      render(<TrackList tracks={mockTracks} />);

      expect(screen.queryByText('CD 1')).not.toBeInTheDocument();
    });
  });

  describe('missing tracks', () => {
    it('should render missing track with ghost icon', () => {
      render(<TrackList tracks={[mockMissingTrack]} />);

      expect(screen.getByText('Missing Track')).toBeInTheDocument();
    });

    it('should not call onTrackPlay when clicking missing track', () => {
      const mockOnTrackPlay = vi.fn();
      render(<TrackList tracks={[mockMissingTrack]} onTrackPlay={mockOnTrackPlay} />);

      fireEvent.click(screen.getByText('Missing Track'));

      expect(mockOnTrackPlay).not.toHaveBeenCalled();
    });

    it('should not render options menu for missing tracks', () => {
      render(<TrackList tracks={[mockMissingTrack]} />);

      expect(screen.queryByTestId('track-options-track-missing')).not.toBeInTheDocument();
    });

    it('should not render rating stars for missing tracks', () => {
      render(<TrackList tracks={[mockMissingTrack]} />);

      expect(screen.queryByTestId('rating-stars-track-missing')).not.toBeInTheDocument();
    });
  });

  describe('track options', () => {
    it('should open add to playlist modal when clicking add to playlist', async () => {
      render(<TrackList tracks={mockTracks} />);

      fireEvent.click(screen.getAllByText('Add to Playlist')[0]);

      await waitFor(() => {
        expect(screen.getByTestId('add-to-playlist-modal')).toBeInTheDocument();
        expect(screen.getByText('Add to Playlist: Comfortably Numb')).toBeInTheDocument();
      });
    });

    it('should close add to playlist modal when clicking close', async () => {
      render(<TrackList tracks={mockTracks} />);

      fireEvent.click(screen.getAllByText('Add to Playlist')[0]);

      await waitFor(() => {
        expect(screen.getByTestId('add-to-playlist-modal')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Close'));

      await waitFor(() => {
        expect(screen.queryByTestId('add-to-playlist-modal')).not.toBeInTheDocument();
      });
    });

    it('should call addToQueue when clicking add to queue', () => {
      render(<TrackList tracks={mockTracks} />);

      fireEvent.click(screen.getAllByText('Add to Queue')[0]);

      expect(mockAddToQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'track-1',
          title: 'Comfortably Numb',
          artist: 'Pink Floyd',
        })
      );
    });

    it('should navigate to album when clicking go to album', () => {
      render(<TrackList tracks={mockTracks} />);

      fireEvent.click(screen.getAllByText('Go to Album')[0]);

      expect(mockSetLocation).toHaveBeenCalledWith('/album/album-1');
    });

    it('should navigate to artist when clicking go to artist', () => {
      render(<TrackList tracks={mockTracks} />);

      fireEvent.click(screen.getAllByText('Go to Artist')[0]);

      expect(mockSetLocation).toHaveBeenCalledWith('/artists/artist-1');
    });

    it('should open track info modal when clicking show info', async () => {
      render(<TrackList tracks={mockTracks} />);

      fireEvent.click(screen.getAllByText('Show Info')[0]);

      await waitFor(() => {
        expect(screen.getByTestId('track-info-modal')).toBeInTheDocument();
        expect(screen.getByText('Track Info: Comfortably Numb')).toBeInTheDocument();
      });
    });
  });

  describe('hideGoToAlbum prop', () => {
    it('should hide go to album button when hideGoToAlbum is true', () => {
      render(<TrackList tracks={mockTracks} hideGoToAlbum />);

      expect(screen.queryByText('Go to Album')).not.toBeInTheDocument();
    });

    it('should show go to album button when hideGoToAlbum is false', () => {
      render(<TrackList tracks={mockTracks} hideGoToAlbum={false} />);

      expect(screen.getAllByText('Go to Album').length).toBe(3);
    });
  });

  describe('hideAlbumCover prop', () => {
    it('should render album cover by default', () => {
      render(<TrackList tracks={mockTracks} />);

      const images = screen.getAllByRole('img');
      expect(images.length).toBe(3);
    });

    it('should hide album cover when hideAlbumCover is true', () => {
      render(<TrackList tracks={mockTracks} hideAlbumCover />);

      const images = screen.queryAllByRole('img');
      expect(images.length).toBe(0);
    });
  });

  describe('playlist reordering', () => {
    it('should render reorder buttons when onMoveUp and onMoveDown are provided', () => {
      const mockMoveUp = vi.fn();
      const mockMoveDown = vi.fn();

      render(
        <TrackList tracks={mockTracks} onMoveUp={mockMoveUp} onMoveDown={mockMoveDown} />
      );

      expect(screen.getAllByTitle('Mover arriba').length).toBe(3);
      expect(screen.getAllByTitle('Mover abajo').length).toBe(3);
    });

    it('should not render reorder buttons when handlers not provided', () => {
      render(<TrackList tracks={mockTracks} />);

      expect(screen.queryByTitle('Mover arriba')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Mover abajo')).not.toBeInTheDocument();
    });

    it('should call onMoveUp when clicking move up button', () => {
      const mockMoveUp = vi.fn();
      const mockMoveDown = vi.fn();

      render(
        <TrackList tracks={mockTracks} onMoveUp={mockMoveUp} onMoveDown={mockMoveDown} />
      );

      const moveUpButtons = screen.getAllByTitle('Mover arriba');
      fireEvent.click(moveUpButtons[1]); // Click second track's move up

      expect(mockMoveUp).toHaveBeenCalledWith(mockTracks[1], 1);
    });

    it('should call onMoveDown when clicking move down button', () => {
      const mockMoveUp = vi.fn();
      const mockMoveDown = vi.fn();

      render(
        <TrackList tracks={mockTracks} onMoveUp={mockMoveUp} onMoveDown={mockMoveDown} />
      );

      const moveDownButtons = screen.getAllByTitle('Mover abajo');
      fireEvent.click(moveDownButtons[0]); // Click first track's move down

      expect(mockMoveDown).toHaveBeenCalledWith(mockTracks[0], 0);
    });

    it('should disable move up button for first track', () => {
      const mockMoveUp = vi.fn();
      const mockMoveDown = vi.fn();

      render(
        <TrackList tracks={mockTracks} onMoveUp={mockMoveUp} onMoveDown={mockMoveDown} />
      );

      const moveUpButtons = screen.getAllByTitle('Mover arriba');
      expect(moveUpButtons[0]).toBeDisabled();
    });

    it('should disable move down button for last track', () => {
      const mockMoveUp = vi.fn();
      const mockMoveDown = vi.fn();

      render(
        <TrackList tracks={mockTracks} onMoveUp={mockMoveUp} onMoveDown={mockMoveDown} />
      );

      const moveDownButtons = screen.getAllByTitle('Mover abajo');
      expect(moveDownButtons[2]).toBeDisabled();
    });

    it('should render order header when reordering is enabled', () => {
      const mockMoveUp = vi.fn();
      const mockMoveDown = vi.fn();

      render(
        <TrackList tracks={mockTracks} onMoveUp={mockMoveUp} onMoveDown={mockMoveDown} />
      );

      expect(screen.getByText('Orden')).toBeInTheDocument();
    });
  });

  describe('remove from playlist', () => {
    it('should render remove button when onRemoveFromPlaylist is provided', () => {
      const mockRemove = vi.fn();

      render(<TrackList tracks={mockTracks} onRemoveFromPlaylist={mockRemove} />);

      expect(screen.getAllByText('Remove from Playlist').length).toBe(3);
    });

    it('should call onRemoveFromPlaylist when clicking remove', () => {
      const mockRemove = vi.fn();

      render(<TrackList tracks={mockTracks} onRemoveFromPlaylist={mockRemove} />);

      fireEvent.click(screen.getAllByText('Remove from Playlist')[0]);

      expect(mockRemove).toHaveBeenCalledWith(mockTracks[0]);
    });
  });

  describe('current track highlighting', () => {
    it('should highlight current track', () => {
      const { container } = render(
        <TrackList tracks={mockTracks} currentTrackId="track-1" />
      );

      const activeTrack = container.querySelector('.trackList__track--active');
      expect(activeTrack).toBeInTheDocument();
    });
  });

  describe('playlist order display', () => {
    it('should display playlistOrder when available', () => {
      const tracksWithPlaylistOrder: Track[] = [
        {
          ...mockTracks[0],
          playlistOrder: 5,
        },
      ];

      render(<TrackList tracks={tracksWithPlaylistOrder} />);

      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });
});
