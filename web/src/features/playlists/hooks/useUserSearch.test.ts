import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useUserSearch } from './useUserSearch';

vi.mock('@features/social/services/social.service', () => ({
  searchUsers: vi.fn(),
  getFriends: vi.fn(),
}));

import { searchUsers, getFriends } from '@features/social/services/social.service';

const mockFriends = [
  {
    id: 'f1',
    username: 'alice',
    name: 'Alice',
    avatarUrl: '/a.png',
    friendshipStatus: 'accepted' as const,
  },
  {
    id: 'f2',
    username: 'bob',
    name: 'Bob',
    avatarUrl: '/b.png',
    friendshipStatus: 'accepted' as const,
  },
  {
    id: 'f3',
    username: 'charlie',
    name: 'Charlie',
    avatarUrl: null,
    friendshipStatus: 'accepted' as const,
  },
];

const mockSearchResults = [
  { id: 's1', username: 'dave', name: 'Dave', avatarUrl: null, friendshipStatus: undefined },
  { id: 's2', username: 'eve', name: 'Eve', avatarUrl: null, friendshipStatus: undefined },
];

describe('useUserSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial state', () => {
    vi.mocked(getFriends).mockResolvedValue([]);

    const { result } = renderHook(() =>
      useUserSearch({ excludeIds: new Set(), collaboratorsCount: 0 })
    );

    expect(result.current.searchQuery).toBe('');
    expect(result.current.searchResults).toEqual([]);
    expect(result.current.isSearching).toBe(false);
    expect(result.current.isFocused).toBe(true);
  });

  it('should load friend suggestions on mount', async () => {
    vi.mocked(getFriends).mockResolvedValue(mockFriends);

    const { result } = renderHook(() =>
      useUserSearch({ excludeIds: new Set(), collaboratorsCount: 0 })
    );

    await waitFor(() => {
      expect(result.current.suggestions).toHaveLength(3);
    });

    expect(result.current.suggestions[0].username).toBe('alice');
  });

  it('should filter suggestions by excludeIds', async () => {
    vi.mocked(getFriends).mockResolvedValue(mockFriends);

    const { result } = renderHook(() =>
      useUserSearch({ excludeIds: new Set(['f1', 'f3']), collaboratorsCount: 0 })
    );

    await waitFor(() => {
      expect(result.current.suggestions).toHaveLength(1);
    });

    expect(result.current.suggestions[0].username).toBe('bob');
  });

  it('should debounce search and return results', async () => {
    vi.mocked(getFriends).mockResolvedValue([]);
    vi.mocked(searchUsers).mockResolvedValue(mockSearchResults);

    const { result } = renderHook(() =>
      useUserSearch({ excludeIds: new Set(), collaboratorsCount: 0 })
    );

    act(() => {
      result.current.setSearchQuery('dave');
    });

    // Should not have called immediately
    expect(searchUsers).not.toHaveBeenCalled();

    // Advance past debounce
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    await waitFor(() => {
      expect(result.current.searchResults).toHaveLength(2);
    });

    expect(searchUsers).toHaveBeenCalledWith('dave', 8);
  });

  it('should clear results when query is empty', async () => {
    vi.mocked(getFriends).mockResolvedValue([]);
    vi.mocked(searchUsers).mockResolvedValue(mockSearchResults);

    const { result } = renderHook(() =>
      useUserSearch({ excludeIds: new Set(), collaboratorsCount: 0 })
    );

    // Set query and get results
    act(() => {
      result.current.setSearchQuery('dave');
    });
    await act(async () => {
      vi.advanceTimersByTime(350);
    });
    await waitFor(() => expect(result.current.searchResults).toHaveLength(2));

    // Clear
    act(() => {
      result.current.clearSearch();
    });

    expect(result.current.searchQuery).toBe('');
    expect(result.current.searchResults).toEqual([]);
  });

  it('should filter search results by excludeIds', async () => {
    vi.mocked(getFriends).mockResolvedValue([]);
    vi.mocked(searchUsers).mockResolvedValue(mockSearchResults);

    const { result } = renderHook(() =>
      useUserSearch({ excludeIds: new Set(['s1']), collaboratorsCount: 0 })
    );

    act(() => {
      result.current.setSearchQuery('test');
    });

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    await waitFor(() => {
      expect(result.current.searchResults).toHaveLength(1);
    });

    expect(result.current.searchResults[0].username).toBe('eve');
  });

  it('should handle search error gracefully', async () => {
    vi.mocked(getFriends).mockResolvedValue([]);
    vi.mocked(searchUsers).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useUserSearch({ excludeIds: new Set(), collaboratorsCount: 0 })
    );

    act(() => {
      result.current.setSearchQuery('test');
    });

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    await waitFor(() => {
      expect(result.current.isSearching).toBe(false);
    });

    expect(result.current.searchResults).toEqual([]);
  });
});
