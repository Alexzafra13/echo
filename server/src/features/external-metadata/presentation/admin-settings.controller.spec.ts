import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AdminSettingsController } from './admin-settings.controller';
import { SettingsService } from '../infrastructure/services/settings.service';

describe('AdminSettingsController', () => {
  let controller: AdminSettingsController;
  let settingsService: jest.Mocked<SettingsService>;

  const mockSetting = {
    id: '1',
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
      delete: jest.fn(),
      clearCache: jest.fn(),
      validateApiKey: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminSettingsController],
      providers: [
        {
          provide: SettingsService,
          useValue: mockSettingsService,
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

    it('debería lanzar BadRequestException si no existe', async () => {
      // Arrange
      settingsService.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(controller.getSetting('nonexistent')).rejects.toThrow(BadRequestException);
      await expect(controller.getSetting('nonexistent')).rejects.toThrow(
        'Setting with key nonexistent not found'
      );
    });

    it('debería propagar errores del servicio', async () => {
      // Arrange
      settingsService.findOne.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(controller.getSetting('test.key')).rejects.toThrow('Database error');
    });
  });

  describe('updateSetting', () => {
    it('debería actualizar una configuración', async () => {
      // Arrange
      const oldSetting = { ...mockSetting, value: 'old-value' };
      const updatedSetting = { ...mockSetting, value: 'new-value' };

      settingsService.findOne.mockResolvedValue(oldSetting);
      settingsService.update.mockResolvedValue(updatedSetting);

      // Act
      const result = await controller.updateSetting('test.key', { value: 'new-value' });

      // Assert
      expect(result).toEqual({
        success: true,
        key: 'test.key',
        oldValue: 'old-value',
        newValue: 'new-value',
      });
      expect(settingsService.update).toHaveBeenCalledWith('test.key', 'new-value');
      expect(settingsService.clearCache).toHaveBeenCalled();
    });

    it('debería lanzar BadRequestException si setting no existe', async () => {
      // Arrange
      settingsService.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        controller.updateSetting('nonexistent', { value: 'value' })
      ).rejects.toThrow(BadRequestException);
    });

    it('debería propagar errores del servicio', async () => {
      // Arrange
      settingsService.findOne.mockResolvedValue(mockSetting);
      settingsService.update.mockRejectedValue(new Error('Database error'));

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
      });
      expect(settingsService.validateApiKey).toHaveBeenCalledWith('fanart', 'valid-key');
    });

    it('debería manejar errores de validación', async () => {
      // Arrange
      settingsService.validateApiKey.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(
        controller.validateApiKey({
          service: 'lastfm',
          apiKey: 'any-key',
        })
      ).rejects.toThrow('Network error');
    });
  });

  describe('deleteSetting', () => {
    it('debería eliminar una configuración', async () => {
      // Arrange
      settingsService.findOne.mockResolvedValue(mockSetting);
      settingsService.delete.mockResolvedValue(mockSetting);

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
        message: 'Settings cache cleared successfully',
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
