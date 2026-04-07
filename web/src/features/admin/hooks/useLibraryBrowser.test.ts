import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useLibraryBrowser } from './useLibraryBrowser';

vi.mock('../api/library.service', () => ({
  getLibraryConfig: vi.fn(),
  updateLibraryPath: vi.fn(),
  browseDirectories: vi.fn(),
}));

import { getLibraryConfig, updateLibraryPath, browseDirectories } from '../api/library.service';

const mockConfig = {
  path: '/music',
  exists: true,
  readable: true,
  fileCount: 500,
  mountedPaths: ['/mnt/music'],
};

const mockBrowseResult = {
  currentPath: '/music/rock',
  directories: [
    { name: 'classic', path: '/music/rock/classic', readable: true, hasMusic: true },
    { name: 'modern', path: '/music/rock/modern', readable: true, hasMusic: false },
  ],
  parentPath: '/music',
};

describe('useLibraryBrowser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load config on mount', async () => {
    vi.mocked(getLibraryConfig).mockResolvedValue(mockConfig);

    const { result } = renderHook(() => useLibraryBrowser());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.config).toEqual(mockConfig);
    expect(result.current.browser.currentPath).toBe('/music');
  });

  it('should set currentPath from first mounted path if no config path', async () => {
    vi.mocked(getLibraryConfig).mockResolvedValue({ ...mockConfig, path: '' });

    const { result } = renderHook(() => useLibraryBrowser());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.browser.currentPath).toBe('/mnt/music');
  });

  it('should browse directories', async () => {
    vi.mocked(getLibraryConfig).mockResolvedValue(mockConfig);
    vi.mocked(browseDirectories).mockResolvedValue(mockBrowseResult);

    const { result } = renderHook(() => useLibraryBrowser());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleBrowse('/music/rock');
    });

    expect(result.current.browser.currentPath).toBe('/music/rock');
    expect(result.current.browser.directories).toHaveLength(2);
    expect(result.current.browser.parentPath).toBe('/music');
  });

  it('should handle select path success', async () => {
    vi.mocked(getLibraryConfig).mockResolvedValue(mockConfig);
    vi.mocked(updateLibraryPath).mockResolvedValue({
      success: true,
      fileCount: 300,
      message: 'ok',
    });

    const { result } = renderHook(() => useLibraryBrowser());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleSelectPath('/new/path');
    });

    expect(result.current.success).toContain('300');
    expect(result.current.showBrowser).toBe(false);
  });

  it('should handle select path failure', async () => {
    vi.mocked(getLibraryConfig).mockResolvedValue(mockConfig);
    vi.mocked(updateLibraryPath).mockResolvedValue({
      success: false,
      fileCount: 0,
      message: 'No access',
    });

    const { result } = renderHook(() => useLibraryBrowser());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleSelectPath('/bad/path');
    });

    expect(result.current.error).toBe('No access');
  });

  it('should set error when config load fails', async () => {
    vi.mocked(getLibraryConfig).mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useLibraryBrowser());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Error cargando configuración');
  });

  it('should open browser and trigger browse', async () => {
    vi.mocked(getLibraryConfig).mockResolvedValue(mockConfig);
    vi.mocked(browseDirectories).mockResolvedValue(mockBrowseResult);

    const { result } = renderHook(() => useLibraryBrowser());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.openBrowser();
    });

    expect(result.current.showBrowser).toBe(true);
    expect(browseDirectories).toHaveBeenCalledWith('/music');
  });
});
