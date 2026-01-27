import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LibraryPanel } from './LibraryPanel';

// Mock the API
vi.mock('../../api/library.api', () => ({
  getLibraryConfig: vi.fn(),
  updateLibraryPath: vi.fn(),
  browseDirectories: vi.fn(),
}));

import { getLibraryConfig, updateLibraryPath, browseDirectories } from '../../api/library.api';

// Mock data
const mockConfig = {
  path: '/music/library',
  exists: true,
  readable: true,
  fileCount: 15000,
  mountedPaths: ['/music', '/media'],
};

const mockDirectories = {
  currentPath: '/music/library',
  parentPath: '/music',
  directories: [
    { name: 'Rock', path: '/music/library/Rock', readable: true, hasMusic: true },
    { name: 'Jazz', path: '/music/library/Jazz', readable: true, hasMusic: true },
    { name: 'Classical', path: '/music/library/Classical', readable: true, hasMusic: false },
    { name: 'Protected', path: '/music/library/Protected', readable: false, hasMusic: false },
  ],
};

describe('LibraryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('should show loading state initially', () => {
      vi.mocked(getLibraryConfig).mockImplementation(() => new Promise(() => {}));

      render(<LibraryPanel />);

      expect(screen.getByText('Cargando...')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should show error when config loading fails', async () => {
      vi.mocked(getLibraryConfig).mockRejectedValueOnce(new Error('Network error'));

      render(<LibraryPanel />);

      await waitFor(() => {
        expect(screen.getByText('Error cargando configuración')).toBeInTheDocument();
      });
    });
  });

  describe('rendering', () => {
    beforeEach(() => {
      vi.mocked(getLibraryConfig).mockResolvedValue(mockConfig);
    });

    it('should render panel title', async () => {
      render(<LibraryPanel />);

      await waitFor(() => {
        expect(screen.getByText('Biblioteca de Música')).toBeInTheDocument();
      });
    });

    it('should render description', async () => {
      render(<LibraryPanel />);

      await waitFor(() => {
        expect(screen.getByText('Configura la carpeta donde está tu colección de música')).toBeInTheDocument();
      });
    });

    it('should render current path label', async () => {
      render(<LibraryPanel />);

      await waitFor(() => {
        expect(screen.getByText('Ruta actual')).toBeInTheDocument();
      });
    });

    it('should render current path value', async () => {
      render(<LibraryPanel />);

      await waitFor(() => {
        expect(screen.getByText('/music/library')).toBeInTheDocument();
      });
    });

    it('should render file count when path exists', async () => {
      render(<LibraryPanel />);

      await waitFor(() => {
        expect(screen.getByText('15000 archivos')).toBeInTheDocument();
      });
    });

    it('should render change path button', async () => {
      render(<LibraryPanel />);

      await waitFor(() => {
        expect(screen.getByText('Cambiar ruta')).toBeInTheDocument();
      });
    });
  });

  describe('path not configured', () => {
    it('should show "No configurada" when path is empty', async () => {
      vi.mocked(getLibraryConfig).mockResolvedValue({
        ...mockConfig,
        path: '',
      });

      render(<LibraryPanel />);

      await waitFor(() => {
        expect(screen.getByText('No configurada')).toBeInTheDocument();
      });
    });
  });

  describe('path does not exist', () => {
    it('should show error when path does not exist', async () => {
      vi.mocked(getLibraryConfig).mockResolvedValue({
        ...mockConfig,
        exists: false,
      });

      render(<LibraryPanel />);

      await waitFor(() => {
        expect(screen.getByText('No existe')).toBeInTheDocument();
      });
    });
  });

  describe('directory browser', () => {
    beforeEach(() => {
      vi.mocked(getLibraryConfig).mockResolvedValue(mockConfig);
      vi.mocked(browseDirectories).mockResolvedValue(mockDirectories);
    });

    it('should open browser when clicking change path button', async () => {
      render(<LibraryPanel />);

      await waitFor(() => {
        expect(screen.getByText('Cambiar ruta')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Cambiar ruta'));

      await waitFor(() => {
        expect(screen.getByText('Seleccionar carpeta')).toBeInTheDocument();
      });
    });

    it('should show cancel button in browser', async () => {
      render(<LibraryPanel />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Cambiar ruta'));
      });

      await waitFor(() => {
        expect(screen.getByText('Cancelar')).toBeInTheDocument();
      });
    });

    it('should show current path in browser', async () => {
      render(<LibraryPanel />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Cambiar ruta'));
      });

      await waitFor(() => {
        expect(screen.getByText('Ubicación:')).toBeInTheDocument();
      });
    });

    it('should show directories', async () => {
      render(<LibraryPanel />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Cambiar ruta'));
      });

      await waitFor(() => {
        expect(screen.getByText('Rock')).toBeInTheDocument();
        expect(screen.getByText('Jazz')).toBeInTheDocument();
        expect(screen.getByText('Classical')).toBeInTheDocument();
      });
    });

    it('should show "Subir" button when parent path exists', async () => {
      render(<LibraryPanel />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Cambiar ruta'));
      });

      await waitFor(() => {
        expect(screen.getByText('Subir')).toBeInTheDocument();
      });
    });

    it('should show mounted paths as quick access', async () => {
      render(<LibraryPanel />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Cambiar ruta'));
      });

      await waitFor(() => {
        expect(screen.getByText('/music')).toBeInTheDocument();
        expect(screen.getByText('/media')).toBeInTheDocument();
      });
    });

    it('should close browser when clicking cancel', async () => {
      render(<LibraryPanel />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Cambiar ruta'));
      });

      await waitFor(() => {
        expect(screen.getByText('Seleccionar carpeta')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Cancelar'));

      await waitFor(() => {
        expect(screen.queryByText('Seleccionar carpeta')).not.toBeInTheDocument();
      });
    });

    it('should navigate to parent when clicking "Subir"', async () => {
      render(<LibraryPanel />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Cambiar ruta'));
      });

      await waitFor(() => {
        expect(screen.getByText('Subir')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Subir'));

      expect(browseDirectories).toHaveBeenCalledWith('/music');
    });

    it('should navigate to directory when clicking on it', async () => {
      render(<LibraryPanel />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Cambiar ruta'));
      });

      await waitFor(() => {
        expect(screen.getByText('Rock')).toBeInTheDocument();
      });

      // Find the Rock button (it's within a directory item)
      const rockButton = screen.getByText('Rock').closest('button');
      if (rockButton) {
        fireEvent.click(rockButton);
      }

      expect(browseDirectories).toHaveBeenCalledWith('/music/library/Rock');
    });
  });

  describe('path selection', () => {
    beforeEach(() => {
      vi.mocked(getLibraryConfig).mockResolvedValue(mockConfig);
      vi.mocked(browseDirectories).mockResolvedValue(mockDirectories);
    });

    it('should call updateLibraryPath when selecting a directory', async () => {
      vi.mocked(updateLibraryPath).mockResolvedValue({
        success: true,
        message: 'Path updated',
        fileCount: 500,
      });

      render(<LibraryPanel />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Cambiar ruta'));
      });

      await waitFor(() => {
        expect(screen.getByText('Rock')).toBeInTheDocument();
      });

      // Find and click the select button for Rock
      const selectButtons = screen.getAllByText('Seleccionar');
      fireEvent.click(selectButtons[0]);

      await waitFor(() => {
        expect(updateLibraryPath).toHaveBeenCalledWith('/music/library/Rock');
      });
    });

    it('should show success message after selecting path', async () => {
      vi.mocked(updateLibraryPath).mockResolvedValue({
        success: true,
        message: 'Path updated',
        fileCount: 500,
      });

      render(<LibraryPanel />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Cambiar ruta'));
      });

      await waitFor(() => {
        expect(screen.getByText('Rock')).toBeInTheDocument();
      });

      const selectButtons = screen.getAllByText('Seleccionar');
      fireEvent.click(selectButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Ruta actualizada. 500 archivos de música encontrados.')).toBeInTheDocument();
      });
    });

    it('should show error message when selection fails', async () => {
      vi.mocked(updateLibraryPath).mockResolvedValue({
        success: false,
        message: 'Directory not accessible',
        fileCount: 0,
      });

      render(<LibraryPanel />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Cambiar ruta'));
      });

      await waitFor(() => {
        expect(screen.getByText('Rock')).toBeInTheDocument();
      });

      const selectButtons = screen.getAllByText('Seleccionar');
      fireEvent.click(selectButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Directory not accessible')).toBeInTheDocument();
      });
    });

    it('should show error when API call fails', async () => {
      vi.mocked(updateLibraryPath).mockRejectedValue(new Error('Network error'));

      render(<LibraryPanel />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Cambiar ruta'));
      });

      await waitFor(() => {
        expect(screen.getByText('Rock')).toBeInTheDocument();
      });

      const selectButtons = screen.getAllByText('Seleccionar');
      fireEvent.click(selectButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Error guardando configuración')).toBeInTheDocument();
      });
    });
  });

  describe('select current folder', () => {
    beforeEach(() => {
      vi.mocked(getLibraryConfig).mockResolvedValue(mockConfig);
      vi.mocked(browseDirectories).mockResolvedValue(mockDirectories);
    });

    it('should show "Usar esta carpeta" button', async () => {
      render(<LibraryPanel />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Cambiar ruta'));
      });

      await waitFor(() => {
        expect(screen.getByText(/Usar esta carpeta/)).toBeInTheDocument();
      });
    });

    it('should select current folder when clicking the button', async () => {
      vi.mocked(updateLibraryPath).mockResolvedValue({
        success: true,
        message: 'Path updated',
        fileCount: 15000,
      });

      render(<LibraryPanel />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Cambiar ruta'));
      });

      await waitFor(() => {
        expect(screen.getByText(/Usar esta carpeta/)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/Usar esta carpeta/));

      await waitFor(() => {
        expect(updateLibraryPath).toHaveBeenCalledWith('/music/library');
      });
    });
  });

  describe('empty directories', () => {
    it('should show message when no subdirectories', async () => {
      vi.mocked(getLibraryConfig).mockResolvedValue(mockConfig);
      vi.mocked(browseDirectories).mockResolvedValue({
        currentPath: '/music/empty',
        parentPath: '/music',
        directories: [],
      });

      render(<LibraryPanel />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Cambiar ruta'));
      });

      await waitFor(() => {
        expect(screen.getByText('No hay subdirectorios')).toBeInTheDocument();
      });
    });
  });

  describe('browsing errors', () => {
    it('should show error when browsing fails', async () => {
      vi.mocked(getLibraryConfig).mockResolvedValue(mockConfig);
      vi.mocked(browseDirectories).mockRejectedValue(new Error('Access denied'));

      render(<LibraryPanel />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Cambiar ruta'));
      });

      await waitFor(() => {
        expect(screen.getByText('Error navegando directorio')).toBeInTheDocument();
      });
    });
  });

  describe('disabled directories', () => {
    it('should disable selection for non-readable directories', async () => {
      vi.mocked(getLibraryConfig).mockResolvedValue(mockConfig);
      vi.mocked(browseDirectories).mockResolvedValue(mockDirectories);

      render(<LibraryPanel />);

      await waitFor(() => {
        fireEvent.click(screen.getByText('Cambiar ruta'));
      });

      await waitFor(() => {
        expect(screen.getByText('Protected')).toBeInTheDocument();
      });

      // The Protected directory button should be disabled
      const protectedButton = screen.getByText('Protected').closest('button');
      expect(protectedButton).toBeDisabled();
    });
  });
});
