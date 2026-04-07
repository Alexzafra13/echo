import { RadioStation, RadioStationProps } from './radio-station.entity';

describe('RadioStation Entity', () => {
  const baseCustomProps = {
    userId: 'user-1',
    name: 'My Station',
    url: 'https://stream.example.com/radio.mp3',
    homepage: 'https://example.com',
    country: 'US',
    tags: 'rock,indie,alternative',
  };

  const baseApiData = {
    stationuuid: 'api-uuid-123',
    name: 'API Station',
    url: 'https://api-stream.example.com/radio.mp3',
    url_resolved: 'https://resolved.example.com/radio.mp3',
    homepage: 'https://api-station.example.com',
    favicon: 'https://api-station.example.com/favicon.ico',
    country: 'Germany',
    countrycode: 'DE',
    state: 'Bavaria',
    language: 'german',
    tags: 'pop,electronic',
    codec: 'MP3',
    bitrate: 128,
    votes: 42,
    clickcount: 1000,
    lastcheckok: true,
  };

  const reconstructProps: RadioStationProps = {
    id: 'existing-id',
    userId: 'user-2',
    stationUuid: 'existing-uuid',
    name: 'Existing Station',
    url: 'https://existing.example.com/stream',
    source: 'radio-browser',
    isFavorite: false,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-06-01'),
  };

  describe('createCustom', () => {
    it('should create a station with source "custom"', () => {
      const station = RadioStation.createCustom(baseCustomProps);
      expect(station.source).toBe('custom');
    });

    it('should generate a UUID for id', () => {
      const station = RadioStation.createCustom(baseCustomProps);
      expect(station.id).toBeDefined();
      expect(typeof station.id).toBe('string');
      expect(station.id.length).toBeGreaterThan(0);
    });

    it('should generate unique ids for different stations', () => {
      const station1 = RadioStation.createCustom(baseCustomProps);
      const station2 = RadioStation.createCustom(baseCustomProps);
      expect(station1.id).not.toBe(station2.id);
    });

    it('should set isFavorite to true', () => {
      const station = RadioStation.createCustom(baseCustomProps);
      expect(station.isFavorite).toBe(true);
    });

    it('should set stationUuid to undefined', () => {
      const station = RadioStation.createCustom(baseCustomProps);
      expect(station.stationUuid).toBeUndefined();
    });

    it('should set createdAt and updatedAt to current date', () => {
      const before = new Date();
      const station = RadioStation.createCustom(baseCustomProps);
      const after = new Date();

      expect(station.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(station.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(station.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(station.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should preserve provided properties', () => {
      const station = RadioStation.createCustom(baseCustomProps);
      expect(station.userId).toBe('user-1');
      expect(station.name).toBe('My Station');
      expect(station.url).toBe('https://stream.example.com/radio.mp3');
      expect(station.homepage).toBe('https://example.com');
      expect(station.country).toBe('US');
      expect(station.tags).toBe('rock,indie,alternative');
    });
  });

  describe('createFromAPI', () => {
    it('should create a station with source "radio-browser"', () => {
      const station = RadioStation.createFromAPI('user-1', baseApiData);
      expect(station.source).toBe('radio-browser');
    });

    it('should generate a UUID for id', () => {
      const station = RadioStation.createFromAPI('user-1', baseApiData);
      expect(station.id).toBeDefined();
      expect(typeof station.id).toBe('string');
      expect(station.id.length).toBeGreaterThan(0);
    });

    it('should set isFavorite to true', () => {
      const station = RadioStation.createFromAPI('user-1', baseApiData);
      expect(station.isFavorite).toBe(true);
    });

    it('should map API data fields to entity properties', () => {
      const station = RadioStation.createFromAPI('user-1', baseApiData);

      expect(station.userId).toBe('user-1');
      expect(station.stationUuid).toBe('api-uuid-123');
      expect(station.name).toBe('API Station');
      expect(station.url).toBe('https://api-stream.example.com/radio.mp3');
      expect(station.urlResolved).toBe('https://resolved.example.com/radio.mp3');
      expect(station.homepage).toBe('https://api-station.example.com');
      expect(station.favicon).toBe('https://api-station.example.com/favicon.ico');
      expect(station.country).toBe('Germany');
      expect(station.countryCode).toBe('DE');
      expect(station.state).toBe('Bavaria');
      expect(station.language).toBe('german');
      expect(station.tags).toBe('pop,electronic');
      expect(station.codec).toBe('MP3');
      expect(station.bitrate).toBe(128);
      expect(station.votes).toBe(42);
      expect(station.clickCount).toBe(1000);
      expect(station.lastCheckOk).toBe(true);
    });

    it('should set createdAt and updatedAt to current date', () => {
      const before = new Date();
      const station = RadioStation.createFromAPI('user-1', baseApiData);
      const after = new Date();

      expect(station.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(station.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('reconstruct', () => {
    it('should reconstruct a station with exact properties', () => {
      const station = RadioStation.reconstruct(reconstructProps);

      expect(station.id).toBe('existing-id');
      expect(station.userId).toBe('user-2');
      expect(station.stationUuid).toBe('existing-uuid');
      expect(station.name).toBe('Existing Station');
      expect(station.url).toBe('https://existing.example.com/stream');
      expect(station.source).toBe('radio-browser');
      expect(station.isFavorite).toBe(false);
      expect(station.createdAt).toEqual(new Date('2025-01-01'));
      expect(station.updatedAt).toEqual(new Date('2025-06-01'));
    });
  });

  describe('toggleFavorite', () => {
    it('should flip isFavorite from true to false', () => {
      const station = RadioStation.createCustom(baseCustomProps);
      expect(station.isFavorite).toBe(true);

      station.toggleFavorite();
      expect(station.isFavorite).toBe(false);
    });

    it('should flip isFavorite from false to true', () => {
      const station = RadioStation.reconstruct(reconstructProps);
      expect(station.isFavorite).toBe(false);

      station.toggleFavorite();
      expect(station.isFavorite).toBe(true);
    });

    it('should update the updatedAt timestamp', () => {
      const station = RadioStation.reconstruct(reconstructProps);
      const originalUpdatedAt = station.updatedAt;

      station.toggleFavorite();

      expect(station.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });

    it('should toggle back and forth correctly', () => {
      const station = RadioStation.createCustom(baseCustomProps);
      expect(station.isFavorite).toBe(true);

      station.toggleFavorite();
      expect(station.isFavorite).toBe(false);

      station.toggleFavorite();
      expect(station.isFavorite).toBe(true);
    });
  });

  describe('getTagsArray', () => {
    it('should return an empty array when tags is undefined', () => {
      const station = RadioStation.reconstruct({
        ...reconstructProps,
        tags: undefined,
      });
      expect(station.getTagsArray()).toEqual([]);
    });

    it('should return an empty array when tags is an empty string', () => {
      const station = RadioStation.reconstruct({
        ...reconstructProps,
        tags: '',
      });
      expect(station.getTagsArray()).toEqual([]);
    });

    it('should return a single-element array for a single tag', () => {
      const station = RadioStation.reconstruct({
        ...reconstructProps,
        tags: 'rock',
      });
      expect(station.getTagsArray()).toEqual(['rock']);
    });

    it('should split multiple comma-separated tags', () => {
      const station = RadioStation.reconstruct({
        ...reconstructProps,
        tags: 'rock,indie,alternative',
      });
      expect(station.getTagsArray()).toEqual(['rock', 'indie', 'alternative']);
    });

    it('should trim whitespace from tags', () => {
      const station = RadioStation.reconstruct({
        ...reconstructProps,
        tags: ' rock , indie , alternative ',
      });
      expect(station.getTagsArray()).toEqual(['rock', 'indie', 'alternative']);
    });
  });

  describe('toPrimitives', () => {
    it('should return all properties as a plain object', () => {
      const station = RadioStation.createCustom(baseCustomProps);
      const primitives = station.toPrimitives();

      expect(primitives.id).toBe(station.id);
      expect(primitives.userId).toBe('user-1');
      expect(primitives.name).toBe('My Station');
      expect(primitives.url).toBe('https://stream.example.com/radio.mp3');
      expect(primitives.source).toBe('custom');
      expect(primitives.isFavorite).toBe(true);
    });

    it('should return a copy (not the same reference)', () => {
      const station = RadioStation.createCustom(baseCustomProps);
      const p1 = station.toPrimitives();
      const p2 = station.toPrimitives();

      expect(p1).not.toBe(p2);
      expect(p1).toEqual(p2);
    });

    it('should not be affected by subsequent mutations', () => {
      const station = RadioStation.createCustom(baseCustomProps);
      const primitives = station.toPrimitives();
      const originalFavorite = primitives.isFavorite;

      station.toggleFavorite();

      expect(primitives.isFavorite).toBe(originalFavorite);
    });
  });
});
