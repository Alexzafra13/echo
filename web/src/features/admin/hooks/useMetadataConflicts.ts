import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@shared/services/api';

/**
 * Conflict entity types
 */
export type EntityType = 'track' | 'album' | 'artist';

/**
 * Conflict sources
 */
export type ConflictSource = 'musicbrainz' | 'lastfm' | 'fanart' | 'coverartarchive';

/**
 * Conflict status
 */
export type ConflictStatus = 'pending' | 'accepted' | 'rejected' | 'ignored';

/**
 * Suggestion option for a conflict (Picard-style)
 * Using Record for flexibility as API returns various fields
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ConflictSuggestion = Record<string, any>;

/**
 * Additional metadata attached to a conflict
 * Flexible type as API can return various fields
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ConflictMetadata = Record<string, any>;

/**
 * Entity info attached to a conflict
 */
export interface ConflictEntity {
  name: string;
  albumCount?: number;
  songCount?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

/**
 * Metadata conflict interface
 */
export interface MetadataConflict {
  id: string;
  entityId: string;
  entityType: EntityType;
  field: string;
  currentValue?: string;
  suggestedValue: string;
  source: ConflictSource;
  status: ConflictStatus;
  priority: number;
  metadata?: ConflictMetadata;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  entity?: ConflictEntity;
}

/**
 * Conflicts list response
 */
export interface ConflictsListResponse {
  conflicts: MetadataConflict[];
  total: number;
  skip: number;
  take: number;
}

/**
 * Query parameters for fetching conflicts
 */
export interface GetConflictsParams {
  skip?: number;
  take?: number;
  entityType?: EntityType;
  source?: ConflictSource;
  priority?: number;
}

/**
 * Hook to fetch pending metadata conflicts
 */
export function useMetadataConflicts(params: GetConflictsParams = {}) {
  return useQuery({
    queryKey: ['metadata-conflicts', params],
    queryFn: async (): Promise<ConflictsListResponse> => {
      const response = await apiClient.get('/admin/metadata-conflicts', { params });
      return response.data;
    },
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to fetch conflicts for a specific entity
 */
export function useEntityConflicts(entityType: EntityType, entityId: string) {
  return useQuery({
    queryKey: ['metadata-conflicts', 'entity', entityType, entityId],
    queryFn: async (): Promise<MetadataConflict[]> => {
      const response = await apiClient.get(
        `/admin/metadata-conflicts/entity/${entityType}/${entityId}`
      );
      return response.data;
    },
    enabled: !!entityType && !!entityId,
    staleTime: 30000,
  });
}

/**
 * Hook to accept a conflict suggestion
 */
export function useAcceptConflict() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conflictId: string) => {
      const response = await apiClient.post(
        `/admin/metadata-conflicts/${conflictId}/accept`,
        {}
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate conflicts list to refresh
      queryClient.invalidateQueries({ queryKey: ['metadata-conflicts'] });
    },
  });
}

/**
 * Hook to reject a conflict suggestion
 */
export function useRejectConflict() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conflictId: string) => {
      const response = await apiClient.post(
        `/admin/metadata-conflicts/${conflictId}/reject`,
        {}
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metadata-conflicts'] });
    },
  });
}

/**
 * Hook to ignore a conflict
 */
export function useIgnoreConflict() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conflictId: string) => {
      const response = await apiClient.post(
        `/admin/metadata-conflicts/${conflictId}/ignore`,
        {}
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metadata-conflicts'] });
    },
  });
}

/**
 * Hook to apply a specific suggestion from multiple options (Picard-style)
 */
export function useApplySuggestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conflictId, suggestionIndex }: { conflictId: string; suggestionIndex: number }) => {
      const response = await apiClient.post(
        `/admin/metadata-conflicts/${conflictId}/apply-suggestion`,
        { suggestionIndex }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metadata-conflicts'] });
    },
  });
}
