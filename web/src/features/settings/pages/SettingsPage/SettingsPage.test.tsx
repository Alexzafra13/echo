import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsPage } from './SettingsPage';

// Mock dependencies
vi.mock('@shared/components/layout/Header', () => ({
  Header: ({ showBackButton, disableSearch }: { showBackButton?: boolean; disableSearch?: boolean }) => (
    <header data-testid="header" data-back={showBackButton} data-no-search={disableSearch}>Header</header>
  ),
}));

vi.mock('@features/home/components', () => ({
  Sidebar: () => <aside data-testid="sidebar">Sidebar</aside>,
}));

// Mock state
const mockThemeState = {
  themePreference: 'auto' as 'auto' | 'light' | 'dark',
  theme: 'dark' as 'light' | 'dark',
  setThemePreference: vi.fn(),
};

vi.mock('@shared/hooks', () => ({
  useTheme: () => mockThemeState,
}));

const mockHomePreferences = {
  data: {
    homeSections: [
      { id: 'recent-albums', enabled: true, order: 0 },
      { id: 'artist-mix', enabled: true, order: 1 },
      { id: 'genre-mix', enabled: false, order: 2 },
      { id: 'recently-played', enabled: true, order: 3 },
    ],
  },
  isLoading: false,
};

const mockUpdateHome = {
  mutate: vi.fn(),
  isPending: false,
  isSuccess: false,
};

vi.mock('../../hooks', () => ({
  useHomePreferences: () => mockHomePreferences,
  useUpdateHomePreferences: () => mockUpdateHome,
}));

const mockPlayerState = {
  crossfade: { enabled: false, duration: 5, smartMode: false },
  setCrossfadeEnabled: vi.fn(),
  setCrossfadeDuration: vi.fn(),
  setCrossfadeSmartMode: vi.fn(),
  normalization: { enabled: false, targetLufs: -14 as -14 | -16, preventClipping: true },
  setNormalizationEnabled: vi.fn(),
  setNormalizationTargetLufs: vi.fn(),
  setNormalizationPreventClipping: vi.fn(),
  autoplay: { enabled: true },
  setAutoplayEnabled: vi.fn(),
};

