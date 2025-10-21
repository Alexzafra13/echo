---

## Ejecutar Tests

### Comandos Disponibles
```bash
# Ejecutar TODOS los tests (unit + integration en paralelo)
pnpm test

# Tests en modo watch (re-ejecuta al guardar archivos)
pnpm test:watch

# Tests con reporte de coverage
pnpm test:cov

# Debug de un test específico (con breakpoints)
pnpm test:debug

# Ver coverage en el navegador
pnpm test:cov
# Luego abre: coverage/lcov-report/index.html
```

### Ejemplos de Uso
```bash
# Ejecutar solo tests de un archivo específico
pnpm test user.repository.spec.ts

# Ejecutar tests que coincidan con un patrón
pnpm test -- --testNamePattern="debería crear"

# Ejecutar tests en modo verbose (más detalles)
pnpm test -- --verbose

# Ejecutar con logs de console.log visibles
pnpm test -- --silent=false
```

---

## Estructura de Tests

### Convenciones de Nomenclatura
```
src/
├── features/
│   └── auth/
│       ├── domain/
│       │   ├── entities/
│       │   │   ├── user.entity.ts
│       │   │   └── user.entity.spec.ts          ← Unit test
│       │   └── use-cases/
│       │       ├── login/
│       │       │   ├── login.use-case.ts
│       │       │   └── login.use-case.spec.ts   ← Unit test
│       └── infrastructure/
│           └── persistence/
│               ├── user.repository.ts
│               └── user.repository.spec.ts       ← Integration test
```

**Regla simple:**
- Archivo de código: `nombre.ts`
- Archivo de test: `nombre.spec.ts` (mismo directorio)
- Integration test: `*.repository.spec.ts`
- Unit test: Todo lo demás `*.spec.ts`

### Anatomía de un Unit Test
```typescript
// src/features/auth/domain/use-cases/login/login.use-case.spec.ts
import { LoginUseCase } from './login.use-case';
import { IUserRepository } from '../../ports/out/user-repository.port';
import { IPasswordService } from '../../ports/out/password-service.port';

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockPasswordService: jest.Mocked<IPasswordService>;

  beforeEach(() => {
    // ✅ Crear mocks de dependencias
    mockUserRepository = {
      findByUsername: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as jest.Mocked<IUserRepository>;

    mockPasswordService = {
      hash: jest.fn(),
      compare: jest.fn(),
    } as jest.Mocked<IPasswordService>;

    // ✅ Inyectar mocks en el use case
    useCase = new LoginUseCase(mockUserRepository, mockPasswordService);
  });

  describe('execute', () => {
    it('debería loguear un usuario válido', async () => {
      // Arrange (preparar datos)
      const input = { username: 'juan', password: 'Pass123!' };
      const mockUser = { 
        id: '123', 
        username: 'juan', 
        passwordHash: 'hashed',
        isActive: true 
      };

      mockUserRepository.findByUsername.mockResolvedValue(mockUser);
      mockPasswordService.compare.mockResolvedValue(true);

      // Act (ejecutar acción)
      const result = await useCase.execute(input);

      // Assert (verificar resultado)
      expect(result.accessToken).toBeDefined();
      expect(mockUserRepository.findByUsername).toHaveBeenCalledWith('juan');
      expect(mockPasswordService.compare).toHaveBeenCalledWith('Pass123!', 'hashed');
    });

    it('debería lanzar error si usuario no existe', async () => {
      // Arrange
      mockUserRepository.findByUsername.mockResolvedValue(null);

      // Act & Assert
      await expect(
        useCase.execute({ username: 'noexiste', password: 'pass' })
      ).rejects.toThrow('Invalid credentials');
    });
  });
});
```

