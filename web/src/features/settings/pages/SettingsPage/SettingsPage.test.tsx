import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingsPage from './SettingsPage';
import { usePlayerSettingsStore } from '@features/player/store/playerSettingsStore';

// Mock dependencies
vi.mock('@shared/components/layout/Header', () => ({
  Header: ({
    showBackButton,
    disableSearch,
  }: {
    showBackButton?: boolean;
    disableSearch?: boolean;
  }) => (
    <header data-testid="header" data-back={showBackButton} data-no-search={disableSearch}>
      Header
    </header>
  ),
}));

vi.mock('@shared/components/layout/Sidebar', () => ({
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
  useDocumentTitle: vi.fn(),
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

vi.mock('../../hooks/useLibraryAnalysisSettings', () => ({
  useLibraryAnalysisSettings: () => ({
    lufsEnabled: true,
    djEnabled: true,
    isLoading: false,
    error: null,
    setLufsEnabled: vi.fn(),
    setDjEnabled: vi.fn(),
    isSaving: false,
  }),
}));

const mockPlaybackState = {
  crossfade: { enabled: false, duration: 2, smartMode: false },
  setCrossfadeEnabled: vi.fn(),
  setCrossfadeDuration: vi.fn(),
  setCrossfadeSmartMode: vi.fn(),
  setCrossfadeTempoMatch: vi.fn(),
  normalization: { enabled: true },
  setNormalizationEnabled: vi.fn(),
  volumeControlSupported: true,
};

const mockAutoplayState = {
  autoplay: { enabled: true },
  setAutoplayEnabled: vi.fn(),
};

vi.mock('@features/player', () => ({
  usePlayback: () => mockPlaybackState,
  useAutoplayContext: () => mockAutoplayState,
}));

vi.mock('@features/notifications', () => ({
  useNotificationPreferences: () => ({ data: [], isLoading: false }),
  useUpdatePreference: () => ({ mutate: vi.fn(), isPending: false }),
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
    mockPlaybackState.crossfade = { enabled: false, duration: 5, smartMode: false };
    mockPlaybackState.normalization = { enabled: true };
    mockPlaybackState.volumeControlSupported = true;
    mockAutoplayState.autoplay = { enabled: true };
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
      expect(screen.getByText('Análisis de Librería')).toBeInTheDocument();
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

  describe('playback settings', () => {
    it('should render crossfade toggle', () => {
      render(<SettingsPage />);

      expect(screen.getByText('Fundido entre canciones')).toBeInTheDocument();
    });

    it('should toggle crossfade', () => {
      render(<SettingsPage />);

      const crossfadeLabel = screen
        .getByText('Fundido entre canciones')
        .closest('div')?.parentElement;
      const toggle = crossfadeLabel?.querySelector('input[type="checkbox"]');

      fireEvent.click(toggle!);

      expect(mockPlaybackState.setCrossfadeEnabled).toHaveBeenCalledWith(true);
    });

    it('should show the crossfade duration slider when enabled', () => {
      mockPlaybackState.crossfade.enabled = true;
      render(<SettingsPage />);

      expect(screen.getByText('Duración del fundido')).toBeInTheDocument();
      expect(screen.getByText('5 s')).toBeInTheDocument();
    });

    it('should update the crossfade duration from the slider', () => {
      mockPlaybackState.crossfade.enabled = true;
      render(<SettingsPage />);

      fireEvent.change(screen.getByLabelText('Duración del fundido'), { target: { value: '8' } });

      expect(mockPlaybackState.setCrossfadeDuration).toHaveBeenCalledWith(8);
    });

    it('should hide the crossfade duration slider when disabled', () => {
      mockPlaybackState.crossfade.enabled = false;
      render(<SettingsPage />);

      expect(screen.queryByText('Duración del fundido')).not.toBeInTheDocument();
    });

    it('should toggle smart crossfade when crossfade is enabled', () => {
      mockPlaybackState.crossfade.enabled = true;
      render(<SettingsPage />);

      fireEvent.click(screen.getByLabelText('Fundido inteligente'));

      expect(mockPlaybackState.setCrossfadeSmartMode).toHaveBeenCalledWith(true);
    });

    it('should toggle tempo matching when crossfade is enabled', () => {
      mockPlaybackState.crossfade.enabled = true;
      render(<SettingsPage />);

      fireEvent.click(screen.getByLabelText('Ajuste de tempo'));

      expect(mockPlaybackState.setCrossfadeTempoMatch).toHaveBeenCalledWith(true);
    });

    it('should toggle DJ mix for shuffle', () => {
      render(<SettingsPage />);

      const toggle = screen.getByLabelText('Mezcla DJ al reproducir aleatorio') as HTMLInputElement;
      expect(toggle.checked).toBe(true);
      fireEvent.click(toggle);

      expect(usePlayerSettingsStore.getState().djMode.enabled).toBe(false);
      usePlayerSettingsStore.getState().setDjModeEnabled(true);
    });

    it('should toggle volume normalization', () => {
      render(<SettingsPage />);

      const toggle = screen.getByLabelText('Normalización de volumen');
      fireEvent.click(toggle);

      expect(mockPlaybackState.setNormalizationEnabled).toHaveBeenCalledWith(false);
    });

    it('should hide normalization when volume control is not supported', () => {
      mockPlaybackState.volumeControlSupported = false;
      render(<SettingsPage />);

      expect(screen.queryByText('Normalización de volumen')).not.toBeInTheDocument();
    });

    it('should render autoplay toggle', () => {
      render(<SettingsPage />);

      expect(screen.getByText('Reproducción automática')).toBeInTheDocument();
    });

    it('should toggle autoplay', () => {
      render(<SettingsPage />);

      const autoplayLabel = screen
        .getByText('Reproducción automática')
        .closest('div')?.parentElement;
      const toggle = autoplayLabel?.querySelector('input[type="checkbox"]');

      fireEvent.click(toggle!);

      expect(mockAutoplayState.setAutoplayEnabled).toHaveBeenCalled();
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
