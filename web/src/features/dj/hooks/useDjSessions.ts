import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { djSessionsService, CreateDjSessionDto, UpdateDjSessionDto } from '../services/djSessions.service';

const SESSIONS_QUERY_KEY = ['dj-sessions'];

export function useDjSessions() {
  return useQuery({
    queryKey: SESSIONS_QUERY_KEY,
    queryFn: () => djSessionsService.getSessions(),
  });
}

export function useDjSession(id: string) {
  return useQuery({
    queryKey: [...SESSIONS_QUERY_KEY, id],
    queryFn: () => djSessionsService.getSession(id),
    enabled: !!id,
  });
}

export function useCreateDjSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateDjSessionDto) => djSessionsService.createSession(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
    },
  });
}

export function useUpdateDjSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateDjSessionDto }) =>
      djSessionsService.updateSession(id, dto),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...SESSIONS_QUERY_KEY, id] });
    },
  });
}

export function useDeleteDjSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => djSessionsService.deleteSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
    },
  });
}

export function useAddTrackToDjSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, trackId }: { sessionId: string; trackId: string }) =>
      djSessionsService.addTrackToSession(sessionId, trackId),
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...SESSIONS_QUERY_KEY, sessionId] });
    },
  });
}

export function useRemoveTrackFromDjSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, trackId }: { sessionId: string; trackId: string }) =>
      djSessionsService.removeTrackFromSession(sessionId, trackId),
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...SESSIONS_QUERY_KEY, sessionId] });
    },
  });
}
