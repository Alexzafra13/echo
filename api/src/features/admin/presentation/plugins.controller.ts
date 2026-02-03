import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@features/auth/guards/jwt-auth.guard';
import { AdminGuard } from '@features/auth/guards/admin.guard';
import { ConfigService } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

interface PluginInfo {
  id: string;
  name: string;
  description: string;
  version: string;
  status: 'connected' | 'disconnected' | 'error';
  url: string;
  features: string[];
  error?: string;
}

interface PluginHealthResponse {
  status: string;
  model?: string;
  device?: string;
  model_loaded?: boolean;
}

@ApiTags('Admin - Plugins')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/plugins')
export class PluginsController {
  private readonly stemsPluginUrl: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectPinoLogger(PluginsController.name)
    private readonly logger: PinoLogger,
  ) {
    this.stemsPluginUrl = this.configService.get<string>(
      'STEMS_PLUGIN_URL',
      'http://echo-stems:5000',
    );
  }

  @Get()
  @ApiOperation({ summary: 'List all available plugins' })
  async listPlugins(): Promise<{ plugins: PluginInfo[] }> {
    const plugins: PluginInfo[] = [];

    // Check stems plugin
    const stemsPlugin = await this.checkStemsPlugin();
    plugins.push(stemsPlugin);

    return { plugins };
  }

  @Get('stems/health')
  @ApiOperation({ summary: 'Check stems plugin health' })
  async checkStemsHealth(): Promise<PluginInfo> {
    return this.checkStemsPlugin();
  }

  private async checkStemsPlugin(): Promise<PluginInfo> {
    const plugin: PluginInfo = {
      id: 'stems',
      name: 'Separación de Stems',
      description: 'Separa canciones en vocals, drums, bass y otros usando Demucs',
      version: '1.0.0',
      status: 'disconnected',
      url: this.stemsPluginUrl,
      features: ['vocals', 'drums', 'bass', 'other'],
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.stemsPluginUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const health: PluginHealthResponse = await response.json();

        if (health.model_loaded) {
          plugin.status = 'connected';
        } else {
          plugin.status = 'error';
          plugin.error = 'Modelo no cargado';
        }
      } else {
        plugin.status = 'error';
        plugin.error = `HTTP ${response.status}`;
      }
    } catch (error) {
      plugin.status = 'disconnected';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          plugin.error = 'Timeout de conexión';
        } else {
          plugin.error = error.message;
        }
      }
    }

    return plugin;
  }
}
