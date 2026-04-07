import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSetupWizard } from './useSetupWizard';

const mockSetLocation = vi.fn();

vi.mock('wouter', () => ({
  useLocation: () => ['/', mockSetLocation],
}));

vi.mock('@shared/utils/error.utils', () => ({
  getApiErrorMessage: (_err: unknown, defaultMsg: string) => defaultMsg,
}));

vi.mock('../api/setup.service', () => ({
  getSetupStatus: vi.fn(),
  createAdmin: vi.fn(),
  configureLibrary: vi.fn(),
  browseDirectories: vi.fn(),
  completeSetup: vi.fn(),
}));

import {
  getSetupStatus,
  createAdmin,
  configureLibrary,
  browseDirectories,
  completeSetup,
} from '../api/setup.service';

describe('useSetupWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start in loading state and redirect if no setup needed', async () => {
    vi.mocked(getSetupStatus).mockResolvedValue({
      needsSetup: false,
      hasAdmin: true,
      hasMusicLibrary: true,
      mountedLibrary: { isMounted: true, path: '/music', fileCount: 100 },
      musicLibraryPath: '/music',
    });

    renderHook(() => useSetupWizard());

    await waitFor(() => {
      expect(mockSetLocation).toHaveBeenCalledWith('/login');
    });
  });

  it('should go to admin step if no admin exists', async () => {
    vi.mocked(getSetupStatus).mockResolvedValue({
      needsSetup: true,
      hasAdmin: false,
      hasMusicLibrary: false,
      mountedLibrary: { isMounted: false, path: '', fileCount: 0 },
      musicLibraryPath: '',
    });

    const { result } = renderHook(() => useSetupWizard());

    await waitFor(() => {
      expect(result.current.step).toBe('admin');
    });
  });

  it('should go to library step if admin exists but no library', async () => {
    vi.mocked(getSetupStatus).mockResolvedValue({
      needsSetup: true,
      hasAdmin: true,
      hasMusicLibrary: false,
      mountedLibrary: { isMounted: true, path: '/mnt', fileCount: 0 },
      musicLibraryPath: '',
    });
    vi.mocked(browseDirectories).mockResolvedValue({
      currentPath: '/',
      directories: [],
      parentPath: null,
      canGoUp: false,
    });

    const { result } = renderHook(() => useSetupWizard());

    await waitFor(() => {
      expect(result.current.step).toBe('library');
    });
  });

  it('should handle admin submit and move to library', async () => {
    vi.mocked(getSetupStatus).mockResolvedValue({
      needsSetup: true,
      hasAdmin: false,
      hasMusicLibrary: false,
      mountedLibrary: { isMounted: false, path: '', fileCount: 0 },
      musicLibraryPath: '',
    });
    vi.mocked(createAdmin).mockResolvedValue(undefined);
    vi.mocked(browseDirectories).mockResolvedValue({
      currentPath: '/',
      directories: [],
      parentPath: null,
      canGoUp: false,
    });

    const { result } = renderHook(() => useSetupWizard());
    await waitFor(() => expect(result.current.step).toBe('admin'));

    await act(async () => {
      await result.current.handleAdminSubmit({ username: 'admin', password: 'password123' });
    });

    expect(createAdmin).toHaveBeenCalledWith({ username: 'admin', password: 'password123' });
    expect(result.current.step).toBe('library');
  });

  it('should handle library selection with valid result', async () => {
    vi.mocked(getSetupStatus).mockResolvedValue({
      needsSetup: true,
      hasAdmin: true,
      hasMusicLibrary: false,
      mountedLibrary: { isMounted: true, path: '/mnt', fileCount: 0 },
      musicLibraryPath: '',
    });
    vi.mocked(browseDirectories).mockResolvedValue({
      currentPath: '/',
      directories: [],
      parentPath: null,
      canGoUp: false,
    });
    vi.mocked(configureLibrary).mockResolvedValue({
      valid: true,
      message: 'Found 500 files',
      fileCount: 500,
    });

    const { result } = renderHook(() => useSetupWizard());
    await waitFor(() => expect(result.current.step).toBe('library'));

    await act(async () => {
      await result.current.handleSelectLibrary('/music');
    });

    expect(result.current.libraryValidation?.valid).toBe(true);
    expect(result.current.selectedPath).toBe('/music');
  });

  it('should handle complete setup', async () => {
    vi.mocked(getSetupStatus).mockResolvedValue({
      needsSetup: true,
      hasAdmin: true,
      hasMusicLibrary: true,
      mountedLibrary: { isMounted: true, path: '/music', fileCount: 100 },
      musicLibraryPath: '/music',
    });
    vi.mocked(completeSetup).mockResolvedValue(undefined);

    const { result } = renderHook(() => useSetupWizard());
    await waitFor(() => expect(result.current.step).toBe('complete'));

    await act(async () => {
      await result.current.handleCompleteSetup();
    });

    expect(result.current.step).toBe('done');
  });

  it('should navigate to login on handleGoToLogin', async () => {
    vi.mocked(getSetupStatus).mockResolvedValue({
      needsSetup: true,
      hasAdmin: false,
      hasMusicLibrary: false,
      mountedLibrary: { isMounted: false, path: '', fileCount: 0 },
      musicLibraryPath: '',
    });

    const { result } = renderHook(() => useSetupWizard());
    await waitFor(() => expect(result.current.step).toBe('admin'));

    act(() => {
      result.current.handleGoToLogin();
    });

    expect(mockSetLocation).toHaveBeenCalledWith('/login');
  });

  it('should set error on connection failure', async () => {
    vi.mocked(getSetupStatus).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSetupWizard());

    await waitFor(() => {
      expect(result.current.error).toBe('Error al conectar con el servidor');
    });

    expect(result.current.step).toBe('admin');
  });

  it('should allow goToStep', async () => {
    vi.mocked(getSetupStatus).mockResolvedValue({
      needsSetup: true,
      hasAdmin: false,
      hasMusicLibrary: false,
      mountedLibrary: { isMounted: false, path: '', fileCount: 0 },
      musicLibraryPath: '',
    });

    const { result } = renderHook(() => useSetupWizard());
    await waitFor(() => expect(result.current.step).toBe('admin'));

    act(() => {
      result.current.goToStep('complete');
    });

    expect(result.current.step).toBe('complete');
  });
});