### Anatomía de un Integration Test
```typescript
// src/features/auth/infrastructure/persistence/user.repository.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@infrastructure/persistence/prisma.service';
import { PrismaModule } from '@infrastructure/persistence/prisma.module';
import { PrismaUserRepository } from './user.repository';
import { User } from '../../domain/entities/user.entity';

describe('PrismaUserRepository', () => {
  let repository: PrismaUserRepository;
  let prisma: PrismaService;
  let module: TestingModule;

  beforeAll(async () => {
    // ✅ Crear módulo de testing con dependencias reales
    module = await Test.createTestingModule({
      imports: [PrismaModule],  // ← BD real, no mock
      providers: [PrismaUserRepository],
    }).compile();

    repository = module.get<PrismaUserRepository>(PrismaUserRepository);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(async () => {
    // ✅ Limpiar datos después de cada test
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    // ✅ Cerrar conexión
    await module.close();
  });

  describe('create', () => {
    it('debería crear un usuario en la BD', async () => {
      // Arrange
      const user = User.create({
        username: 'juan',
        email: 'juan@test.com',
        passwordHash: '$2b$12$hashed',
        isActive: true,
        isAdmin: false,
      });

      // Act
      const saved = await repository.create(user);

      // Assert
      expect(saved.id).toBeDefined();
      expect(saved.username).toBe('juan');

      // ✅ Verificar que realmente está en BD
      const inDb = await prisma.user.findUnique({
        where: { id: saved.id },
      });
      expect(inDb).toBeDefined();
      expect(inDb?.username).toBe('juan');
    });
  });
});
```

---

## Mejores Prácticas

### ✅ DO (Hacer)

1. **Nombrar tests descriptivamente**
```typescript
   // ✅ BUENO
   it('debería retornar error 401 si la contraseña es incorrecta', ...)
   
   // ❌ MALO
   it('test login', ...)
```

2. **Seguir patrón AAA (Arrange-Act-Assert)**
```typescript
   it('debería crear usuario', async () => {
     // Arrange: preparar datos
     const user = { username: 'test', password: 'pass' };
     
     // Act: ejecutar acción
     const result = await createUser(user);
     
     // Assert: verificar resultado
     expect(result.id).toBeDefined();
   });
```

3. **Limpiar datos en afterEach (integration tests)**
```typescript
   afterEach(async () => {
     await prisma.user.deleteMany();
     await prisma.playlist.deleteMany();
   });
```

4. **Usar mocks en unit tests, BD real en integration**
```typescript
   // Unit test: Mock repository
   const mockRepo = { create: jest.fn() };
   
   // Integration test: Real repository + BD
   const repo = new PrismaUserRepository(prisma);
```

5. **Testear casos edge y errores**
```typescript
   it('debería lanzar error si username está vacío', ...);
   it('debería manejar usuarios sin email', ...);
   it('debería retornar null si no encuentra el registro', ...);
```

### ❌ DON'T (No hacer)

1. **No usar datos hardcodeados de producción**
```typescript
   // ❌ MALO
   const userId = 'real-prod-user-id-123';
   
   // ✅ BUENO
   const userId = 'test-user-' + Date.now();
```

2. **No dejar tests que dependen del orden de ejecución**
```typescript
   // ❌ MALO: Test 2 depende de que Test 1 se ejecute primero
   it('test 1: crear usuario', ...);
   it('test 2: actualizar usuario creado en test 1', ...);
   
   // ✅ BUENO: Cada test es independiente
   it('debería actualizar usuario', async () => {
     const user = await createTestUser(); // ← Crea lo que necesita
     await updateUser(user.id, { name: 'New Name' });
   });
```

3. **No usar sleep/timeout para esperar operaciones async**
```typescript
   // ❌ MALO
   await someAsyncOperation();
   await new Promise(resolve => setTimeout(resolve, 1000));
   
   // ✅ BUENO
   await someAsyncOperation();
   // Jest espera automáticamente a que se resuelvan las promesas
```

4. **No testear implementación, testear comportamiento**
```typescript
   // ❌ MALO: Testea implementación interna
   expect(service['privateMethod']).toHaveBeenCalled();
   
   // ✅ BUENO: Testea comportamiento público
   const result = await service.publicMethod();
   expect(result).toBe(expectedValue);
```

