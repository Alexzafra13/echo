import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@shared/guards/jwt-auth.guard';
import { AdminGuard } from '@shared/guards/admin.guard';

interface PluginInfo {
  id: string;
  name: string;
  description: string;
  version: string;
  status: 'connected' | 'disconnected' | 'not_installed';
}

/**
 * Plugins Controller
 *
 * Placeholder for future plugin system.
 * Currently returns empty list - stem separation was removed.
 */
@ApiTags('Admin - Plugins')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/plugins')
export class PluginsController {
  @Get()
  @ApiOperation({ summary: 'List all available plugins' })
  async listPlugins(): Promise<{ plugins: PluginInfo[] }> {
    // No plugins currently available
    // Stem separation feature was removed
    return { plugins: [] };
  }
}
