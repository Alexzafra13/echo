import { ListeningSession } from './listening-session.entity';

describe('ListeningSession', () => {
  const createMockSession = (overrides = {}) =>
    ListeningSession.fromPrimitives({
      id: 'session-123',
      hostId: 'host-123',
      name: 'Test Session',
      inviteCode: 'ABC123',
      isActive: true,
      currentPosition: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should generate id, inviteCode, and timestamps', () => {
      // Arrange & Act
      const session = ListeningSession.create({
        hostId: 'host-123',
        name: 'My Session',
      });

      // Assert
      expect(session.id).toBeDefined();
      expect(session.id.length).toBeGreaterThan(0);
      expect(session.inviteCode).toBeDefined();
      expect(session.inviteCode.length).toBe(6);
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.updatedAt).toBeInstanceOf(Date);
    });

    it('should set isActive to true', () => {
      // Arrange & Act
      const session = ListeningSession.create({
        hostId: 'host-123',
        name: 'My Session',
      });

      // Assert
      expect(session.isActive).toBe(true);
    });

    it('should generate unique ids and invite codes', () => {
      // Arrange & Act
      const session1 = ListeningSession.create({
        hostId: 'host-123',
        name: 'Session 1',
      });
      const session2 = ListeningSession.create({
        hostId: 'host-123',
        name: 'Session 2',
      });

      // Assert
      expect(session1.id).not.toBe(session2.id);
      expect(session1.inviteCode).not.toBe(session2.inviteCode);
    });
  });

  describe('fromPrimitives', () => {
    it('should reconstruct a session from primitives', () => {
      // Arrange
      const now = new Date();
      const props = {
        id: 'session-456',
        hostId: 'host-789',
        name: 'Reconstructed Session',
        inviteCode: 'XYZ789',
        isActive: true,
        currentTrackId: 'track-1',
        currentPosition: 42,
        createdAt: now,
        updatedAt: now,
      };

      // Act
      const session = ListeningSession.fromPrimitives(props);

      // Assert
      expect(session.id).toBe('session-456');
      expect(session.hostId).toBe('host-789');
      expect(session.name).toBe('Reconstructed Session');
      expect(session.inviteCode).toBe('XYZ789');
      expect(session.isActive).toBe(true);
      expect(session.currentTrackId).toBe('track-1');
      expect(session.currentPosition).toBe(42);
      expect(session.createdAt).toBe(now);
      expect(session.updatedAt).toBe(now);
    });
  });

  describe('end', () => {
    it('should set isActive to false and update updatedAt', () => {
      // Arrange
      const session = createMockSession();
      const previousUpdatedAt = session.updatedAt;

      // Act
      session.end();

      // Assert
      expect(session.isActive).toBe(false);
      expect(session.updatedAt.getTime()).toBeGreaterThanOrEqual(previousUpdatedAt.getTime());
    });
  });

  describe('setCurrentTrack', () => {
    it('should update track and position', () => {
      // Arrange
      const session = createMockSession();

      // Act
      session.setCurrentTrack('track-456', 100);

      // Assert
      expect(session.currentTrackId).toBe('track-456');
      expect(session.currentPosition).toBe(100);
    });

    it('should default position to 0', () => {
      // Arrange
      const session = createMockSession();

      // Act
      session.setCurrentTrack('track-456');

      // Assert
      expect(session.currentTrackId).toBe('track-456');
      expect(session.currentPosition).toBe(0);
    });
  });

  describe('updatePosition', () => {
    it('should update position and updatedAt', () => {
      // Arrange
      const session = createMockSession();
      const previousUpdatedAt = session.updatedAt;

      // Act
      session.updatePosition(500);

      // Assert
      expect(session.currentPosition).toBe(500);
      expect(session.updatedAt.getTime()).toBeGreaterThanOrEqual(previousUpdatedAt.getTime());
    });
  });

  describe('toPrimitives', () => {
    it('should return a copy of the props', () => {
      // Arrange
      const session = createMockSession({ currentTrackId: 'track-1' });

      // Act
      const primitives = session.toPrimitives();

      // Assert
      expect(primitives.id).toBe('session-123');
      expect(primitives.hostId).toBe('host-123');
      expect(primitives.name).toBe('Test Session');
      expect(primitives.inviteCode).toBe('ABC123');
      expect(primitives.isActive).toBe(true);
      expect(primitives.currentTrackId).toBe('track-1');
      expect(primitives.currentPosition).toBe(0);
      expect(primitives.createdAt).toBeInstanceOf(Date);
      expect(primitives.updatedAt).toBeInstanceOf(Date);
    });
  });
});