5. **No hacer tests gigantes que testean todo**
```typescript
   // ❌ MALO: Un test que verifica 10 cosas
   it('debería hacer todo', async () => {
     // 100 líneas testeando múltiples casos
   });
   
   // ✅ BUENO: Tests pequeños y específicos
   it('debería crear usuario', ...);
   it('debería validar email', ...);
   it('debería hashear password', ...);
```

---

## Troubleshooting

### Tests fallan con "Authentication failed"

**Causa:** Las variables de entorno no están configuradas correctamente.

**Solución:**
```bash
# 1. Verificar que .env tiene la password correcta
cat .env | grep DATABASE_URL
# Debe mostrar: DATABASE_URL="postgresql://music_admin:music_password@localhost:5432/music_server"

# 2. Verificar que docker-compose.yml coincide
cat docker-compose.yml | grep POSTGRES_PASSWORD
# Debe mostrar: POSTGRES_PASSWORD: music_password

# 3. Regenerar Prisma Client
pnpm db:generate

# 4. Reintentar
pnpm test
```

### Tests fallan aleatoriamente (race conditions)

**Causa:** Múltiples workers usando la misma BD.

**Solución:**
```bash
# 1. Verificar que existen las 4 BDs de test
docker exec -it music-server-db psql -U music_admin -d postgres -c "\l"

# 2. Si faltan, recrearlas
docker-compose down -v
docker-compose up -d
pnpm test:migrate

# 3. Verificar jest.config.js
# Debe tener: maxWorkers: 4
# Debe tener: setupFilesAfterEnv: ['<rootDir>/../test/setup-test-db.ts']
```

### "Cannot find module" en tests

**Causa:** Path aliases no configurados en Jest.

**Solución:**
```javascript
// jest.config.js debe tener:
moduleNameMapper: {
  '^@config/(.*)$': '<rootDir>/config/$1',
  '^@shared/(.*)$': '<rootDir>/shared/$1',
  '^@infrastructure/(.*)$': '<rootDir>/infrastructure/$1',
  '^@features/(.*)$': '<rootDir>/features/$1',
}
```

### Tests muy lentos

**Síntomas:** >10 segundos para ejecutar todos los tests.

**Solución:**
```bash
# 1. Verificar que maxWorkers está configurado
# jest.config.js: maxWorkers: 4

# 2. Verificar que las BDs de test existen
docker exec -it music-server-db psql -U music_admin -d postgres -c "\l"

# 3. Verificar que no hay --runInBand en package.json scripts
cat package.json | grep "test\":"
# NO debe tener --runInBand (fuerza ejecución serial)
```

### Docker no crea las BDs de test

**Causa:** Script no se ejecutó en inicialización.

**Solución:**
```bash
# 1. Verificar que el script existe y tiene permisos
ls -la scripts/docker/init-test-dbs.sh
chmod +x scripts/docker/init-test-dbs.sh

# 2. Verificar contenido del script
cat scripts/docker/init-test-dbs.sh

# 3. Recrear contenedor desde cero (volumen vacío = script se ejecuta)
docker-compose down -v
docker volume rm music-server-backend_postgres_data
docker-compose up -d

# 4. Ver logs para confirmar ejecución
docker-compose logs postgres | grep "Creando"
```

---

## Archivos Clave

### Configuración

| Archivo | Propósito |
|---------|-----------|
| `jest.config.js` | Configuración de Jest (workers, paths, coverage) |
| `test/setup-test-db.ts` | Asigna BD según worker ID |
| `scripts/docker/init-test-dbs.sh` | Crea las 4 BDs de test al iniciar Docker |
| `scripts/database/migrate-test-dbs.sh` | Aplica migraciones a las 4 BDs |

### Verificación Rápida
```bash
# ¿Docker corriendo?
docker ps | grep music-server

# ¿BDs creadas?
docker exec -it music-server-db psql -U music_admin -d postgres -c "\l"

# ¿Migraciones aplicadas?
docker exec -it music-server-db psql -U music_admin -d music_server_test_0 -c "\dt"

# ¿Tests funcionando?
pnpm test
```

---

## Referencias

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Prisma Testing](https://www.prisma.io/docs/guides/testing)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

**Última actualización:** Octubre 2025  
**Versión:** 1.0.0