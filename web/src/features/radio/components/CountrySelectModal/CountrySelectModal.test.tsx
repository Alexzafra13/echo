import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CountrySelectModal } from './CountrySelectModal';
import type { Country } from '../CountrySelect/CountrySelect';

describe('CountrySelectModal', () => {
  const mockCountries: Country[] = [
    { code: 'ES', name: 'Spain', flag: '🇪🇸', stationCount: 500 },
    { code: 'US', name: 'United States', flag: '🇺🇸', stationCount: 1000 },
    { code: 'UK', name: 'United Kingdom', flag: '🇬🇧', stationCount: 800 },
    { code: 'FR', name: 'France', flag: '🇫🇷', stationCount: 600 },
    { code: 'DE', name: 'Germany', flag: '🇩🇪', stationCount: 700 },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    countries: mockCountries,
    selectedCountry: 'ALL',
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<CountrySelectModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Seleccionar país')).not.toBeInTheDocument();
    });

    it('should render modal title', () => {
      render(<CountrySelectModal {...defaultProps} />);

      expect(screen.getByText('Seleccionar país')).toBeInTheDocument();
    });

    it('should render search input', () => {
      render(<CountrySelectModal {...defaultProps} />);

      expect(screen.getByPlaceholderText('Buscar país...')).toBeInTheDocument();
    });

    it('should render "Todo el mundo" option', () => {
      render(<CountrySelectModal {...defaultProps} />);

      expect(screen.getByText('Todo el mundo')).toBeInTheDocument();
    });

    it('should render country list', () => {
      render(<CountrySelectModal {...defaultProps} />);

      expect(screen.getByText(/Spain/)).toBeInTheDocument();
      expect(screen.getByText(/United States/)).toBeInTheDocument();
      expect(screen.getByText(/United Kingdom/)).toBeInTheDocument();
    });

    it('should show station count for countries', () => {
      render(<CountrySelectModal {...defaultProps} />);

      expect(screen.getByText(/Spain \(500\)/)).toBeInTheDocument();
      expect(screen.getByText(/United States \(1000\)/)).toBeInTheDocument();
    });

    it('should render close button with aria-label', () => {
      render(<CountrySelectModal {...defaultProps} />);

      expect(screen.getByLabelText('Cerrar')).toBeInTheDocument();
    });
  });

  describe('user country section', () => {
    it('should show user country section when userCountryCode is provided', () => {
      render(<CountrySelectModal {...defaultProps} userCountryCode="ES" />);

      expect(screen.getByText('Tu país')).toBeInTheDocument();
    });

    it('should not show user country section when userCountryCode is not in list', () => {
      render(<CountrySelectModal {...defaultProps} userCountryCode="XX" />);

      expect(screen.queryByText('Tu país')).not.toBeInTheDocument();
    });
  });

  describe('selection', () => {
    it('should show checkmark on selected country', () => {
      render(<CountrySelectModal {...defaultProps} selectedCountry="ES" />);

      const spainButton = screen.getByText(/Spain/).closest('button');
      expect(spainButton?.textContent).toContain('✓');
    });

    it('should show checkmark on "Todo el mundo" when selected', () => {
      render(<CountrySelectModal {...defaultProps} selectedCountry="ALL" />);

      const allButton = screen.getByText('Todo el mundo').closest('button');
      expect(allButton?.textContent).toContain('✓');
    });

    it('should call onChange when country is clicked', () => {
      const onChange = vi.fn();
      render(<CountrySelectModal {...defaultProps} onChange={onChange} />);

      fireEvent.click(screen.getByText(/Spain/));

      expect(onChange).toHaveBeenCalledWith('ES');
    });

    it('should call onClose after selecting country', () => {
      const onClose = vi.fn();
      render(<CountrySelectModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByText(/Spain/));

      expect(onClose).toHaveBeenCalled();
    });

    it('should call onChange with ALL when "Todo el mundo" is clicked', () => {
      const onChange = vi.fn();
      render(<CountrySelectModal {...defaultProps} onChange={onChange} selectedCountry="ES" />);

      fireEvent.click(screen.getByText('Todo el mundo'));

      expect(onChange).toHaveBeenCalledWith('ALL');
    });
  });

  describe('search functionality', () => {
    it('should filter countries by name', () => {
      render(<CountrySelectModal {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Buscar país...');
      fireEvent.change(searchInput, { target: { value: 'Spain' } });

      expect(screen.getByText(/Spain/)).toBeInTheDocument();
      expect(screen.queryByText(/United States/)).not.toBeInTheDocument();
    });

    it('should filter countries by code', () => {
      render(<CountrySelectModal {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Buscar país...');
      fireEvent.change(searchInput, { target: { value: 'US' } });

      expect(screen.getByText(/United States/)).toBeInTheDocument();
      expect(screen.queryByText(/Spain/)).not.toBeInTheDocument();
    });

    it('should be case insensitive', () => {
      render(<CountrySelectModal {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Buscar país...');
      fireEvent.change(searchInput, { target: { value: 'spain' } });

      expect(screen.getByText(/Spain/)).toBeInTheDocument();
    });

    it('should show empty state when no results', () => {
      render(<CountrySelectModal {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Buscar país...');
      fireEvent.change(searchInput, { target: { value: 'xyz' } });

      expect(screen.getByText('No se encontraron países')).toBeInTheDocument();
    });

    it('should show clear button when searching', () => {
      render(<CountrySelectModal {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Buscar país...');
      fireEvent.change(searchInput, { target: { value: 'Spain' } });

      expect(screen.getByLabelText('Limpiar búsqueda')).toBeInTheDocument();
    });

    it('should clear search when clear button is clicked', () => {
      render(<CountrySelectModal {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Buscar país...');
      fireEvent.change(searchInput, { target: { value: 'Spain' } });

      fireEvent.click(screen.getByLabelText('Limpiar búsqueda'));

      expect(searchInput).toHaveValue('');
      expect(screen.getByText(/United States/)).toBeInTheDocument();
    });
  });

  describe('close behavior', () => {
    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(<CountrySelectModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByLabelText('Cerrar'));

      expect(onClose).toHaveBeenCalled();
    });

    it('should call onClose when clicking overlay', () => {
      const onClose = vi.fn();
      render(<CountrySelectModal {...defaultProps} onClose={onClose} />);

      const overlay = document.querySelector('[class*="overlay"]');
      if (overlay) {
        fireEvent.click(overlay);
      }

      expect(onClose).toHaveBeenCalled();
    });

    it('should not call onClose when clicking modal content', () => {
      const onClose = vi.fn();
      render(<CountrySelectModal {...defaultProps} onClose={onClose} />);

      const content = document.querySelector('[class*="content"]');
      if (content) {
        fireEvent.click(content);
      }

      expect(onClose).not.toHaveBeenCalled();
    });

    it('should clear search query when closing', () => {
      const { rerender } = render(<CountrySelectModal {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText('Buscar país...');
      fireEvent.change(searchInput, { target: { value: 'Spain' } });

      fireEvent.click(screen.getByLabelText('Cerrar'));

      // Reopen modal
      rerender(<CountrySelectModal {...defaultProps} />);

      // Search should be cleared (component resets on close)
      expect(screen.getByPlaceholderText('Buscar país...')).toHaveValue('');
    });
  });

  describe('sections', () => {
    it('should show "Países populares" section', () => {
      render(<CountrySelectModal {...defaultProps} />);

      expect(screen.getByText('Países populares')).toBeInTheDocument();
    });
  });
});
