import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AdminSettingsController } from './admin-settings.controller';
import { SettingsService } from '../infrastructure/services/settings.service';
import { EnrichmentQueueService } from '../infrastructure/services/enrichment-queue.service';
import { FanartTvAgent } from '../infrastructure/agents/fanart-tv.agent';
import { LastfmAgent } from '../infrastructure/agents/lastfm.agent';

describe('AdminSettingsController', () => {
  let controller: AdminSettingsController;
  let settingsService: jest.Mocked<SettingsService>;

  const mockSetting = {
    key: 'test.key',
    value: 'test-value',
    type: 'string',
    category: 'test',
    description: 'Test setting',
    isPublic: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    // Create mock service
    const mockSettingsService = {
      findAll: jest.fn(),
      findByCategory: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      clearCache: jest.fn(),
      validateApiKey: jest.fn(),
    };

    // Create mock enrichment queue service
    const mockEnrichmentQueueService = {
      resetEnrichmentState: jest.fn().mockResolvedValue({ artistsReset: 0, albumsReset: 0 }),
      startEnrichmentQueue: jest.fn().mockResolvedValue({ started: false, pending: 0, message: 'No items pending' }),
      getQueueStats: jest.fn().mockResolvedValue({ isRunning: false, totalPending: 0 }),
    };

    // Create mock agents
    const mockFanartAgent = {
      loadSettings: jest.fn(),
      isEnabled: jest.fn().mockReturnValue(false),
    };

    const mockLastfmAgent = {
      loadSettings: jest.fn(),
      isEnabled: jest.fn().mockReturnValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminSettingsController],
      providers: [
        {
          provide: SettingsService,
          useValue: mockSettingsService,
        },
        {
          provide: EnrichmentQueueService,
          useValue: mockEnrichmentQueueService,
        },
        {
          provide: FanartTvAgent,
          useValue: mockFanartAgent,
        },
        {
          provide: LastfmAgent,
          useValue: mockLastfmAgent,
        },
      ],
    }).compile();

    controller = module.get<AdminSettingsController>(AdminSettingsController);
    settingsService = module.get(SettingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllSettings', () => {
    it('debería retornar todas las configuraciones', async () => {
      // Arrange
      const settings = [mockSetting, { ...mockSetting, id: '2', key: 'test.key2' }];
      settingsService.findAll.mockResolvedValue(settings);

      // Act
      const result = await controller.getAllSettings();

      // Assert
      expect(result).toEqual(settings);
      expect(settingsService.findAll).toHaveBeenCalledTimes(1);
    });

    it('debería propagar errores del servicio', async () => {
      // Arrange
      settingsService.findAll.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(controller.getAllSettings()).rejects.toThrow('Database error');
    });
  });

  describe('getSettingsByCategory', () => {
    it('debería retornar configuraciones de una categoría', async () => {
      // Arrange
      const settings = [
        mockSetting,
        { ...mockSetting, id: '2', key: 'test.key2', category: 'test' },
      ];
      settingsService.findByCategory.mockResolvedValue(settings);

      // Act
      const result = await controller.getSettingsByCategory('test');

      // Assert
      expect(result).toEqual(settings);
      expect(settingsService.findByCategory).toHaveBeenCalledWith('test');
    });

    it('debería retornar array vacío si no hay configuraciones', async () => {
      // Arrange
      settingsService.findByCategory.mockResolvedValue([]);

      // Act
      const result = await controller.getSettingsByCategory('nonexistent');

      // Assert
      expect(result).toEqual([]);
    });

    it('debería propagar errores del servicio', async () => {
      // Arrange
      settingsService.findByCategory.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(controller.getSettingsByCategory('test')).rejects.toThrow('Database error');
    });
  });

  describe('getSetting', () => {
    it('debería retornar una configuración específica', async () => {
      // Arrange
      settingsService.findOne.mockResolvedValue(mockSetting);

      // Act
      const result = await controller.getSetting('test.key');

      // Assert
      expect(result).toEqual(mockSetting);
      expect(settingsService.findOne).toHaveBeenCalledWith('test.key');
    });

    it('debería retornar null si no existe', async () => {
      // Arrange
      settingsService.findOne.mockResolvedValue(null);

      // Act
      const result = await controller.getSetting('nonexistent');

      // Assert
      expect(result).toBeNull();
    });

    it('debería propagar errores del servicio', async () => {
      // Arrange
      settingsService.findOne.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(controller.getSetting('test.key')).rejects.toThrow('Database error');
    });
  });

  describe('updateSetting', () => {
    it('debería actualizar una configuración existente', async () => {
      // Arrange
      const oldSetting = { ...mockSetting, value: 'old-value' };

      settingsService.findOne.mockResolvedValue(oldSetting);
      settingsService.set.mockResolvedValue(undefined);

      // Act
      const result = await controller.updateSetting('test.key', { value: 'new-value' });

      // Assert
      expect(result).toEqual({
        success: true,
        key: 'test.key',
        oldValue: 'old-value',
        newValue: 'new-value',
        created: false,
      });
      expect(settingsService.set).toHaveBeenCalledWith('test.key', 'new-value');
      expect(settingsService.clearCache).toHaveBeenCalled();
    });

    it('debería crear una nueva configuración si no existe', async () => {
      // Arrange
      settingsService.findOne.mockResolvedValue(null);
      settingsService.set.mockResolvedValue(undefined);

      // Act
      const result = await controller.updateSetting('new.key', { value: 'new-value' });

      // Assert
      expect(result).toEqual({
        success: true,
        key: 'new.key',
        oldValue: null,
        newValue: 'new-value',
        created: true,
      });
      expect(settingsService.set).toHaveBeenCalledWith('new.key', 'new-value');
    });

    it('debería propagar errores del servicio', async () => {
      // Arrange
      settingsService.findOne.mockResolvedValue(mockSetting);
      settingsService.set.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(
        controller.updateSetting('test.key', { value: 'new-value' })
      ).rejects.toThrow('Database error');
    });
  });

  describe('validateApiKey', () => {
    it('debería validar API key de Last.fm correctamente', async () => {
      // Arrange
      settingsService.validateApiKey.mockResolvedValue(true);

      // Act
      const result = await controller.validateApiKey({
        service: 'lastfm',
        apiKey: 'valid-key',
      });

      // Assert
      expect(result).toEqual({
        valid: true,
        service: 'lastfm',
        message: 'API key is valid',
      });
      expect(settingsService.validateApiKey).toHaveBeenCalledWith('lastfm', 'valid-key');
    });

    it('debería retornar false para API key inválida', async () => {
      // Arrange
      settingsService.validateApiKey.mockResolvedValue(false);

      // Act
      const result = await controller.validateApiKey({
        service: 'lastfm',
        apiKey: 'invalid-key',
      });

      // Assert
      expect(result).toEqual({
        valid: false,
        service: 'lastfm',
        message: 'API key is invalid or service is unavailable',
      });
    });

    it('debería validar API key de Fanart.tv', async () => {
      // Arrange
      settingsService.validateApiKey.mockResolvedValue(true);

      // Act
      const result = await controller.validateApiKey({
        service: 'fanart',
        apiKey: 'valid-key',
      });

      // Assert
      expect(result).toEqual({
        valid: true,
        service: 'fanart',
        message: 'API key is valid',
      });
      expect(settingsService.validateApiKey).toHaveBeenCalledWith('fanart', 'valid-key');
    });

    it('debería manejar errores de validación', async () => {
      // Arrange - El controller no lanza errores, los captura y retorna valid: false
      settingsService.validateApiKey.mockRejectedValue(new Error('Network error'));

      // Act
      const result = await controller.validateApiKey({
        service: 'lastfm',
        apiKey: 'any-key',
      });

      // Assert
      expect(result).toEqual({
        valid: false,
        service: 'lastfm',
        message: 'Network error',
      });
    });
  });

  describe('deleteSetting', () => {
    it('debería eliminar una configuración', async () => {
      // Arrange
      settingsService.findOne.mockResolvedValue(mockSetting);
      settingsService.delete.mockResolvedValue(undefined);

      // Act
      const result = await controller.deleteSetting('test.key');

      // Assert
      expect(result).toEqual({
        success: true,
        key: 'test.key',
        message: 'Setting deleted successfully',
      });
      expect(settingsService.delete).toHaveBeenCalledWith('test.key');
      expect(settingsService.clearCache).toHaveBeenCalled();
    });

    it('debería lanzar BadRequestException si setting no existe', async () => {
      // Arrange
      settingsService.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(controller.deleteSetting('nonexistent')).rejects.toThrow(BadRequestException);
    });

    it('debería propagar errores del servicio', async () => {
      // Arrange
      settingsService.findOne.mockResolvedValue(mockSetting);
      settingsService.delete.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(controller.deleteSetting('test.key')).rejects.toThrow('Database error');
    });
  });

  describe('clearCache', () => {
    it('debería limpiar el cache correctamente', async () => {
      // Arrange
      settingsService.clearCache.mockReturnValue(undefined);

      // Act
      const result = await controller.clearCache();

      // Assert
      expect(result).toEqual({
        success: true,
        message: 'Cache cleared successfully',
      });
      expect(settingsService.clearCache).toHaveBeenCalled();
    });

    it('debería manejar errores al limpiar cache', async () => {
      // Arrange
      settingsService.clearCache.mockImplementation(() => {
        throw new Error('Cache error');
      });

      // Act & Assert
      await expect(controller.clearCache()).rejects.toThrow('Cache error');
    });
  });
});
