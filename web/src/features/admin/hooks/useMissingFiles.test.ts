import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type ReactNode } from 'react';
import { useMissingFiles } from './useMissingFiles';

const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();
const mockDismiss = vi.fn();

vi.mock('@shared/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@shared/hooks')>();
  return {
    ...actual,
    useNotification: () => ({
      notification: null,
      showSuccess: mockShowSuccess,
      showError: mockShowError,
      dismiss: mockDismiss,
    }),
  };
});

vi.mock('@shared/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock('../api/missing-files.service', () => ({
  getMissingFiles: vi.fn(),
  purgeMissingFiles: vi.fn(),
  deleteMissingTrack: vi.fn(),
  updatePurgeMode: vi.fn(),
}));

import {
  getMissingFiles,
  purgeMissingFiles,
  deleteMissingTrack,
  updatePurgeMode,
} from '../api/missing-files.service';

const mockTracks = [
  {
    id: '1',
    title: 'Track 1',
    artistName: 'Artist',
    albumName: 'Album',
    path: '/a.mp3',
    missingAt: '2024-01-01',
  },
  {
    id: '2',
    title: 'Track 2',
    artistName: 'Artist',
    albumName: 'Album',
    path: '/b.mp3',
    missingAt: '2024-01-02',
  },
];

describe('useMissingFiles', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    const Wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);
    return Wrapper;
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.clearAllMocks();
  });

  it('should load missing files on mount', async () => {
    vi.mocked(getMissingFiles).mockResolvedValue({ tracks: mockTracks, purgeMode: 'never' });

    const { result } = renderHook(() => useMissingFiles(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.tracks).toHaveLength(2);
    expect(result.current.purgeMode).toBe('never');
    expect(result.current.newPurgeMode).toBe('never');
  });

  it('should parse after_days purge mode', async () => {
    vi.mocked(getMissingFiles).mockResolvedValue({ tracks: [], purgeMode: 'after_days:14' });

    const { result } = renderHook(() => useMissingFiles(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.newPurgeMode).toBe('after_days');
    expect(result.current.purgeDays).toBe(14);
  });

  it('should handle purge', async () => {
    vi.mocked(getMissingFiles).mockResolvedValue({ tracks: mockTracks, purgeMode: 'never' });
    vi.mocked(purgeMissingFiles).mockResolvedValue({ message: '2 tracks purged' });

    const { result } = renderHook(() => useMissingFiles(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.handlePurge();
    });

    expect(purgeMissingFiles).toHaveBeenCalledOnce();
    expect(mockShowSuccess).toHaveBeenCalledWith('2 tracks purged');
  });

  it('should delete single track and remove from list', async () => {
    vi.mocked(getMissingFiles).mockResolvedValue({ tracks: mockTracks, purgeMode: 'never' });
    vi.mocked(deleteMissingTrack).mockResolvedValue({ success: true, message: 'Deleted' });

    const { result } = renderHook(() => useMissingFiles(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.tracks).toHaveLength(2));

    // After delete, the server would return the updated list
    vi.mocked(getMissingFiles).mockResolvedValue({
      tracks: [mockTracks[1]],
      purgeMode: 'never',
    });

    await act(async () => {
      await result.current.handleDeleteTrack('1');
    });

    await waitFor(() => expect(result.current.tracks).toHaveLength(1));
    expect(result.current.tracks[0].id).toBe('2');
    expect(mockShowSuccess).toHaveBeenCalledWith('Deleted');
  });

  it('should save settings with after_days mode', async () => {
    vi.mocked(getMissingFiles).mockResolvedValue({ tracks: [], purgeMode: 'never' });
    vi.mocked(updatePurgeMode).mockResolvedValue(undefined);

    const { result } = renderHook(() => useMissingFiles(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setNewPurgeMode('after_days');
      result.current.setPurgeDays(7);
    });

    const ok = await act(async () => {
      return await result.current.handleSaveSettings();
    });

    expect(ok).toBe(true);
    expect(updatePurgeMode).toHaveBeenCalledWith('after_days:7');
    expect(mockShowSuccess).toHaveBeenCalledWith('Configuración guardada');
  });

  it('should show error when load fails', async () => {
    vi.mocked(getMissingFiles).mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useMissingFiles(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockShowError).toHaveBeenCalledWith('Error');
  });
});
