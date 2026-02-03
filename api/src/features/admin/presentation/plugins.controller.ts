import { Controller, Get, Post, Delete, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';
import { ConfigService } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import * as http from 'http';
import * as fs from 'fs';

interface PluginInfo {
  id: string;
  name: string;
  description: string;
  version: string;
  status: 'connected' | 'disconnected' | 'error' | 'installing' | 'not_installed';
  url: string;
  features: string[];
  error?: string;
  canInstall: boolean;
  containerStatus?: string;
  image: string;
}

interface PluginHealthResponse {
  status: string;
  model?: string;
  device?: string;
  model_loaded?: boolean;
}

interface DockerContainer {
  Id: string;
  Names: string[];
  Image: string;
  State: string;
  Status: string;
}

const DOCKER_SOCKET = '/var/run/docker.sock';

@ApiTags('Admin - Plugins')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/plugins')
export class PluginsController {
  private readonly stemsPluginUrl: string;
  private readonly stemsImage: string;
  private readonly dockerAvailable: boolean;
  private readonly dockerError: string | null;

  constructor(
    private readonly configService: ConfigService,
    @InjectPinoLogger(PluginsController.name)
    private readonly logger: PinoLogger,
  ) {
    this.stemsPluginUrl = this.configService.get<string>(
      'STEMS_PLUGIN_URL',
      'http://echo-stems:5000',
    );
    this.stemsImage = this.configService.get<string>(
      'STEMS_PLUGIN_IMAGE',
      'ghcr.io/alexzafra13/echo-stems:latest',
    );

    // Check Docker socket existence and permissions
    const dockerCheck = this.checkDockerSocket();
    this.dockerAvailable = dockerCheck.available;
    this.dockerError = dockerCheck.error;

    if (!this.dockerAvailable) {
      this.logger.info({ error: this.dockerError }, 'Docker socket not available - plugin installation disabled');
    }
  }

  private checkDockerSocket(): { available: boolean; error: string | null } {
    // Check if socket exists
    if (!fs.existsSync(DOCKER_SOCKET)) {
      return {
        available: false,
        error: 'Docker socket no encontrado. Monta /var/run/docker.sock en el contenedor.'
      };
    }

    // Check if we have read/write access to the socket
    try {
      fs.accessSync(DOCKER_SOCKET, fs.constants.R_OK | fs.constants.W_OK);
      return { available: true, error: null };
    } catch (err) {
      const nodeError = err as NodeJS.ErrnoException;
      if (nodeError.code === 'EACCES') {
        return {
          available: false,
          error: 'Sin permisos para acceder al socket de Docker. Ejecuta el contenedor con el grupo docker o ajusta los permisos.'
        };
      }
      return {
        available: false,
        error: `Error al acceder al socket de Docker: ${nodeError.message}`
      };
    }
  }

  @Get()
  @ApiOperation({ summary: 'List all available plugins' })
  async listPlugins(): Promise<{ plugins: PluginInfo[]; dockerAvailable: boolean; dockerError: string | null }> {
    const plugins: PluginInfo[] = [];

    // Check stems plugin
    const stemsPlugin = await this.checkStemsPlugin();
    plugins.push(stemsPlugin);

    return {
      plugins,
      dockerAvailable: this.dockerAvailable,
      dockerError: this.dockerError
    };
  }

  @Get('stems/health')
  @ApiOperation({ summary: 'Check stems plugin health' })
  async checkStemsHealth(): Promise<PluginInfo> {
    return this.checkStemsPlugin();
  }

  @Post(':pluginId/install')
  @ApiOperation({ summary: 'Install a plugin' })
  async installPlugin(@Param('pluginId') pluginId: string): Promise<{ success: boolean; message: string }> {
    if (!this.dockerAvailable) {
      return {
        success: false,
        message: 'Docker socket no disponible. Monta /var/run/docker.sock en el contenedor.',
      };
    }

    if (pluginId !== 'stems') {
      return { success: false, message: 'Plugin no reconocido' };
    }

    try {
      this.logger.info({ pluginId, image: this.stemsImage }, 'Installing plugin');

      // Pull the image
      await this.dockerRequest('POST', `/images/create?fromImage=${encodeURIComponent(this.stemsImage)}`);

      // Check if container exists
      const containers = await this.dockerRequest<DockerContainer[]>('GET', '/containers/json?all=true');
      const existing = containers?.find(c => c.Names.some(n => n.includes('echo-stems')));

      if (existing) {
        // Start existing container
        await this.dockerRequest('POST', `/containers/${existing.Id}/start`);
      } else {
        // Create and start new container
        const createBody = {
          Image: this.stemsImage,
          name: 'echo-stems',
          Env: ['DEMUCS_MODEL=htdemucs'],
          HostConfig: {
            NetworkMode: 'echo-network',
            RestartPolicy: { Name: 'unless-stopped' },
            Memory: 4 * 1024 * 1024 * 1024, // 4GB
          },
        };

        const created = await this.dockerRequest<{ Id: string }>(
          'POST',
          '/containers/create?name=echo-stems',
          createBody,
        );

        if (created?.Id) {
          await this.dockerRequest('POST', `/containers/${created.Id}/start`);
        }
      }

      this.logger.info({ pluginId }, 'Plugin installed successfully');
      return { success: true, message: 'Plugin instalado correctamente' };
    } catch (error) {
      this.logger.error({ pluginId, error }, 'Failed to install plugin');
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  @Delete(':pluginId/uninstall')
  @ApiOperation({ summary: 'Uninstall a plugin' })
  async uninstallPlugin(@Param('pluginId') pluginId: string): Promise<{ success: boolean; message: string }> {
    if (!this.dockerAvailable) {
      return {
        success: false,
        message: 'Docker socket no disponible',
      };
    }

    if (pluginId !== 'stems') {
      return { success: false, message: 'Plugin no reconocido' };
    }

    try {
      this.logger.info({ pluginId }, 'Uninstalling plugin');

      // Find container
      const containers = await this.dockerRequest<DockerContainer[]>('GET', '/containers/json?all=true');
      const existing = containers?.find(c => c.Names.some(n => n.includes('echo-stems')));

      if (existing) {
        // Stop container
        await this.dockerRequest('POST', `/containers/${existing.Id}/stop`);
        // Remove container
        await this.dockerRequest('DELETE', `/containers/${existing.Id}`);
      }

      this.logger.info({ pluginId }, 'Plugin uninstalled successfully');
      return { success: true, message: 'Plugin desinstalado correctamente' };
    } catch (error) {
      this.logger.error({ pluginId, error }, 'Failed to uninstall plugin');
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
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
      canInstall: this.dockerAvailable,
      image: this.stemsImage,
    };

    // Check container status if Docker is available
    if (this.dockerAvailable) {
      try {
        const containers = await this.dockerRequest<DockerContainer[]>('GET', '/containers/json?all=true');
        const stemContainer = containers?.find(c => c.Names.some(n => n.includes('echo-stems')));

        if (stemContainer) {
          plugin.containerStatus = stemContainer.State;
        } else {
          plugin.status = 'not_installed';
          return plugin;
        }
      } catch {
        // Docker check failed, continue with health check
      }
    }

    // Check plugin health
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

  /**
   * Make a request to Docker socket
   */
  private dockerRequest<T>(method: string, path: string, body?: object): Promise<T | null> {
    return new Promise((resolve, reject) => {
      const options: http.RequestOptions = {
        socketPath: DOCKER_SOCKET,
        path: `/v1.44${path}`,
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(data ? JSON.parse(data) : null);
            } catch {
              resolve(null);
            }
          } else if (res.statusCode === 304) {
            // Not modified (container already stopped, etc.)
            resolve(null);
          } else {
            reject(new Error(`Docker API error: ${res.statusCode} - ${data}`));
          }
        });
      });

      req.on('error', reject);

      if (body) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }
}
