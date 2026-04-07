import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { useServerIdentity } from './useServerIdentity';

vi.mock('../api/server-identity.service', () => ({
  serverIdentityApi: {
    getServerIdentity: vi.fn(),
    updateServerName: vi.fn(),
    updateServerColor: vi.fn(),
  },
}));

import { serverIdentityApi } from '../api/server-identity.service';

describe('useServerIdentity', () => {
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

  it('should return defaults while loading', () => {
    vi.mocked(serverIdentityApi.getServerIdentity).mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useServerIdentity(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.serverName).toBe('');
    expect(result.current.serverColor).toBe('purple');
  });

  it('should return server name and color after loading', async () => {
    vi.mocked(serverIdentityApi.getServerIdentity).mockResolvedValue({
      name: 'My Server',
      color: 'blue',
    });
    const { result } = renderHook(() => useServerIdentity(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.serverName).toBe('My Server');
    expect(result.current.serverColor).toBe('blue');
  });

  it('should update name via mutation and update cache', async () => {
    vi.mocked(serverIdentityApi.getServerIdentity).mockResolvedValue({
      name: 'Old Name',
      color: 'purple',
    });
    vi.mocked(serverIdentityApi.updateServerName).mockResolvedValue(undefined);

    const { result } = renderHook(() => useServerIdentity(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.serverName).toBe('Old Name'));

    act(() => {
      result.current.updateName.mutate('New Name');
    });

    await waitFor(() => {
      expect(result.current.serverName).toBe('New Name');
    });

    expect(serverIdentityApi.updateServerName).toHaveBeenCalledWith('New Name');
  });

  it('should update color via mutation and update cache', async () => {
    vi.mocked(serverIdentityApi.getServerIdentity).mockResolvedValue({
      name: 'Server',
      color: 'purple',
    });
    vi.mocked(serverIdentityApi.updateServerColor).mockResolvedValue(undefined);

    const { result } = renderHook(() => useServerIdentity(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.serverColor).toBe('purple'));

    act(() => {
      result.current.updateColor.mutate('red');
    });

    await waitFor(() => {
      expect(result.current.serverColor).toBe('red');
    });

    expect(serverIdentityApi.updateServerColor).toHaveBeenCalledWith('red');
  });
});
