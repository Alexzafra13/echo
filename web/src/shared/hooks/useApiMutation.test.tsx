import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { useApiMutation } from './useApiMutation';

vi.mock('@shared/utils/error.utils', () => ({
  getApiErrorMessage: (_err: unknown, defaultMsg: string) => defaultMsg,
}));

vi.mock('@shared/utils/logger', () => ({
  logger: { error: vi.fn() },
}));

describe('useApiMutation', () => {
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

  it('should execute mutation and return data on success', async () => {
    const mutationFn = vi.fn().mockResolvedValue({ id: 1 });

    const { result } = renderHook(() => useApiMutation({ mutationFn }), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate(undefined);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ id: 1 });
    expect(result.current.error).toBeNull();
  });

  it('should set error string on failure', async () => {
    const mutationFn = vi.fn().mockRejectedValue(new Error('API error'));

    const { result } = renderHook(
      () => useApiMutation({ mutationFn, defaultErrorMessage: 'Algo falló' }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.mutate(undefined);
    });

    await waitFor(() => expect(result.current.error).toBe('Algo falló'));
  });

  it('should clear error with clearError', async () => {
    const mutationFn = vi.fn().mockRejectedValue(new Error('fail'));

    const { result } = renderHook(
      () => useApiMutation({ mutationFn, defaultErrorMessage: 'Error' }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.mutate(undefined);
    });
    await waitFor(() => expect(result.current.error).toBe('Error'));

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });

  it('should call onSuccess callback after mutation', async () => {
    const mutationFn = vi.fn().mockResolvedValue('ok');
    const onSuccess = vi.fn();

    const { result } = renderHook(() => useApiMutation({ mutationFn, onSuccess }), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.mutate(undefined);
    });

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith('ok', undefined));
  });

  it('should call onError callback with message', async () => {
    const mutationFn = vi.fn().mockRejectedValue(new Error('fail'));
    const onError = vi.fn();

    const { result } = renderHook(
      () => useApiMutation({ mutationFn, defaultErrorMessage: 'Oops', onError }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.mutate(undefined);
    });

    await waitFor(() => expect(onError).toHaveBeenCalledWith('Oops', expect.any(Error), undefined));
  });

  it('should invalidate query keys on success', async () => {
    const mutationFn = vi.fn().mockResolvedValue('ok');
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(
      () =>
        useApiMutation({
          mutationFn,
          invalidateKeys: [['albums'], ['tracks']],
        }),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.mutate(undefined);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['albums'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['tracks'] });
  });
});
