import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DrizzleService } from '../../src/infrastructure/database/drizzle.service';
import * as schema from '../../src/infrastructure/database/schema';
import {
  createTestApp,
  createUserAndLogin,
  cleanUserTables,
  createTestArtist,
  createTestAlbum,
  createTestTrack,
} from './helpers/test-setup';

/**
 * Federation E2E Tests
 *
 * Prueba los endpoints de federación:
 * - Invitation tokens (crear, listar, eliminar)
 * - Access tokens (listar, revocar, permisos)
 * - Public endpoints (connect, ping, library, stream)
 *
 * La federación permite que servidores Echo compartan bibliotecas entre sí.
 */
describe('Federation E2E', () => {
  let app: INestApplication;
  let drizzle: DrizzleService;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    drizzle = testApp.drizzle;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Limpiar tablas de federación
    await cleanFederationTables(drizzle);
    await cleanUserTables(drizzle);
  });

  // ============================================
  // Invitation Tokens
  // ============================================

  describe('Invitation Tokens', () => {
    describe('POST /api/federation/invitations', () => {
      it('debería crear un token de invitación', async () => {
        const { accessToken } = await createUserAndLogin(drizzle, app);

        const response = await request(app.getHttpServer())
          .post('/api/federation/invitations')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Token para amigo',
            expiresInDays: 7,
          })
          .expect(201);

        expect(response.body.token).toBeDefined();
        expect(response.body.token.length).toBeGreaterThan(10);
        expect(response.body.name).toBe('Token para amigo');
        expect(response.body.expiresAt).toBeDefined();
      });

      it('debería crear token sin nombre', async () => {
        const { accessToken } = await createUserAndLogin(drizzle, app);

        const response = await request(app.getHttpServer())
          .post('/api/federation/invitations')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({})
          .expect(201);

        expect(response.body.token).toBeDefined();
      });

      it('debería rechazar sin autenticación', () => {
        return request(app.getHttpServer())
          .post('/api/federation/invitations')
          .send({})
          .expect(401);
      });
    });

    describe('GET /api/federation/invitations', () => {
      it('debería listar tokens de invitación del usuario', async () => {
        const { accessToken, user } = await createUserAndLogin(drizzle, app);

        // Crear algunos tokens
        await createInvitationToken(drizzle, user.id, 'Token 1');
        await createInvitationToken(drizzle, user.id, 'Token 2');

        const response = await request(app.getHttpServer())
          .get('/api/federation/invitations')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(2);
      });

      it('no debería mostrar tokens de otros usuarios', async () => {
        const { accessToken: token1, user: user1 } = await createUserAndLogin(drizzle, app, {
          username: 'user1',
        });
        const { user: user2 } = await createUserAndLogin(drizzle, app, {
          username: 'user2',
        });

        // Crear token para user2
        await createInvitationToken(drizzle, user2.id, 'Token de user2');

        const response = await request(app.getHttpServer())
          .get('/api/federation/invitations')
          .set('Authorization', `Bearer ${token1}`)
          .expect(200);

        expect(response.body.length).toBe(0);
      });
    });

    describe('DELETE /api/federation/invitations/:id', () => {
      it('debería eliminar un token de invitación', async () => {
        const { accessToken, user } = await createUserAndLogin(drizzle, app);
        const token = await createInvitationToken(drizzle, user.id, 'Token a eliminar');

        await request(app.getHttpServer())
          .delete(`/api/federation/invitations/${token.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        // Verificar que se eliminó
        const remaining = await drizzle.db
          .select()
          .from(schema.federationTokens)
          .where(require('drizzle-orm').eq(schema.federationTokens.id, token.id));

        expect(remaining.length).toBe(0);
      });

      it('debería rechazar eliminar token de otro usuario', async () => {
        const { accessToken: token1 } = await createUserAndLogin(drizzle, app, {
          username: 'user1',
        });
        const { user: user2 } = await createUserAndLogin(drizzle, app, {
          username: 'user2',
        });

        const token = await createInvitationToken(drizzle, user2.id, 'Token de user2');

        await request(app.getHttpServer())
          .delete(`/api/federation/invitations/${token.id}`)
          .set('Authorization', `Bearer ${token1}`)
          .expect(403);
      });

      it('debería retornar 404 para token inexistente', async () => {
        const { accessToken } = await createUserAndLogin(drizzle, app);

        await request(app.getHttpServer())
          .delete('/api/federation/invitations/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(404);
      });
    });
  });

  // ============================================
  // Access Tokens
  // ============================================

  describe('Access Tokens', () => {
    describe('GET /api/federation/access-tokens', () => {
      it('debería listar access tokens del usuario', async () => {
        const { accessToken, user } = await createUserAndLogin(drizzle, app);

        // Crear un access token (simula un servidor conectado)
        await createAccessToken(drizzle, user.id, 'Servidor Amigo');

        const response = await request(app.getHttpServer())
          .get('/api/federation/access-tokens')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(1);
        expect(response.body[0].serverName).toBe('Servidor Amigo');
        // Token no debería exponerse
        expect(response.body[0].token).toBeUndefined();
      });
    });

    describe('DELETE /api/federation/access-tokens/:id', () => {
      it('debería revocar un access token', async () => {
        const { accessToken, user } = await createUserAndLogin(drizzle, app);
        const fedToken = await createAccessToken(drizzle, user.id, 'Servidor a revocar');

        await request(app.getHttpServer())
          .delete(`/api/federation/access-tokens/${fedToken.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        // Verificar que está revocado (isActive = false)
        const [updated] = await drizzle.db
          .select()
          .from(schema.federationAccessTokens)
          .where(require('drizzle-orm').eq(schema.federationAccessTokens.id, fedToken.id));

        expect(updated.isActive).toBe(false);
      });

      it('debería eliminar permanentemente con permanent=true', async () => {
        const { accessToken, user } = await createUserAndLogin(drizzle, app);
        const fedToken = await createAccessToken(drizzle, user.id, 'Servidor a eliminar');

        await request(app.getHttpServer())
          .delete(`/api/federation/access-tokens/${fedToken.id}?permanent=true`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        // Verificar que se eliminó
        const remaining = await drizzle.db
          .select()
          .from(schema.federationAccessTokens)
          .where(require('drizzle-orm').eq(schema.federationAccessTokens.id, fedToken.id));

        expect(remaining.length).toBe(0);
      });
    });

    describe('PATCH /api/federation/access-tokens/:id/permissions', () => {
      it('debería actualizar permisos del token', async () => {
        const { accessToken, user } = await createUserAndLogin(drizzle, app);
        const fedToken = await createAccessToken(drizzle, user.id, 'Servidor');

        const response = await request(app.getHttpServer())
          .patch(`/api/federation/access-tokens/${fedToken.id}/permissions`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            canBrowse: true,
            canStream: false,
            canDownload: true,
          })
          .expect(200);

        expect(response.body.permissions.canBrowse).toBe(true);
        expect(response.body.permissions.canStream).toBe(false);
        expect(response.body.permissions.canDownload).toBe(true);
      });
    });
  });

  // ============================================
  // Public Federation Endpoints
  // ============================================

  describe('Public Federation Endpoints', () => {
    describe('POST /api/federation/connect', () => {
      it('debería conectar con token de invitación válido', async () => {
        const { user } = await createUserAndLogin(drizzle, app);
        const invToken = await createInvitationToken(drizzle, user.id, 'Token válido');

        const response = await request(app.getHttpServer())
          .post('/api/federation/connect')
          .send({
            invitationToken: invToken.token,
            serverName: 'Mi Servidor Echo',
            serverUrl: 'https://mi-echo.example.com',
          })
          .expect(201);

        expect(response.body.accessToken).toBeDefined();
        expect(response.body.serverInfo).toBeDefined();
        expect(response.body.serverInfo.name).toBe('Echo Music Server');
      });

      it('debería rechazar con token inválido', () => {
        return request(app.getHttpServer())
          .post('/api/federation/connect')
          .send({
            invitationToken: 'INVALID-TOKEN',
            serverName: 'Servidor Malo',
          })
          .expect(401);
      });

      it('debería rechazar con token expirado', async () => {
        const { user } = await createUserAndLogin(drizzle, app);
        const expiredToken = await createInvitationToken(drizzle, user.id, 'Expirado', -1); // Expiró ayer

        return request(app.getHttpServer())
          .post('/api/federation/connect')
          .send({
            invitationToken: expiredToken.token,
            serverName: 'Servidor',
          })
          .expect(401);
      });
    });

    describe('GET /api/federation/ping', () => {
      it('debería responder con ok y timestamp usando access token', async () => {
        const { user } = await createUserAndLogin(drizzle, app);
        const fedToken = await createAccessToken(drizzle, user.id, 'Servidor');

        const response = await request(app.getHttpServer())
          .get('/api/federation/ping')
          .set('Authorization', `Bearer ${fedToken.token}`)
          .expect(200);

        expect(response.body.ok).toBe(true);
        expect(response.body.timestamp).toBeDefined();
      });

      it('debería rechazar sin token', () => {
        return request(app.getHttpServer())
          .get('/api/federation/ping')
          .expect(401);
      });

      it('debería rechazar con token revocado', async () => {
        const { user } = await createUserAndLogin(drizzle, app);
        const fedToken = await createAccessToken(drizzle, user.id, 'Revocado', false);

        return request(app.getHttpServer())
          .get('/api/federation/ping')
          .set('Authorization', `Bearer ${fedToken.token}`)
          .expect(401);
      });
    });

    describe('GET /api/federation/info', () => {
      it('debería retornar información del servidor', async () => {
        const { user } = await createUserAndLogin(drizzle, app);
        const fedToken = await createAccessToken(drizzle, user.id, 'Servidor');

        const response = await request(app.getHttpServer())
          .get('/api/federation/info')
          .set('Authorization', `Bearer ${fedToken.token}`)
          .expect(200);

        expect(response.body.name).toBe('Echo Music Server');
        expect(response.body.version).toBeDefined();
        expect(typeof response.body.albumCount).toBe('number');
        expect(typeof response.body.trackCount).toBe('number');
        expect(typeof response.body.artistCount).toBe('number');
      });
    });

    describe('GET /api/federation/library', () => {
      it('debería retornar biblioteca con álbumes', async () => {
        const { user } = await createUserAndLogin(drizzle, app);
        const fedToken = await createAccessToken(drizzle, user.id, 'Servidor');

        // Crear contenido de prueba
        const artist = await createTestArtist(drizzle, { name: 'Test Artist' });
        await createTestAlbum(drizzle, {
          name: 'Test Album',
          artistId: artist.id,
          songCount: 10,
        });

        const response = await request(app.getHttpServer())
          .get('/api/federation/library')
          .set('Authorization', `Bearer ${fedToken.token}`)
          .expect(200);

        expect(response.body.albums).toBeDefined();
        expect(Array.isArray(response.body.albums)).toBe(true);
        expect(typeof response.body.totalAlbums).toBe('number');
        expect(typeof response.body.totalTracks).toBe('number');
      });

      it('debería soportar paginación', async () => {
        const { user } = await createUserAndLogin(drizzle, app);
        const fedToken = await createAccessToken(drizzle, user.id, 'Servidor');

        const response = await request(app.getHttpServer())
          .get('/api/federation/library?page=1&limit=10')
          .set('Authorization', `Bearer ${fedToken.token}`)
          .expect(200);

        expect(response.body.albums).toBeDefined();
      });

      it('debería rechazar sin permiso canBrowse', async () => {
        const { user } = await createUserAndLogin(drizzle, app);
        const fedToken = await createAccessToken(drizzle, user.id, 'Servidor', true, {
          canBrowse: false,
          canStream: true,
          canDownload: false,
        });

        return request(app.getHttpServer())
          .get('/api/federation/library')
          .set('Authorization', `Bearer ${fedToken.token}`)
          .expect(403);
      });
    });

    describe('GET /api/federation/albums/:id', () => {
      it('debería retornar álbum con tracks', async () => {
        const { user } = await createUserAndLogin(drizzle, app);
        const fedToken = await createAccessToken(drizzle, user.id, 'Servidor');

        const artist = await createTestArtist(drizzle, { name: 'Test Artist' });
        const album = await createTestAlbum(drizzle, {
          name: 'Test Album',
          artistId: artist.id,
        });
        await createTestTrack(drizzle, {
          title: 'Track 1',
          path: '/music/track1.mp3',
          albumId: album.id,
          artistId: artist.id,
        });

        const response = await request(app.getHttpServer())
          .get(`/api/federation/albums/${album.id}`)
          .set('Authorization', `Bearer ${fedToken.token}`)
          .expect(200);

        expect(response.body.id).toBe(album.id);
        expect(response.body.name).toBe('Test Album');
        expect(response.body.tracks).toBeDefined();
        expect(Array.isArray(response.body.tracks)).toBe(true);
      });

      it('debería retornar 404 para álbum inexistente', async () => {
        const { user } = await createUserAndLogin(drizzle, app);
        const fedToken = await createAccessToken(drizzle, user.id, 'Servidor');

        return request(app.getHttpServer())
          .get('/api/federation/albums/00000000-0000-0000-0000-000000000000')
          .set('Authorization', `Bearer ${fedToken.token}`)
          .expect(404);
      });
    });

    describe('POST /api/federation/disconnect', () => {
      it('debería desconectar y revocar el token', async () => {
        const { user } = await createUserAndLogin(drizzle, app);
        const fedToken = await createAccessToken(drizzle, user.id, 'A desconectar');

        const response = await request(app.getHttpServer())
          .post('/api/federation/disconnect')
          .set('Authorization', `Bearer ${fedToken.token}`)
          .expect(201);

        expect(response.body.ok).toBe(true);

        // Verificar que el token está revocado
        const [updated] = await drizzle.db
          .select()
          .from(schema.federationAccessTokens)
          .where(require('drizzle-orm').eq(schema.federationAccessTokens.id, fedToken.id));

        expect(updated.isActive).toBe(false);
      });
    });
  });

  // ============================================
  // Connected Servers
  // ============================================

  describe('Connected Servers', () => {
    describe('GET /api/federation/servers', () => {
      it('debería listar servidores conectados del usuario', async () => {
        const { accessToken, user } = await createUserAndLogin(drizzle, app);

        // Crear un servidor conectado
        await createConnectedServer(drizzle, user.id, 'Servidor de Amigo');

        const response = await request(app.getHttpServer())
          .get('/api/federation/servers')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(1);
        expect(response.body[0].name).toBe('Servidor de Amigo');
      });
    });

    describe('DELETE /api/federation/servers/:id', () => {
      it('debería desconectar de un servidor', async () => {
        const { accessToken, user } = await createUserAndLogin(drizzle, app);
        const server = await createConnectedServer(drizzle, user.id, 'A desconectar');

        await request(app.getHttpServer())
          .delete(`/api/federation/servers/${server.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        // Verificar eliminación
        const remaining = await drizzle.db
          .select()
          .from(schema.connectedServers)
          .where(require('drizzle-orm').eq(schema.connectedServers.id, server.id));

        expect(remaining.length).toBe(0);
      });
    });
  });
});

// ============================================
// Helper Functions
// ============================================

async function cleanFederationTables(drizzle: DrizzleService): Promise<void> {
  try {
    await drizzle.client.query(`
      TRUNCATE TABLE
        album_import_queue,
        connected_servers,
        federation_access_tokens,
        federation_tokens
      RESTART IDENTITY CASCADE
    `);
  } catch {
    // Fallback
    await drizzle.db.delete(schema.albumImportQueue);
    await drizzle.db.delete(schema.connectedServers);
    await drizzle.db.delete(schema.federationAccessTokens);
    await drizzle.db.delete(schema.federationTokens);
  }
}

async function createInvitationToken(
  drizzle: DrizzleService,
  userId: string,
  name: string,
  expiresInDays = 7,
): Promise<{ id: string; token: string }> {
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const [result] = await drizzle.db
    .insert(schema.federationTokens)
    .values({
      createdByUserId: userId,
      token,
      name,
      expiresAt,
      maxUses: 1,
    })
    .returning({ id: schema.federationTokens.id, token: schema.federationTokens.token });

  return result;
}

async function createAccessToken(
  drizzle: DrizzleService,
  userId: string,
  serverName: string,
  isActive = true,
  permissions = { canBrowse: true, canStream: true, canDownload: false },
): Promise<{ id: string; token: string }> {
  const token = generateToken();

  const [result] = await drizzle.db
    .insert(schema.federationAccessTokens)
    .values({
      ownerId: userId,
      token,
      serverName,
      serverUrl: 'https://example.com',
      isActive,
      permissions,
    })
    .returning({
      id: schema.federationAccessTokens.id,
      token: schema.federationAccessTokens.token,
    });

  return result;
}

async function createConnectedServer(
  drizzle: DrizzleService,
  userId: string,
  name: string,
): Promise<{ id: string; name: string }> {
  const [result] = await drizzle.db
    .insert(schema.connectedServers)
    .values({
      userId,
      name,
      baseUrl: 'https://example.com',
      authToken: generateToken(),
      isActive: true,
    })
    .returning({ id: schema.connectedServers.id, name: schema.connectedServers.name });

  return result;
}

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
