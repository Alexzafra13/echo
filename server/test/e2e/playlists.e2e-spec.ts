import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/infrastructure/persistence/prisma.service';

describe('Playlists E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userToken: string;
  let user2Token: string;
  let userId: string;
  let user2Id: string;
  let trackId: string;
  let track2Id: string;
  let artistId: string;
  let albumId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.setGlobalPrefix('api');

    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Crear usuario 1
    const user1Res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        username: 'user_playlists',
        email: 'user_playlists@test.com',
        password: 'User123!',
        name: 'User Playlists',
      });

    userToken = user1Res.body.accessToken;
    userId = user1Res.body.user.id;

    // Crear usuario 2
    const user2Res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        username: 'user2_playlists',
        email: 'user2_playlists@test.com',
        password: 'User123!',
        name: 'User 2 Playlists',
      });

    user2Token = user2Res.body.accessToken;
    user2Id = user2Res.body.user.id;

    // Crear artista de prueba
    const artist = await prisma.artist.create({
      data: {
        name: 'Test Artist Playlists',
        bio: 'Test bio',
      },
    });
    artistId = artist.id;

    // Crear álbum de prueba
    const album = await prisma.album.create({
      data: {
        title: 'Test Album Playlists',
        artistId: artistId,
        releaseDate: new Date('2024-01-01'),
      },
    });
    albumId = album.id;

    // Crear tracks de prueba
    const track1 = await prisma.track.create({
      data: {
        title: 'Test Track 1',
        artistId: artistId,
        albumId: albumId,
        duration: 180,
        trackNumber: 1,
        filePath: '/music/test1.mp3',
      },
    });
    trackId = track1.id;

    const track2 = await prisma.track.create({
      data: {
        title: 'Test Track 2',
        artistId: artistId,
        albumId: albumId,
        duration: 200,
        trackNumber: 2,
        filePath: '/music/test2.mp3',
      },
    });
    track2Id = track2.id;
  });

  afterAll(async () => {
    // Limpiar en orden correcto
    await prisma.playlistTrack.deleteMany();
    await prisma.playlist.deleteMany();
    await prisma.track.deleteMany();
    await prisma.album.deleteMany();
    await prisma.artist.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  afterEach(async () => {
    // Limpiar playlists después de cada test
    await prisma.playlistTrack.deleteMany();
    await prisma.playlist.deleteMany();
  });

  describe('POST /api/playlists', () => {
    it('debería crear una playlist privada', () => {
      return request(app.getHttpServer())
        .post('/api/playlists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'My Playlist',
          description: 'Test playlist',
          public: false,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.name).toBe('My Playlist');
          expect(res.body.description).toBe('Test playlist');
          expect(res.body.public).toBe(false);
          expect(res.body.ownerId).toBe(userId);
          expect(res.body.trackCount).toBe(0);
        });
    });

    it('debería crear una playlist pública', () => {
      return request(app.getHttpServer())
        .post('/api/playlists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Public Playlist',
          description: 'Public test playlist',
          public: true,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.public).toBe(true);
        });
    });

    it('debería rechazar sin autenticación', () => {
      return request(app.getHttpServer())
        .post('/api/playlists')
        .send({
          name: 'Test',
          public: false,
        })
        .expect(401);
    });

    it('debería validar nombre requerido', () => {
      return request(app.getHttpServer())
        .post('/api/playlists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          description: 'No name',
          public: false,
        })
        .expect(400);
    });
  });

  describe('GET /api/playlists/:id', () => {
    it('debería obtener una playlist por id', async () => {
      // Crear playlist
      const createRes = await request(app.getHttpServer())
        .post('/api/playlists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Test Playlist',
          description: 'Test',
          public: false,
        });

      const playlistId = createRes.body.id;

      return request(app.getHttpServer())
        .get(`/api/playlists/${playlistId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(playlistId);
          expect(res.body.name).toBe('Test Playlist');
        });
    });

    it('debería retornar 404 para playlist inexistente', () => {
      return request(app.getHttpServer())
        .get('/api/playlists/99999')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it('debería rechazar sin autenticación', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/playlists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Test', public: false });

      return request(app.getHttpServer())
        .get(`/api/playlists/${createRes.body.id}`)
        .expect(401);
    });
  });

  describe('GET /api/playlists', () => {
    it('debería listar playlists del usuario', async () => {
      // Crear 2 playlists para el usuario
      await request(app.getHttpServer())
        .post('/api/playlists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Playlist 1', public: false });

      await request(app.getHttpServer())
        .post('/api/playlists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Playlist 2', public: false });

      return request(app.getHttpServer())
        .get('/api/playlists')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.playlists).toHaveLength(2);
          expect(res.body.total).toBe(2);
        });
    });

    it('debería respetar paginación', async () => {
      // Crear 3 playlists
      for (let i = 1; i <= 3; i++) {
        await request(app.getHttpServer())
          .post('/api/playlists')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ name: `Playlist ${i}`, public: false });
      }

      // Primera página (2 items)
      const page1 = await request(app.getHttpServer())
        .get('/api/playlists?skip=0&take=2')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(page1.body.playlists).toHaveLength(2);
      expect(page1.body.total).toBe(3);

      // Segunda página (1 item)
      const page2 = await request(app.getHttpServer())
        .get('/api/playlists?skip=2&take=2')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(page2.body.playlists).toHaveLength(1);
      expect(page2.body.total).toBe(3);
    });

    it('solo debería mostrar playlists públicas si publicOnly=true', async () => {
      // User 1: 1 pública, 1 privada
      await request(app.getHttpServer())
        .post('/api/playlists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Public', public: true });

      await request(app.getHttpServer())
        .post('/api/playlists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Private', public: false });

      // User 2 solo debería ver la pública
      return request(app.getHttpServer())
        .get('/api/playlists?publicOnly=true')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.playlists).toHaveLength(1);
          expect(res.body.playlists[0].name).toBe('Public');
          expect(res.body.playlists[0].public).toBe(true);
        });
    });
  });

  describe('PATCH /api/playlists/:id', () => {
    it('debería actualizar una playlist', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/playlists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Original Name', public: false });

      const playlistId = createRes.body.id;

      return request(app.getHttpServer())
        .patch(`/api/playlists/${playlistId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Updated Name',
          description: 'Updated description',
          public: true,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('Updated Name');
          expect(res.body.description).toBe('Updated description');
          expect(res.body.public).toBe(true);
        });
    });

    it('debería rechazar actualización sin autenticación', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/playlists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Test', public: false });

      return request(app.getHttpServer())
        .patch(`/api/playlists/${createRes.body.id}`)
        .send({ name: 'Updated' })
        .expect(401);
    });
  });

  describe('DELETE /api/playlists/:id', () => {
    it('debería eliminar una playlist', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/playlists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'To Delete', public: false });

      const playlistId = createRes.body.id;

      await request(app.getHttpServer())
        .delete(`/api/playlists/${playlistId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });

      // Verificar que ya no existe
      return request(app.getHttpServer())
        .get(`/api/playlists/${playlistId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });
  });

  describe('POST /api/playlists/:id/tracks', () => {
    it('debería agregar un track a la playlist', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/playlists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Test Playlist', public: false });

      const playlistId = createRes.body.id;

      return request(app.getHttpServer())
        .post(`/api/playlists/${playlistId}/tracks`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ trackId: trackId })
        .expect(201)
        .expect((res) => {
          expect(res.body.playlistId).toBe(playlistId);
          expect(res.body.trackId).toBe(trackId);
          expect(res.body.trackOrder).toBeDefined();
        });
    });

    it('debería rechazar track duplicado', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/playlists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Test', public: false });

      const playlistId = createRes.body.id;

      // Agregar track primera vez
      await request(app.getHttpServer())
        .post(`/api/playlists/${playlistId}/tracks`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ trackId: trackId });

      // Intentar agregar de nuevo
      return request(app.getHttpServer())
        .post(`/api/playlists/${playlistId}/tracks`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ trackId: trackId })
        .expect(409);
    });
  });

  describe('GET /api/playlists/:id/tracks', () => {
    it('debería obtener tracks de la playlist', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/playlists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Test', public: false });

      const playlistId = createRes.body.id;

      // Agregar 2 tracks
      await request(app.getHttpServer())
        .post(`/api/playlists/${playlistId}/tracks`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ trackId: trackId });

      await request(app.getHttpServer())
        .post(`/api/playlists/${playlistId}/tracks`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ trackId: track2Id });

      return request(app.getHttpServer())
        .get(`/api/playlists/${playlistId}/tracks`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.tracks).toHaveLength(2);
          expect(res.body.playlistId).toBe(playlistId);
        });
    });
  });

  describe('DELETE /api/playlists/:id/tracks/:trackId', () => {
    it('debería remover un track de la playlist', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/playlists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Test', public: false });

      const playlistId = createRes.body.id;

      // Agregar track
      await request(app.getHttpServer())
        .post(`/api/playlists/${playlistId}/tracks`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ trackId: trackId });

      // Remover track
      await request(app.getHttpServer())
        .delete(`/api/playlists/${playlistId}/tracks/${trackId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });

      // Verificar que ya no está
      return request(app.getHttpServer())
        .get(`/api/playlists/${playlistId}/tracks`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.tracks).toHaveLength(0);
        });
    });
  });

  describe('POST /api/playlists/:id/tracks/reorder', () => {
    it('debería reordenar tracks de la playlist', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/playlists')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Test', public: false });

      const playlistId = createRes.body.id;

      // Agregar 2 tracks
      await request(app.getHttpServer())
        .post(`/api/playlists/${playlistId}/tracks`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ trackId: trackId });

      await request(app.getHttpServer())
        .post(`/api/playlists/${playlistId}/tracks`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ trackId: track2Id });

      // Reordenar: invertir el orden
      return request(app.getHttpServer())
        .post(`/api/playlists/${playlistId}/tracks/reorder`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          trackOrders: [
            { trackId: track2Id, trackOrder: 0 },
            { trackId: trackId, trackOrder: 1 },
          ],
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.playlistId).toBe(playlistId);
        });
    });
  });
});
