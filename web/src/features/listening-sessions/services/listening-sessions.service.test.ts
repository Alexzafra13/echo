import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listeningSessionsService } from './listening-sessions.service';

vi.mock('@shared/services/api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

import { apiClient } from '@shared/services/api';

describe('listeningSessionsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getMyActiveSession should GET /listening-sessions/my-active', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: null });
    const result = await listeningSessionsService.getMyActiveSession();
    expect(apiClient.get).toHaveBeenCalledWith('/listening-sessions/my-active');
    expect(result).toBeNull();
  });

  it('createSession should POST to /listening-sessions', async () => {
    const mockResponse = {
      id: 's1',
      hostId: 'u1',
      name: 'Party',
      inviteCode: 'ABC',
      isActive: true,
      createdAt: '',
      message: 'ok',
    };
    vi.mocked(apiClient.post).mockResolvedValue({ data: mockResponse });

    const result = await listeningSessionsService.createSession({ name: 'Party' });
    expect(apiClient.post).toHaveBeenCalledWith('/listening-sessions', { name: 'Party' });
    expect(result).toEqual(mockResponse);
  });

  it('joinSession should POST to /listening-sessions/join', async () => {
    const mockResponse = {
      sessionId: 's1',
      sessionName: 'Party',
      hostId: 'u1',
      role: 'listener',
      message: 'ok',
    };
    vi.mocked(apiClient.post).mockResolvedValue({ data: mockResponse });

    const result = await listeningSessionsService.joinSession({ inviteCode: 'ABC' });
    expect(apiClient.post).toHaveBeenCalledWith('/listening-sessions/join', { inviteCode: 'ABC' });
    expect(result).toEqual(mockResponse);
  });

  it('getSession should GET by id', async () => {
    const mockSession = { id: 's1', name: 'Party' };
    vi.mocked(apiClient.get).mockResolvedValue({ data: mockSession });

    const result = await listeningSessionsService.getSession('s1');
    expect(apiClient.get).toHaveBeenCalledWith('/listening-sessions/s1');
    expect(result).toEqual(mockSession);
  });

  it('getSessionByCode should GET by code', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { id: 's1' } });

    await listeningSessionsService.getSessionByCode('ABC');
    expect(apiClient.get).toHaveBeenCalledWith('/listening-sessions/by-code/ABC');
  });

  it('addToQueue should POST track to queue', async () => {
    const mockResponse = {
      sessionId: 's1',
      trackId: 't1',
      position: 0,
      addedBy: 'u1',
      message: 'ok',
    };
    vi.mocked(apiClient.post).mockResolvedValue({ data: mockResponse });

    const result = await listeningSessionsService.addToQueue('s1', { trackId: 't1' });
    expect(apiClient.post).toHaveBeenCalledWith('/listening-sessions/s1/queue', { trackId: 't1' });
    expect(result).toEqual(mockResponse);
  });

  it('skipTrack should POST to skip endpoint', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { message: 'skipped' } });

    await listeningSessionsService.skipTrack('s1');
    expect(apiClient.post).toHaveBeenCalledWith('/listening-sessions/s1/skip');
  });

  it('updateParticipantRole should PATCH role', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({});

    await listeningSessionsService.updateParticipantRole('s1', 'u2', { role: 'dj' });
    expect(apiClient.patch).toHaveBeenCalledWith('/listening-sessions/s1/participants/u2/role', {
      role: 'dj',
    });
  });

  it('removeFromQueue should POST to remove', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({});

    await listeningSessionsService.removeFromQueue('s1', 'q1');
    expect(apiClient.post).toHaveBeenCalledWith('/listening-sessions/s1/queue/q1/remove');
  });

  it('updateSettings should PATCH settings', async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({});

    await listeningSessionsService.updateSettings('s1', { guestsCanControl: true });
    expect(apiClient.patch).toHaveBeenCalledWith('/listening-sessions/s1/settings', {
      guestsCanControl: true,
    });
  });

  it('inviteFriend should POST invite', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { message: 'invited' } });

    const result = await listeningSessionsService.inviteFriend('s1', 'f1');
    expect(apiClient.post).toHaveBeenCalledWith('/listening-sessions/s1/invite/f1');
    expect(result).toEqual({ message: 'invited' });
  });

  it('leaveSession should POST leave', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({});

    await listeningSessionsService.leaveSession('s1');
    expect(apiClient.post).toHaveBeenCalledWith('/listening-sessions/s1/leave');
  });

  it('endSession should POST end', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({});

    await listeningSessionsService.endSession('s1');
    expect(apiClient.post).toHaveBeenCalledWith('/listening-sessions/s1/end');
  });
});
