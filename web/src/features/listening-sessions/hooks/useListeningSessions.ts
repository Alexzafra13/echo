import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listeningSessionsService } from '../services/listening-sessions.service';
import { useSessionStore } from '../store/sessionStore';
import { useAuthStore } from '@shared/store';
import type { CreateSessionDto, JoinSessionDto, AddToQueueDto, UpdateParticipantRoleDto } from '../types';

const SESSION_KEY = 'listening-session';

// Restaurar sesion activa al cargar la app
export function useRestoreActiveSession() {
  const activeSession = useSessionStore((s) => s.activeSession);

  return useQuery({
    queryKey: [SESSION_KEY, 'my-active'],
    queryFn: async () => {
      const session = await listeningSessionsService.getMyActiveSession();
      if (session) {
        const userId = useAuthStore.getState().user?.id;
        const me = session.participants?.find((p) => p.userId === userId);
        useSessionStore.getState().setActiveSession(session, me?.role ?? 'listener');
      }
      return session;
    },
    // Solo consultar si no hay sesion activa en el store
    enabled: !activeSession,
    staleTime: 30000,
    retry: false,
  });
}

// Obtener detalles de una sesion
export function useSessionDetails(sessionId: string | null) {
  return useQuery({
    queryKey: [SESSION_KEY, sessionId],
    queryFn: () => listeningSessionsService.getSession(sessionId!),
    enabled: !!sessionId,
    refetchInterval: false,
  });
}

// Crear sesion
export function useCreateSession() {
  const queryClient = useQueryClient();
  const { setActiveSession } = useSessionStore.getState();

  return useMutation({
    mutationFn: (dto: CreateSessionDto) => listeningSessionsService.createSession(dto),
    onSuccess: async (result) => {
      const session = await listeningSessionsService.getSession(result.id);
      setActiveSession(session, 'host');
      queryClient.setQueryData([SESSION_KEY, result.id], session);
    },
  });
}

// Unirse a sesion
export function useJoinSession() {
  const queryClient = useQueryClient();
  const { setActiveSession } = useSessionStore.getState();

  return useMutation({
    mutationFn: (dto: JoinSessionDto) => listeningSessionsService.joinSession(dto),
    onSuccess: async (result) => {
      const session = await listeningSessionsService.getSession(result.sessionId);
      const userId = useAuthStore.getState().user?.id;
      const me = session.participants.find((p) => p.userId === userId);
      setActiveSession(session, (me?.role ?? 'listener'));
      queryClient.setQueryData([SESSION_KEY, result.sessionId], session);
    },
  });
}

// Anadir track a la cola
export function useAddToSessionQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ sessionId, dto }: { sessionId: string; dto: AddToQueueDto }) =>
      listeningSessionsService.addToQueue(sessionId, dto),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [SESSION_KEY, variables.sessionId] });
    },
  });
}

// Skip track
export function useSkipTrack() {
  return useMutation({
    mutationFn: (sessionId: string) => listeningSessionsService.skipTrack(sessionId),
  });
}

// Cambiar rol de participante
export function useUpdateParticipantRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      userId,
      dto,
    }: {
      sessionId: string;
      userId: string;
      dto: UpdateParticipantRoleDto;
    }) => listeningSessionsService.updateParticipantRole(sessionId, userId, dto),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [SESSION_KEY, variables.sessionId] });
    },
  });
}

// Salir de la sesion
export function useLeaveSession() {
  const { clearActiveSession } = useSessionStore.getState();

  return useMutation({
    mutationFn: (sessionId: string) => listeningSessionsService.leaveSession(sessionId),
    onSuccess: () => clearActiveSession(),
  });
}

// Terminar sesion (solo host)
export function useEndSession() {
  const { clearActiveSession } = useSessionStore.getState();

  return useMutation({
    mutationFn: (sessionId: string) => listeningSessionsService.endSession(sessionId),
    onSuccess: () => clearActiveSession(),
  });
}
