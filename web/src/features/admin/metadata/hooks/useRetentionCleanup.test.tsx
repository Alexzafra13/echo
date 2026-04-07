import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { useRetentionCleanup } from './useRetentionCleanup';

vi.mock('../../api/enrichment.service', () => ({
  enrichmentApi: {
    getRetention: vi.fn(),
    saveRetention: vi.fn(),
    cleanupOldLogs: vi.fn(),
    deleteAllLogs: vi.fn(),
  },
}));

import { enrichmentApi } from '../../api/enrichment.service';

describe('useRetentionCleanup', () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return Wrapper;
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.clearAllMocks();
  });

  it('should load retention days on mount', async () => {
    vi.mocked(enrichmentApi.getRetention).mockResolvedValue({ retentionDays: 60 });

    const { result } = renderHook(() => useRetentionCleanup(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.retentionDays).toBe(60);
    });
  });

  it('should default to 30 days if load fails', async () => {
    vi.mocked(enrichmentApi.getRetention).mockRejectedValue(new Error('fail'));

    const { result } = renderHook(() => useRetentionCleanup(), { wrapper: createWrapper() });

    // Wait for the effect to complete
    await waitFor(() => {
      expect(enrichmentApi.getRetention).toHaveBeenCalled();
    });

    expect(result.current.retentionDays).toBe(30);
  });

  it('should save retention change', async () => {
    vi.mocked(enrichmentApi.getRetention).mockResolvedValue({ retentionDays: 30 });
    vi.mocked(enrichmentApi.saveRetention).mockResolvedValue(undefined);

    const { result } = renderHook(() => useRetentionCleanup(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.retentionDays).toBe(30));

    await act(async () => {
      await result.current.handleRetentionChange(14);
    });

    expect(enrichmentApi.saveRetention).toHaveBeenCalledWith(14);
    expect(result.current.retentionDays).toBe(14);
    expect(result.current.isSavingRetention).toBe(false);
  });

  it('should handle cleanup with deleted logs', async () => {
    vi.mocked(enrichmentApi.getRetention).mockResolvedValue({ retentionDays: 30 });
    vi.mocked(enrichmentApi.cleanupOldLogs).mockResolvedValue({
      deletedCount: 5,
      retentionDays: 30,
    });

    const { result } = renderHook(() => useRetentionCleanup(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.retentionDays).toBe(30));

    await act(async () => {
      await result.current.handleCleanup();
    });

    expect(result.current.isCleaningUp).toBe(false);
    expect(result.current.cleanupResult).toBeTruthy();
  });

  it('should handle delete all', async () => {
    vi.mocked(enrichmentApi.getRetention).mockResolvedValue({ retentionDays: 30 });
    vi.mocked(enrichmentApi.deleteAllLogs).mockResolvedValue({ deletedCount: 100 });

    const { result } = renderHook(() => useRetentionCleanup(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.retentionDays).toBe(30));

    // First set showDeleteConfirm to true
    act(() => {
      result.current.setShowDeleteConfirm(true);
    });
    expect(result.current.showDeleteConfirm).toBe(true);

    await act(async () => {
      await result.current.handleDeleteAll();
    });

    expect(result.current.isDeleting).toBe(false);
    expect(result.current.showDeleteConfirm).toBe(false);
    expect(result.current.cleanupResult).toBeTruthy();
  });
});
