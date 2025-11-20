import { Controller, Get, Req, Res } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

/**
 * SPA Controller - Handles client-side routing fallback
 *
 * This controller serves index.html for all non-API routes,
 * allowing React Router (or other client-side routers) to work.
 *
 * It must be registered LAST so it catches all unmatched routes.
 */
@Controller()
export class SpaController {
  // Frontend is at /app/frontend/dist (compiled code is in /app/dist/src)
  private readonly frontendPath = join(__dirname, '..', '..', '..', '..', 'frontend', 'dist');
  private readonly indexHtmlPath = join(this.frontendPath, 'index.html');
  private readonly indexHtml: string | null = null;

  constructor() {
    // Load index.html once at startup if it exists
    if (existsSync(this.indexHtmlPath)) {
      this.indexHtml = readFileSync(this.indexHtmlPath, 'utf-8');
      console.log(`✅ SpaController: index.html loaded from ${this.indexHtmlPath}`);
    } else {
      console.warn(`⚠️  SpaController: index.html not found at ${this.indexHtmlPath}`);
    }
  }

  /**
   * Catch-all route for SPA fallback
   * Matches any route that hasn't been matched by other controllers
   */
  @Get('*')
  serveSpa(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    const { url } = request;

    // If frontend is not available, return 404
    if (!this.indexHtml) {
      reply.code(404).send({
        statusCode: 404,
        message: `Cannot GET ${url}`,
        error: 'Not Found',
      });
      return;
    }

    // Serve index.html for SPA routing
    reply.type('text/html').send(this.indexHtml);
  }
}
