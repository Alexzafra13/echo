# Troubleshooting Guide

Este documento contiene soluciones a problemas comunes durante el desarrollo y despliegue de Echo Music Server.

## Problemas con Prisma Client

### Error: "Property 'album' does not exist on type 'PrismaService'"

**Síntomas:**
- Errores de TypeScript al compilar indicando que las tablas de Prisma no existen
- Error 500 al intentar acceder a las rutas de imágenes (`/api/images/...`)
- El servidor falla al iniciar o crashea al manejar ciertas peticiones

**Causa:**
El cliente de Prisma no se generó correctamente, generalmente debido a problemas de red al descargar los binarios de Prisma.

**Solución:**

1. **Detén el servidor** si está corriendo (`Ctrl+C`)

2. **Genera el cliente de Prisma forzando la omisión de checksums:**

   ```bash
   # En Windows (PowerShell)
   cd server
   pnpm db:generate:force

   # O manualmente:
   $env:PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
   pnpm prisma generate
   ```

   ```bash
   # En Linux/Mac
   cd server
   pnpm db:generate:force

   # O manualmente:
   PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 pnpm prisma generate
   ```

3. **Reinstala las dependencias** (opcional, si el problema persiste):

   ```bash
   # Desde el directorio server
   rm -rf node_modules
   pnpm install
   pnpm db:generate:force
   ```

4. **Recompila el servidor:**

   ```bash
   pnpm build
   ```

5. **Reinicia el servidor:**

   ```bash
   pnpm dev
   ```

## Error: "PinoLogger is marked as a scoped provider"

**Síntomas:**
- El servidor crashea al iniciar con el error:
  ```
  ERROR: PinoLogger is marked as a scoped provider. Request and transient-scoped
  providers can't be used in combination with "get()" method. Please, use "resolve()" instead.
  ```

**Causa:**
Este error ocurría en versiones anteriores donde se intentaba obtener `PinoLogger` con `app.get()` en `main.ts`.

**Solución:**
Este problema fue resuelto en el commit `469338c`. Asegúrate de estar usando la última versión del código donde:
- `HttpExceptionFilter` está registrado como proveedor global en `app.module.ts`
- No se intenta obtener `PinoLogger` manualmente en `main.ts`

Si aún experimentas este error:
1. Haz pull de los últimos cambios: `git pull origin main`
2. Verifica que `app.module.ts` incluya `HttpExceptionFilter` en los providers con `APP_FILTER`
3. Verifica que `main.ts` NO incluya `app.useGlobalFilters(new HttpExceptionFilter(...))`

## Problemas con Docker

### Redis no está disponible

**Síntomas:**
- Errores de conexión a Redis
- Features de caché no funcionan

**Solución:**
```bash
# Asegúrate de que Docker esté corriendo
docker ps

# Levanta los servicios de desarrollo
pnpm docker:dev

# Verifica que Redis esté corriendo
docker ps | grep redis
```

### Base de datos no disponible

**Solución:**
```bash
# Verifica el estado de PostgreSQL
docker ps | grep postgres

# Si no está corriendo, inicia los servicios
pnpm docker:dev

# Ejecuta las migraciones
cd server
pnpm db:migrate
```

## Problemas de Compilación

### Error: "Cannot find module '@features/...'"

**Causa:**
Paths de TypeScript no están configurados correctamente.

**Solución:**
Verifica que `tsconfig.json` incluya los paths correctos:

```json
{
  "compilerOptions": {
    "paths": {
      "@app/*": ["./src/*"],
      "@features/*": ["./src/features/*"],
      "@infrastructure/*": ["./src/infrastructure/*"],
      "@shared/*": ["./src/shared/*"]
    }
  }
}
```

## Problemas de Performance

### Las imágenes se cargan lentamente

**Síntomas:**
- Las carátulas de álbumes tardan mucho en cargar
- Los avatars de usuario tienen latencia alta

**Solución:**
1. **Verifica que el caché de Redis esté funcionando:**
   ```bash
   docker exec -it echo-redis redis-cli
   # En la CLI de Redis:
   > KEYS *
   > INFO stats
   ```

2. **Asegúrate de que las imágenes estén en formato optimizado:**
   - Las imágenes deben estar en JPEG o WebP
   - Tamaño recomendado para covers: 500x500px o 1000x1000px
   - Tamaño recomendado para avatares: 200x200px

3. **Verifica los headers de caché en el navegador:**
   - Abre DevTools (F12)
   - Ve a la pestaña Network
   - Busca peticiones a `/api/images/...`
   - Verifica que los headers incluyan `ETag` y `Cache-Control`

## Problemas con Autenticación

### Token JWT inválido o expirado

**Solución:**
1. Cierra sesión y vuelve a iniciar sesión
2. Verifica que `JWT_SECRET` esté configurado en `.env`
3. Si el problema persiste, regenera el secret:
   ```bash
   # Genera un nuevo secret
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   # Actualiza JWT_SECRET en .env con el nuevo valor
   ```

## Obtener Ayuda

Si ninguna de estas soluciones resuelve tu problema:

1. **Revisa los logs del servidor:**
   ```bash
   # Los logs mostrarán información detallada sobre errores
   pnpm dev
   ```

2. **Verifica el estado de los servicios:**
   ```bash
   docker ps
   docker logs echo-postgres
   docker logs echo-redis
   ```

3. **Limpia completamente y reinicia:**
   ```bash
   # Detén todos los servicios
   pnpm docker:dev:down
   cd server

   # Limpia dependencias y build
   rm -rf node_modules dist

   # Reinstala
   pnpm install

   # Levanta servicios
   cd ..
   pnpm docker:dev

   # Regenera Prisma y construye
   cd server
   pnpm db:generate:force
   pnpm build

   # Inicia el servidor
   pnpm dev
   ```

4. **Reporta el issue:**
   - Incluye los logs completos del error
   - Indica tu sistema operativo
   - Incluye las versiones de Node.js, pnpm, y Docker
   - Describe los pasos que realizaste antes del error
