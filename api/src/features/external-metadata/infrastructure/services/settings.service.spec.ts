import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsRepository } from '../persistence/settings.repository';

// Mock fetch global
global.fetch = jest.fn();

describe('SettingsService', () => {
  let service: SettingsService;
  let repository: jest.Mocked<SettingsRepository>;

  beforeEach(async () => {
    // Create mock repository
    const mockRepository = {
      findOne: jest.fn(),
      findAll: jest.fn(),
      findByCategory: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        {
          provide: SettingsRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    repository = module.get(SettingsRepository);

    // Clear fetch mock
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('debería retornar valor del cache si existe', async () => {
      // Arrange
      repository.findAll.mockResolvedValue([
        { key: 'test.key', value: 'test-value', type: 'string', category: 'test', description: '', isPublic: false, createdAt: new Date(), updatedAt: new Date() },
      ]);

      // Inicializar cache
      await service.get('test.key');

      // Act
      const result = await service.get('test.key');

      // Assert
      expect(result).toBe('test-value');
      expect(repository.findAll).toHaveBeenCalledTimes(1); // Solo una vez para inicializar
    });

    it('debería consultar la BD si no está en cache', async () => {
      // Arrange
      repository.findAll.mockResolvedValue([]);
      repository.findOne.mockResolvedValue({
        key: 'test.key',
        value: 'database-value',
        type: 'string',
        category: 'test',
        description: '',
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      const result = await service.get('test.key');

      // Assert
      expect(result).toBe('database-value');
      expect(repository.findOne).toHaveBeenCalledWith('test.key');
    });

    it('debería retornar defaultValue si no existe el setting', async () => {
      // Arrange
      repository.findAll.mockResolvedValue([]);
      repository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.get('nonexistent.key', 'default');

      // Assert
      expect(result).toBe('default');
    });

    it('debería retornar null si no existe y no hay defaultValue', async () => {
      // Arrange
      repository.findAll.mockResolvedValue([]);
      repository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.get('nonexistent.key');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getBoolean', () => {
    it('debería convertir "true" a boolean true', async () => {
      // Arrange
      repository.findAll.mockResolvedValue([
        { key: 'bool.key', value: 'true', type: 'boolean', category: 'test', description: '', isPublic: false, createdAt: new Date(), updatedAt: new Date() },
      ]);

      // Act
      const result = await service.getBoolean('bool.key');

      // Assert
      expect(result).toBe(true);
    });

    it('debería convertir "false" a boolean false', async () => {
      // Arrange
      repository.findAll.mockResolvedValue([
        { key: 'bool.key', value: 'false', type: 'boolean', category: 'test', description: '', isPublic: false, createdAt: new Date(), updatedAt: new Date() },
      ]);

      // Act
      const result = await service.getBoolean('bool.key');

      // Assert
      expect(result).toBe(false);
    });

    it('debería retornar defaultValue si no existe', async () => {
      // Arrange
      repository.findAll.mockResolvedValue([]);
      repository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.getBoolean('nonexistent', true);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('getNumber', () => {
    it('debería convertir string a número', async () => {
      // Arrange
      repository.findAll.mockResolvedValue([
        { key: 'num.key', value: '42', type: 'number', category: 'test', description: '', isPublic: false, createdAt: new Date(), updatedAt: new Date() },
      ]);

      // Act
      const result = await service.getNumber('num.key');

      // Assert
      expect(result).toBe(42);
    });

    it('debería retornar defaultValue si no existe', async () => {
      // Arrange
      repository.findAll.mockResolvedValue([]);
      repository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.getNumber('nonexistent', 100);

      // Assert
      expect(result).toBe(100);
    });
  });

  describe('getString', () => {
    it('debería retornar valor como string', async () => {
      // Arrange
      repository.findAll.mockResolvedValue([
        { key: 'str.key', value: 'hello', type: 'string', category: 'test', description: '', isPublic: false, createdAt: new Date(), updatedAt: new Date() },
      ]);

      // Act
      const result = await service.getString('str.key');

      // Assert
      expect(result).toBe('hello');
    });

    it('debería retornar defaultValue si no existe', async () => {
      // Arrange
      repository.findAll.mockResolvedValue([]);
      repository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.getString('nonexistent', 'default');

      // Assert
      expect(result).toBe('default');
    });
  });

  describe('set', () => {
    it('debería actualizar un setting y su cache', async () => {
      // Arrange
      repository.findAll.mockResolvedValue([]);
      repository.update.mockResolvedValue({
        key: 'test.key',
        value: 'new-value',
        type: 'string',
        category: 'test',
        description: '',
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act
      await service.set('test.key', 'new-value');

      // Assert
      expect(repository.upsert).toHaveBeenCalledWith(expect.objectContaining({
        key: 'test.key',
        value: 'new-value',
      }));
    });

    it('debería convertir boolean a string', async () => {
      // Arrange
      repository.findAll.mockResolvedValue([]);

      // Act
      await service.set('bool.key', true);

      // Assert
      expect(repository.upsert).toHaveBeenCalledWith(expect.objectContaining({
        key: 'bool.key',
        value: 'true',
        type: 'boolean',
      }));
    });

    it('debería convertir número a string', async () => {
      // Arrange
      repository.findAll.mockResolvedValue([]);

      // Act
      await service.set('num.key', 42);

      // Assert
      expect(repository.upsert).toHaveBeenCalledWith(expect.objectContaining({
        key: 'num.key',
        value: '42',
        type: 'number',
      }));
    });
  });

  describe('setMultiple', () => {
    it('debería actualizar múltiples settings', async () => {
      // Arrange
      repository.findAll.mockResolvedValue([]);

      // Act
      await service.setMultiple({
        'key1': 'value1',
        'key2': 'value2',
        'key3': true,
      });

      // Assert
      expect(repository.upsert).toHaveBeenCalledTimes(3);
      expect(repository.upsert).toHaveBeenCalledWith(expect.objectContaining({
        key: 'key1',
        value: 'value1',
      }));
      expect(repository.upsert).toHaveBeenCalledWith(expect.objectContaining({
        key: 'key2',
        value: 'value2',
      }));
      expect(repository.upsert).toHaveBeenCalledWith(expect.objectContaining({
        key: 'key3',
        value: 'true',
        type: 'boolean',
      }));
    });
  });

  describe('getCategory', () => {
    it('debería retornar todas las settings de una categoría', async () => {
      // Arrange
      repository.findByCategory.mockResolvedValue([
        { key: 'cat.key1', value: 'val1', type: 'string', category: 'cat', description: '', isPublic: false, createdAt: new Date(), updatedAt: new Date() },
        { key: 'cat.key2', value: 'true', type: 'boolean', category: 'cat', description: '', isPublic: false, createdAt: new Date(), updatedAt: new Date() },
        { key: 'cat.key3', value: '42', type: 'number', category: 'cat', description: '', isPublic: false, createdAt: new Date(), updatedAt: new Date() },
      ]);

      // Act
      const result = await service.getCategory('cat');

      // Assert
      expect(result).toEqual({
        'cat.key1': 'val1',
        'cat.key2': true,
        'cat.key3': 42,
      });
    });
  });

  describe('validateApiKey', () => {
    it('debería retornar false si API key está vacía', async () => {
      // Act
      const result = await service.validateApiKey('lastfm', '');

      // Assert
      expect(result).toBe(false);
    });

    it('debería validar Last.fm API key correctamente', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ artist: { name: 'Cher' } }),
      });

      // Act
      const result = await service.validateApiKey('lastfm', 'valid-key');

      // Assert
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('ws.audioscrobbler.com')
      );
    });

    it('debería retornar false si Last.fm API key es inválida', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ error: 10, message: 'Invalid API key' }),
      });

      // Act
      const result = await service.validateApiKey('lastfm', 'invalid-key');

      // Assert
      expect(result).toBe(false);
    });

    it('debería validar Fanart.tv API key correctamente', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 200,
        ok: true,
      });

      // Act
      const result = await service.validateApiKey('fanart', 'valid-key');

      // Assert
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('fanart.tv'),
        expect.objectContaining({
          headers: {
            'api-key': 'valid-key',
          },
        })
      );
    });

    it('debería retornar false si Fanart.tv API key es inválida', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockResolvedValue({
        status: 401,
        ok: false,
      });

      // Act
      const result = await service.validateApiKey('fanart', 'invalid-key');

      // Assert
      expect(result).toBe(false);
    });

    it('debería manejar errores de red', async () => {
      // Arrange
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      // Act
      const result = await service.validateApiKey('lastfm', 'any-key');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('debería limpiar el cache', async () => {
      // Arrange
      repository.findAll.mockResolvedValue([
        { key: 'test.key', value: 'test', type: 'string', category: 'test', description: '', isPublic: false, createdAt: new Date(), updatedAt: new Date() },
      ]);

      // Inicializar cache
      await service.get('test.key');

      // Act
      service.clearCache();

      // Assert - Debería reinicializar cache en próximo get
      await service.get('test.key');
      expect(repository.findAll).toHaveBeenCalledTimes(2); // Una vez antes y una después del clear
    });
  });

  describe('update', () => {
    it('debería actualizar setting y invalidar cache', async () => {
      // Arrange
      repository.findAll.mockResolvedValue([
        { key: 'test.key', value: 'old', type: 'string', category: 'test', description: '', isPublic: false, createdAt: new Date(), updatedAt: new Date() },
      ]);
      repository.update.mockResolvedValue({
        key: 'test.key',
        value: 'new',
        type: 'string',
        category: 'test',
        description: '',
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Inicializar cache
      await service.get('test.key');

      // Act
      await service.update('test.key', 'new');

      // Assert
      expect(repository.update).toHaveBeenCalledWith('test.key', 'new');
    });
  });

  describe('delete', () => {
    it('debería eliminar setting y invalidar cache', async () => {
      // Arrange
      repository.findAll.mockResolvedValue([
        { key: 'test.key', value: 'test', type: 'string', category: 'test', description: '', isPublic: false, createdAt: new Date(), updatedAt: new Date() },
      ]);
      repository.delete.mockResolvedValue(undefined);

      // Inicializar cache
      await service.get('test.key');

      // Act
      await service.delete('test.key');

      // Assert
      expect(repository.delete).toHaveBeenCalledWith('test.key');
    });
  });
});