vi.mock('@features/player', () => ({
  usePlayer: () => mockPlayerState,
}));

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock state
    mockThemeState.themePreference = 'auto';
    mockThemeState.theme = 'dark';
    mockHomePreferences.isLoading = false;
    mockHomePreferences.data = {
      homeSections: [
        { id: 'recent-albums', enabled: true, order: 0 },
        { id: 'artist-mix', enabled: true, order: 1 },
        { id: 'genre-mix', enabled: false, order: 2 },
        { id: 'recently-played', enabled: true, order: 3 },
      ],
    };
    mockUpdateHome.isPending = false;
    mockUpdateHome.isSuccess = false;
    mockPlayerState.crossfade = { enabled: false, duration: 5, smartMode: false };
    mockPlayerState.normalization = { enabled: false, targetLufs: -14, preventClipping: true };
    mockPlayerState.autoplay = { enabled: true };
  });

  describe('layout', () => {
    it('should render page structure', () => {
      render(<SettingsPage />);

      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByText('Configuración')).toBeInTheDocument();
      expect(screen.getByText('Personaliza tu experiencia')).toBeInTheDocument();
    });

    it('should render all setting cards', () => {
      render(<SettingsPage />);

      expect(screen.getByText('Personalizar Inicio')).toBeInTheDocument();
      expect(screen.getByText('Apariencia')).toBeInTheDocument();
      expect(screen.getByText('Idioma')).toBeInTheDocument();
      expect(screen.getByText('Normalización de Audio')).toBeInTheDocument();
      expect(screen.getByText('Reproducción')).toBeInTheDocument();
    });

    it('should show loading state', () => {
      mockHomePreferences.isLoading = true;
      render(<SettingsPage />);

      expect(screen.getByText('Cargando...')).toBeInTheDocument();
    });
  });

  describe('home sections customization', () => {
    it('should render home sections list', () => {
      render(<SettingsPage />);

      expect(screen.getByText('Álbumes Añadidos')).toBeInTheDocument();
      expect(screen.getByText('Mix por Artista')).toBeInTheDocument();
      expect(screen.getByText('Mix por Género')).toBeInTheDocument();
      expect(screen.getByText('Escuchados Recientes')).toBeInTheDocument();
    });

    it('should toggle section enabled state', () => {
      render(<SettingsPage />);

      const toggles = screen.getAllByRole('checkbox');
      // First toggle in home sections (after loading)
      const sectionToggle = toggles[0];

      fireEvent.click(sectionToggle);

      // Should show save button after change
      expect(screen.getByText('Guardar cambios')).toBeInTheDocument();
    });

    it('should move section up', () => {
      render(<SettingsPage />);

      const upButtons = screen.getAllByLabelText('Mover arriba');
      // Click up on second item (first up button that's not disabled)
      fireEvent.click(upButtons[1]);

      expect(screen.getByText('Guardar cambios')).toBeInTheDocument();
    });

    it('should move section down', () => {
      render(<SettingsPage />);

      const downButtons = screen.getAllByLabelText('Mover abajo');
      // Click down on first item
      fireEvent.click(downButtons[0]);

      expect(screen.getByText('Guardar cambios')).toBeInTheDocument();
    });

    it('should disable up button for first item', () => {
      render(<SettingsPage />);

      const upButtons = screen.getAllByLabelText('Mover arriba');
      expect(upButtons[0]).toBeDisabled();
    });

    it('should disable down button for last item', () => {
      render(<SettingsPage />);

      const downButtons = screen.getAllByLabelText('Mover abajo');
      expect(downButtons[downButtons.length - 1]).toBeDisabled();
    });

    it('should save home changes', () => {
      render(<SettingsPage />);

      // Make a change first
      const toggles = screen.getAllByRole('checkbox');
      fireEvent.click(toggles[0]);

      const saveButton = screen.getByText('Guardar cambios');
      fireEvent.click(saveButton);

      expect(mockUpdateHome.mutate).toHaveBeenCalled();
    });

    it('should show saving state', () => {
      mockUpdateHome.isPending = true;
      render(<SettingsPage />);

      // Make a change to show button
      const toggles = screen.getAllByRole('checkbox');
      fireEvent.click(toggles[0]);

      expect(screen.getByText('Guardando...')).toBeInTheDocument();
    });
  });

  describe('theme settings', () => {
    it('should render theme options', () => {
      render(<SettingsPage />);

      expect(screen.getByText('Automático')).toBeInTheDocument();
      expect(screen.getByText('Claro')).toBeInTheDocument();
      expect(screen.getByText('Oscuro')).toBeInTheDocument();
    });

    it('should show current theme preference as active', () => {
      mockThemeState.themePreference = 'dark';
      render(<SettingsPage />);

      const darkButton = screen.getByText('Oscuro').closest('button');
      expect(darkButton).toHaveClass('settingsPage__themeOption--active');
    });

    it('should change theme to light', () => {
      render(<SettingsPage />);

      const lightButton = screen.getByText('Claro').closest('button');
      fireEvent.click(lightButton!);

      expect(mockThemeState.setThemePreference).toHaveBeenCalledWith('light');
    });

    it('should change theme to dark', () => {
      render(<SettingsPage />);

      const darkButton = screen.getByText('Oscuro').closest('button');
      fireEvent.click(darkButton!);

      expect(mockThemeState.setThemePreference).toHaveBeenCalledWith('dark');
    });

    it('should change theme to auto', () => {
      mockThemeState.themePreference = 'dark';
      render(<SettingsPage />);

      const autoButton = screen.getByText('Automático').closest('button');
      fireEvent.click(autoButton!);

      expect(mockThemeState.setThemePreference).toHaveBeenCalledWith('auto');
    });

    it('should show current theme note when auto mode', () => {
      mockThemeState.themePreference = 'auto';
      mockThemeState.theme = 'dark';
      render(<SettingsPage />);

      expect(screen.getByText(/Actualmente usando tema oscuro/)).toBeInTheDocument();
    });
  });

  describe('audio normalization', () => {
    it('should render normalization toggle', () => {
      render(<SettingsPage />);

      expect(screen.getByText('Normalizar volumen')).toBeInTheDocument();
    });

    it('should toggle normalization', () => {
      render(<SettingsPage />);

      const toggleLabel = screen.getByText('Normalizar volumen').closest('div')?.parentElement;
      const toggle = toggleLabel?.querySelector('input[type="checkbox"]');

      fireEvent.click(toggle!);

      expect(mockPlayerState.setNormalizationEnabled).toHaveBeenCalledWith(true);
    });

    it('should show additional options when normalization enabled', () => {
      mockPlayerState.normalization.enabled = true;
      render(<SettingsPage />);

      expect(screen.getByText('Nivel de referencia')).toBeInTheDocument();
      expect(screen.getByText('Prevenir distorsión')).toBeInTheDocument();
    });

    it('should hide additional options when normalization disabled', () => {
      mockPlayerState.normalization.enabled = false;
      render(<SettingsPage />);

      expect(screen.queryByText('Nivel de referencia')).not.toBeInTheDocument();
      expect(screen.queryByText('Prevenir distorsión')).not.toBeInTheDocument();
    });

    it('should change target LUFS', () => {
      mockPlayerState.normalization.enabled = true;
      render(<SettingsPage />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '-16' } });

      expect(mockPlayerState.setNormalizationTargetLufs).toHaveBeenCalledWith(-16);
    });

    it('should toggle prevent clipping', () => {
      mockPlayerState.normalization.enabled = true;
      render(<SettingsPage />);

      const preventClippingLabel = screen.getByText('Prevenir distorsión').closest('div')?.parentElement;
      const toggle = preventClippingLabel?.querySelector('input[type="checkbox"]');

      fireEvent.click(toggle!);

      expect(mockPlayerState.setNormalizationPreventClipping).toHaveBeenCalled();
    });
  });

  describe('playback settings', () => {
    it('should render crossfade toggle', () => {
      render(<SettingsPage />);

      expect(screen.getByText('Fundido entre canciones')).toBeInTheDocument();
    });

    it('should toggle crossfade', () => {
      render(<SettingsPage />);

      const crossfadeLabel = screen.getByText('Fundido entre canciones').closest('div')?.parentElement;
      const toggle = crossfadeLabel?.querySelector('input[type="checkbox"]');

      fireEvent.click(toggle!);

      expect(mockPlayerState.setCrossfadeEnabled).toHaveBeenCalledWith(true);
    });

    it('should show crossfade options when enabled', () => {
      mockPlayerState.crossfade.enabled = true;
      render(<SettingsPage />);

      expect(screen.getByText('Duración del fundido')).toBeInTheDocument();
      expect(screen.getByText('Fundido inteligente')).toBeInTheDocument();
    });

    it('should hide crossfade options when disabled', () => {
      mockPlayerState.crossfade.enabled = false;
      render(<SettingsPage />);

      expect(screen.queryByText('Duración del fundido')).not.toBeInTheDocument();
      expect(screen.queryByText('Fundido inteligente')).not.toBeInTheDocument();
    });

    it('should change crossfade duration', () => {
      mockPlayerState.crossfade.enabled = true;
      render(<SettingsPage />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '8' } });

      expect(mockPlayerState.setCrossfadeDuration).toHaveBeenCalledWith(8);
    });

    it('should display current crossfade duration', () => {
      mockPlayerState.crossfade.enabled = true;
      mockPlayerState.crossfade.duration = 7;
      render(<SettingsPage />);

      expect(screen.getByText('7s')).toBeInTheDocument();
    });

    it('should toggle smart crossfade', () => {
      mockPlayerState.crossfade.enabled = true;
      render(<SettingsPage />);

      const smartLabel = screen.getByText('Fundido inteligente').closest('div')?.parentElement;
      const toggle = smartLabel?.querySelector('input[type="checkbox"]');

      fireEvent.click(toggle!);

      expect(mockPlayerState.setCrossfadeSmartMode).toHaveBeenCalledWith(true);
    });

    it('should render autoplay toggle', () => {
      render(<SettingsPage />);

      expect(screen.getByText('Reproducción automática')).toBeInTheDocument();
    });

    it('should toggle autoplay', () => {
      render(<SettingsPage />);

      const autoplayLabel = screen.getByText('Reproducción automática').closest('div')?.parentElement;
      const toggle = autoplayLabel?.querySelector('input[type="checkbox"]');

      fireEvent.click(toggle!);

      expect(mockPlayerState.setAutoplayEnabled).toHaveBeenCalled();
    });
  });

  describe('language settings', () => {
    it('should show language card', () => {
      render(<SettingsPage />);

      expect(screen.getByText('Idioma de la interfaz')).toBeInTheDocument();
      expect(screen.getByText('Español')).toBeInTheDocument();
    });
  });
});
