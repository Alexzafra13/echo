import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';

// Mock the API module
vi.mock('@features/admin/api/radio-favicons.api', () => ({
  radioFaviconsApi: {
    uploadFavicon: vi.fn(),
    deleteFavicon: vi.fn(),
    autoFetch: vi.fn(),
  },
}));

import {
  useUploadRadioFavicon,
  useDeleteRadioFavicon,
  useAutoFetchRadioFavicon,
} from './useRadioFavicon';
import { radioFaviconsApi } from '@features/admin/api/radio-favicons.api';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useUploadRadioFavicon', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería estar en estado idle inicialmente', () => {
    const { result } = renderHook(() => useUploadRadioFavicon(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isPending).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('debería llamar a uploadFavicon con los parámetros correctos', async () => {
    const mockResponse = {
      success: true,
      message: 'Uploaded',
      imageId: 'img-1',
      url: '/api/images/radio/uuid/favicon',
    };
    vi.mocked(radioFaviconsApi.uploadFavicon).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useUploadRadioFavicon(), {
      wrapper: createWrapper(),
    });

    const mockFile = new File(['test'], 'test.png', { type: 'image/png' });
    result.current.mutate({ stationUuid: 'test-uuid', file: mockFile });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(radioFaviconsApi.uploadFavicon).toHaveBeenCalledWith('test-uuid', mockFile);
  });

  it('debería manejar errores de upload', async () => {
    vi.mocked(radioFaviconsApi.uploadFavicon).mockRejectedValue(
      new Error('Upload failed'),
    );

    const { result } = renderHook(() => useUploadRadioFavicon(), {
      wrapper: createWrapper(),
    });

    const mockFile = new File(['test'], 'test.png', { type: 'image/png' });
    result.current.mutate({ stationUuid: 'test-uuid', file: mockFile });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useDeleteRadioFavicon', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería estar en estado idle inicialmente', () => {
    const { result } = renderHook(() => useDeleteRadioFavicon(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isPending).toBe(false);
  });

  it('debería llamar a deleteFavicon con el stationUuid', async () => {
    vi.mocked(radioFaviconsApi.deleteFavicon).mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteRadioFavicon(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('test-uuid');

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(radioFaviconsApi.deleteFavicon).toHaveBeenCalledWith('test-uuid');
  });

  it('debería manejar errores de delete', async () => {
    vi.mocked(radioFaviconsApi.deleteFavicon).mockRejectedValue(
      new Error('Not found'),
    );

    const { result } = renderHook(() => useDeleteRadioFavicon(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('nonexistent-uuid');

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useAutoFetchRadioFavicon', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería estar en estado idle inicialmente', () => {
    const { result } = renderHook(() => useAutoFetchRadioFavicon(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isPending).toBe(false);
  });

  it('debería llamar a autoFetch con nombre y homepage', async () => {
    const mockResponse = { success: true, source: 'wikipedia', url: '/api/images/radio/uuid/favicon' };
    vi.mocked(radioFaviconsApi.autoFetch).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAutoFetchRadioFavicon(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      stationUuid: 'test-uuid',
      name: 'Radio Station',
      homepage: 'https://radio.com',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(radioFaviconsApi.autoFetch).toHaveBeenCalledWith(
      'test-uuid',
      'Radio Station',
      'https://radio.com',
    );
  });

  it('debería llamar a autoFetch sin homepage', async () => {
    const mockResponse = { success: true, source: 'wikipedia' };
    vi.mocked(radioFaviconsApi.autoFetch).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAutoFetchRadioFavicon(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      stationUuid: 'test-uuid',
      name: 'Radio Station',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(radioFaviconsApi.autoFetch).toHaveBeenCalledWith(
      'test-uuid',
      'Radio Station',
      undefined,
    );
  });

  it('debería manejar errores de auto-fetch', async () => {
    vi.mocked(radioFaviconsApi.autoFetch).mockRejectedValue(
      new Error('Fetch failed'),
    );

    const { result } = renderHook(() => useAutoFetchRadioFavicon(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      stationUuid: 'test-uuid',
      name: 'Station',
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
