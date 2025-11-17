# Test Factories

Este directorio contiene factories para crear instancias de entidades de dominio en tests, eliminando código duplicado y mejorando la mantenibilidad.

## 🎯 Objetivo

Reducir las **3000+ líneas de código duplicado** en tests que crean las mismas entidades una y otra vez.

## 📦 Factories Disponibles

### UserFactory

Crea usuarios de test con valores por defecto razonables.

```typescript
import { UserFactory } from 'test/factories';

// Usuario básico
const user = UserFactory.create();

// Usuario con propiedades personalizadas
const customUser = UserFactory.create({
  name: 'Juan Pérez',
  email: 'juan@example.com',
  isAdmin: true
});

// Admin predefinido
const admin = UserFactory.createAdmin();

// System admin (primer admin creado)
const sysAdmin = UserFactory.createSystemAdmin();

// Usuario inactivo
const inactive = UserFactory.createInactive();

// Múltiples usuarios
const users = UserFactory.createMany(10);

// Múltiples usuarios con personalización
const customUsers = UserFactory.createMany(5, (i) => ({
  name: `User ${i}`,
  email: `user${i}@test.com`
}));
```

### TrackFactory

Crea tracks de test.

```typescript
import { TrackFactory } from 'test/factories';

// Track básico
const track = TrackFactory.create();

// Track personalizado
const customTrack = TrackFactory.create({
  title: 'Bohemian Rhapsody',
  duration: 355,
  artistId: 'queen-id'
});

// Múltiples tracks
const tracks = TrackFactory.createMany(10);
```

### ArtistFactory

Crea artistas de test.

```typescript
import { ArtistFactory } from 'test/factories';

// Artista básico
const artist = ArtistFactory.create();

// Artista personalizado
const customArtist = ArtistFactory.create({
  name: 'The Beatles',
  albumCount: 13,
  songCount: 213
});

// Múltiples artistas
const artists = ArtistFactory.createMany(5);
```

### AlbumFactory

Crea álbumes de test.

```typescript
import { AlbumFactory } from 'test/factories';

// Álbum básico
const album = AlbumFactory.create();

// Álbum personalizado
const customAlbum = AlbumFactory.create({
  title: 'Abbey Road',
  artistId: 'beatles-id',
  releaseDate: new Date('1969-09-26')
});

// Múltiples álbumes
const albums = AlbumFactory.createMany(3);
```

### PlaylistFactory

Crea playlists de test.

```typescript
import { PlaylistFactory } from 'test/factories';

// Playlist básica
const playlist = PlaylistFactory.create();

// Playlist personalizada
const customPlaylist = PlaylistFactory.create({
  name: 'My Favorites',
  ownerId: 'user-456',
  songCount: 25
});

// Playlist pública
const publicPlaylist = PlaylistFactory.createPublic();

// Múltiples playlists
const playlists = PlaylistFactory.createMany(5);
```

## 📝 Ejemplo de Refactoring

### Antes (código duplicado)

```typescript
it('debería actualizar el perfil', async () => {
  const existingUser = User.reconstruct({
    id: 'user-123',
    username: 'testuser',
    email: 'test@test.com',
    passwordHash: '$2b$12$hashed',
    name: 'Test User',
    isActive: true,
    isAdmin: false,
    mustChangePassword: false,
    theme: 'dark',
    language: 'es',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // ... resto del test
});

it('debería cambiar el tema', async () => {
  const existingUser = User.reconstruct({
    id: 'user-123',
    username: 'testuser',
    email: 'test@test.com',
    passwordHash: '$2b$12$hashed',
    name: 'Test User',
    isActive: true,
    isAdmin: false,
    mustChangePassword: false,
    theme: 'dark',
    language: 'es',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // ... resto del test
});
```

### Después (usando factory)

```typescript
import { UserFactory } from 'test/factories';

it('debería actualizar el perfil', async () => {
  const existingUser = UserFactory.create();

  // ... resto del test
});

it('debería cambiar el tema', async () => {
  const existingUser = UserFactory.create();

  // ... resto del test
});
```

**Resultado**: 24 líneas → 2 líneas (reducción del 92%)

## 🔧 Configuración

Las factories ya están configuradas en `jest.config.js` con el alias:

```javascript
moduleNameMapper: {
  '^test/(.*)$': '<rootDir>/../test/$1',
}
```

No se requiere configuración adicional.

## 📊 Impacto Esperado

- **25+ archivos** mejorados
- **3000+ líneas** de código eliminadas
- **Mantenibilidad** significativamente mejorada
- **Consistencia** en todos los tests

## 🚀 Próximos Pasos

1. Refactorizar tests existentes para usar las factories
2. Agregar más factories según sea necesario (PlaylistTrack, LibraryScan, etc.)
3. Documentar patrones de uso específicos

## 📚 Referencias

- [Test Data Builders Pattern](https://www.javacodegeeks.com/2018/11/test-data-builders-pattern.html)
- [Object Mother Pattern](https://martinfowler.com/bliki/ObjectMother.html)
