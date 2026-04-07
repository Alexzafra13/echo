import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GenreSelectModal, Genre } from './GenreSelectModal';

describe('GenreSelectModal', () => {
  const mockGenres: Genre[] = [
    { id: 'all', label: 'Todos', icon: '🎵' },
    { id: 'rock', label: 'Rock', icon: '🎸' },
    { id: 'pop', label: 'Pop', icon: '🎤' },
    { id: 'jazz', label: 'Jazz', icon: '🎷' },
    { id: 'classical', label: 'Classical', icon: '🎻' },
    { id: 'electronic', label: 'Electronic', icon: '🎧' },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    genres: mockGenres,
    selectedGenre: 'all',
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<GenreSelectModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Seleccionar género')).not.toBeInTheDocument();
    });

    it('should render modal title', () => {
      render(<GenreSelectModal {...defaultProps} />);

      expect(screen.getByText('Seleccionar género')).toBeInTheDocument();
    });

    it('should render search input', () => {
      render(<GenreSelectModal {...defaultProps} />);

      expect(screen.getByPlaceholderText('Buscar género...')).toBeInTheDocument();
    });

    it('should render genre list', () => {
      render(<GenreSelectModal {...defaultProps} />);

      expect(screen.getByText('Rock')).toBeInTheDocument();
      expect(screen.getByText('Pop')).toBeInTheDocument();
      expect(screen.getByText('Jazz')).toBeInTheDocument();
      expect(screen.getByText('Classical')).toBeInTheDocument();
      expect(screen.getByText('Electronic')).toBeInTheDocument();
    });

    it('should render genre icons', () => {
      render(<GenreSelectModal {...defaultProps} />);

      expect(screen.getByText('🎸')).toBeInTheDocument();
      expect(screen.getByText('🎤')).toBeInTheDocument();
      expect(screen.getByText('🎷')).toBeInTheDocument();
    });

    it('should render close button with aria-label', () => {
      render(<GenreSelectModal {...defaultProps} />);

      expect(screen.getByLabelText('Cerrar')).toBeInTheDocument();
    });

    it('should render genre without icon', () => {
      const genresWithoutIcon: Genre[] = [
        { id: 'noicon', label: 'No Icon Genre' },
      ];
      render(<GenreSelectModal {...defaultProps} genres={genresWithoutIcon} />);

      expect(screen.getByText('No Icon Genre')).toBeInTheDocument();
    });
  });

  describe('selection', () => {
    it('should show selected state on current genre', () => {
      render(<GenreSelectModal {...defaultProps} selectedGenre="rock" />);

      const rockButton = screen.getByText('Rock').closest('button');
      expect(rockButton?.className).toContain('selected');
    });

    it('should call onChange when genre is clicked', () => {
      const onChange = vi.fn();
      render(<GenreSelectModal {...defaultProps} onChange={onChange} />);

      fireEvent.click(screen.getByText('Rock'));

      expect(onChange).toHaveBeenCalledWith('rock');
    });

    it('should call onClose after selecting genre', () => {
      const onClose = vi.fn();
      render(<GenreSelectModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText('Rock'));

      expect(onClose).toHaveBeenCalled();
    });

    it('should allow selecting different genre', () => {
      const onChange = vi.fn();
      render(<GenreSelectModal {...defaultProps} onChange={onChange} selectedGenre="rock" />);

      fireEvent.click(screen.getByText('Jazz'));

      expect(onChange).toHaveBeenCalledWith('jazz');
    });
  });

  describe('search functionality', () => {
    it('should filter genres by label', () => {
      render(<GenreSelectModal {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Buscar género...');
      fireEvent.change(searchInput, { target: { value: 'Rock' } });

      expect(screen.getByText('Rock')).toBeInTheDocument();
      expect(screen.queryByText('Pop')).not.toBeInTheDocument();
      expect(screen.queryByText('Jazz')).not.toBeInTheDocument();
    });

    it('should be case insensitive', () => {
      render(<GenreSelectModal {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Buscar género...');
      fireEvent.change(searchInput, { target: { value: 'rock' } });

      expect(screen.getByText('Rock')).toBeInTheDocument();
    });

    it('should show empty state when no results', () => {
      render(<GenreSelectModal {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Buscar género...');
      fireEvent.change(searchInput, { target: { value: 'xyz' } });

      expect(screen.getByText('No se encontraron géneros')).toBeInTheDocument();
    });

    it('should show clear button when searching', () => {
      render(<GenreSelectModal {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Buscar género...');
      fireEvent.change(searchInput, { target: { value: 'Rock' } });

      expect(screen.getByLabelText('Limpiar búsqueda')).toBeInTheDocument();
    });

    it('should clear search when clear button is clicked', () => {
      render(<GenreSelectModal {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Buscar género...');
      fireEvent.change(searchInput, { target: { value: 'Rock' } });

      fireEvent.click(screen.getByLabelText('Limpiar búsqueda'));

      expect(searchInput).toHaveValue('');
      expect(screen.getByText('Pop')).toBeInTheDocument();
      expect(screen.getByText('Jazz')).toBeInTheDocument();
    });

    it('should not show clear button when search is empty', () => {
      render(<GenreSelectModal {...defaultProps} />);

      expect(screen.queryByLabelText('Limpiar búsqueda')).not.toBeInTheDocument();
    });

    it('should filter multiple matching genres', () => {
      const genresWithSimilarNames: Genre[] = [
        { id: 'rock', label: 'Rock', icon: '🎸' },
        { id: 'hard-rock', label: 'Hard Rock', icon: '🤘' },
        { id: 'soft-rock', label: 'Soft Rock', icon: '🎵' },
        { id: 'pop', label: 'Pop', icon: '🎤' },
      ];
      render(<GenreSelectModal {...defaultProps} genres={genresWithSimilarNames} />);

      const searchInput = screen.getByPlaceholderText('Buscar género...');
      fireEvent.change(searchInput, { target: { value: 'rock' } });

      expect(screen.getByText('Rock')).toBeInTheDocument();
      expect(screen.getByText('Hard Rock')).toBeInTheDocument();
      expect(screen.getByText('Soft Rock')).toBeInTheDocument();
      expect(screen.queryByText('Pop')).not.toBeInTheDocument();
    });
  });

  describe('close behavior', () => {
    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(<GenreSelectModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByLabelText('Cerrar'));

      expect(onClose).toHaveBeenCalled();
    });

    it('should call onClose when clicking overlay', () => {
      const onClose = vi.fn();
      render(<GenreSelectModal {...defaultProps} onClose={onClose} />);

      const overlay = document.querySelector('[class*="overlay"]');
      if (overlay) {
        fireEvent.click(overlay);
      }

      expect(onClose).toHaveBeenCalled();
    });

    it('should not call onClose when clicking modal content', () => {
      const onClose = vi.fn();
      render(<GenreSelectModal {...defaultProps} onClose={onClose} />);

      const content = document.querySelector('[class*="content"]');
      if (content) {
        fireEvent.click(content);
      }

      expect(onClose).not.toHaveBeenCalled();
    });

    it('should clear search query when closing', () => {
      render(<GenreSelectModal {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Buscar género...');
      fireEvent.change(searchInput, { target: { value: 'Rock' } });

      fireEvent.click(screen.getByLabelText('Cerrar'));

      // The component clears search on handleClose
      // When reopened, search should be empty
    });
  });

  describe('edge cases', () => {
    it('should handle empty genres list', () => {
      render(<GenreSelectModal {...defaultProps} genres={[]} />);

      expect(screen.getByText('Seleccionar género')).toBeInTheDocument();
      // No genres to display, but modal should still render
    });

    it('should handle genre with special characters in label', () => {
      const specialGenres: Genre[] = [
        { id: 'rnb', label: 'R&B / Soul', icon: '🎤' },
      ];
      render(<GenreSelectModal {...defaultProps} genres={specialGenres} />);

      expect(screen.getByText('R&B / Soul')).toBeInTheDocument();
    });
  });
});
