import { useState, useEffect, useRef } from 'react';
import {
  searchUsers,
  getFriends,
  type SearchUserResult,
} from '@features/social/services/social.service';

interface UseUserSearchOptions {
  /** IDs to exclude from results (e.g. owner + existing collaborators) */
  excludeIds: Set<string>;
  /** Number of collaborators — used to reload suggestions when it changes */
  collaboratorsCount: number;
}

export function useUserSearch({ excludeIds, collaboratorsCount }: UseUserSearchOptions) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUserResult[]>([]);
  const [suggestions, setSuggestions] = useState<SearchUserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(true);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  // Ref to always access latest excludeIds without re-triggering search effect
  const excludeIdsRef = useRef(excludeIds);
  useEffect(() => {
    excludeIdsRef.current = excludeIds;
  }, [excludeIds]);

  // Load friends as suggestions
  useEffect(() => {
    getFriends()
      .then((friends) => {
        const available = friends
          .filter((f) => !excludeIds.has(f.id))
          .map((f) => ({
            id: f.id,
            username: f.username,
            name: f.name,
            avatarUrl: f.avatarUrl,
            friendshipStatus: 'accepted' as const,
          }));
        setSuggestions(available);
      })
      .catch(() => setSuggestions([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Reload when collaborator count changes
  }, [collaboratorsCount]);

  // Debounced user search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results: SearchUserResult[] = await searchUsers(searchQuery, 8);
        const filtered: SearchUserResult[] = results.filter(
          (u) => !excludeIdsRef.current.has(u.id)
        );
        setSearchResults(filtered);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout.current);
  }, [searchQuery]);

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    suggestions,
    isSearching,
    isFocused,
    setIsFocused,
    clearSearch,
  };
}
