# 📊 Sistema de Logging de Echo

Sistema centralizado de logging con niveles de severidad, categorización y persistencia en base de datos.

## 🎯 Características

- ✅ **5 niveles de severidad**: Critical, Error, Warning, Info, Debug
- ✅ **Categorización**: Scanner, Metadata, Auth, API, Storage, etc.
- ✅ **Doble salida**: Consola (siempre) + Base de datos (logs importantes)
- ✅ **Metadata enriquecida**: userId, entityId, requestId, IP, User-Agent, etc.
- ✅ **API REST**: Consultar logs desde el panel de admin
- ✅ **Estadísticas**: Contadores por nivel y categoría
- ✅ **Limpieza automática**: Logs mayores a N días

---

## 🚀 Uso Básico

### 1. Inyectar el LogService

```typescript
import { LogService, LogCategory } from '@features/logs/application/log.service';

@Injectable()
export class MiServicio {
  constructor(private readonly logService: LogService) {}
}
```

### 2. Logs Críticos (Se guardan en BD + Consola)

```typescript
// ❌ Error crítico que requiere atención inmediata
await this.logService.critical(
  LogCategory.SCANNER,
  'Scan falló completamente',
  {
    entityId: scanId,
    entityType: 'scan',
    details: JSON.stringify({ errorMessage: error.message }),
  },
  error // Error object opcional
);
```

### 3. Logs de Error (Se guardan en BD + Consola)

```typescript
// ⚠️ Error que afecta funcionalidad pero no es crítico
await this.logService.error(
  LogCategory.METADATA,
  'Fallo al descargar imagen de artista',
  {
    entityId: artistId,
    entityType: 'artist',
    details: JSON.stringify({ url, statusCode: 404 }),
  }
);
```

### 4. Logs de Warning (Se guardan en BD + Consola)

```typescript
// ⚡ Advertencia que no bloquea operación
await this.logService.warning(
  LogCategory.SCANNER,
  'Track sin metadatos básicos',
  {
    details: JSON.stringify({
      filePath,
      fileName: path.basename(filePath),
    }),
  }
);
```

### 5. Logs Informativos (Solo consola)

```typescript
// ℹ️ Información general
await this.logService.info(
  LogCategory.SCANNER,
  'Scan iniciado exitosamente',
  {
    entityId: scanId,
    entityType: 'scan',
    details: JSON.stringify({ totalFiles: 100 }),
  }
);
```

### 6. Logs de Debug (Solo consola)

```typescript
// 🐛 Información de debugging
await this.logService.debug(
  LogCategory.CACHE,
  'Cache hit for album',
  {
    entityId: albumId,
    details: JSON.stringify({ cacheKey }),
  }
);
```

---

## 📂 Categorías Disponibles

```typescript
export enum LogCategory {
  SCANNER = 'scanner',         // Escaneo de biblioteca
  METADATA = 'metadata',       // Enriquecimiento de metadata
  AUTH = 'auth',              // Autenticación
  API = 'api',                // Requests HTTP
  STORAGE = 'storage',        // Almacenamiento
  CLEANUP = 'cleanup',        // Limpieza de huérfanos
  STREAM = 'stream',          // Streaming de audio
  DATABASE = 'database',      // Operaciones de BD
  CACHE = 'cache',            // Caché
  EXTERNAL_API = 'external',  // APIs externas
}
```

---

## 🔍 API REST (Solo Administradores)

### GET /api/logs

Obtener logs con filtros:

```bash
# Todos los logs críticos de las últimas 24 horas
GET /api/logs?level=critical&startDate=2025-11-16T00:00:00Z

# Logs del scanner con errores
GET /api/logs?category=scanner&level=error

# Logs de un scan específico
GET /api/logs?entityId=abc-123&entityType=scan

# Paginación
GET /api/logs?limit=50&offset=100
```

**Respuesta:**
```json
{
  "logs": [
    {
      "id": "log-123",
      "level": "error",
      "category": "scanner",
      "message": "Fallo al extraer metadatos del archivo",
      "details": "{\"filePath\":\"/music/song.mp3\"}",
      "entityId": "scan-456",
      "entityType": "scan",
      "stackTrace": null,
      "createdAt": "2025-11-17T10:30:00Z"
    }
  ],
  "total": 150,
  "limit": 100,
  "offset": 0
}
```

### GET /api/logs/stats

Obtener estadísticas de logs:

```bash
GET /api/logs/stats?startDate=2025-11-01T00:00:00Z&endDate=2025-11-30T23:59:59Z
```

**Respuesta:**
```json
{
  "totalLogs": 1234,
  "byLevel": {
    "critical": 5,
    "error": 45,
    "warning": 150,
    "info": 800,
    "debug": 234
  },
  "byCategory": {
    "scanner": 500,
    "metadata": 300,
    "auth": 100,
    "api": 200,
    "storage": 134
  }
}
```

### GET /api/logs/categories

Listar categorías disponibles:

```json
{
  "categories": ["scanner", "metadata", "auth", "api", "storage", ...]
}
```

### GET /api/logs/levels

Listar niveles de severidad disponibles:

```json
{
  "levels": ["critical", "error", "warning", "info", "debug"]
}
```

---

## 📊 Estructura de Base de Datos

```sql
CREATE TABLE system_logs (
  id              TEXT PRIMARY KEY,
  level           VARCHAR(20) NOT NULL,     -- 'critical', 'error', 'warning', 'info', 'debug'
  category        VARCHAR(50) NOT NULL,     -- 'scanner', 'metadata', etc.
  message         TEXT NOT NULL,
  details         TEXT,                     -- JSON con info adicional
  user_id         VARCHAR(36),              -- Usuario relacionado
  entity_id       VARCHAR(36),              -- ID de entidad (scan, artist, album, etc.)
  entity_type     VARCHAR(20),              -- 'scan', 'artist', 'album', 'track'
  stack_trace     TEXT,                     -- Stack trace de errores
  request_id      VARCHAR(36),              -- Para tracking de requests
  ip_address      VARCHAR(45),              -- IPv4 o IPv6
  user_agent      VARCHAR(512),
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices optimizados
CREATE INDEX ON system_logs(level, created_at);
CREATE INDEX ON system_logs(category, created_at);
CREATE INDEX ON system_logs(user_id);
CREATE INDEX ON system_logs(request_id);
CREATE INDEX ON system_logs(created_at);
```

---

## 🧹 Limpieza de Logs Antiguos

El sistema puede limpiar logs antiguos automáticamente:

```typescript
// Eliminar logs mayores a 30 días (por defecto)
const deletedCount = await this.logService.cleanupOldLogs(30);
console.log(`Se eliminaron ${deletedCount} logs antiguos`);

// Eliminar logs mayores a 7 días
const deletedCount = await this.logService.cleanupOldLogs(7);
```

**Recomendación**: Crear un cron job para ejecutar esto semanalmente.

---

## 📈 Casos de Uso Implementados

### 1. Debugging del Scanner

Todos los errores del scanner ahora se logean:

```typescript
// ❌ Error extrayendo metadatos
if (!metadata) {
  await this.logService.error(
    LogCategory.SCANNER,
    'Fallo al extraer metadatos del archivo',
    { details: JSON.stringify({ filePath, fileExtension }) }
  );
}

// ⚠️ Track sin metadatos
if (!metadata.title && !metadata.artist) {
  await this.logService.warning(
    LogCategory.SCANNER,
    'Track sin metadatos básicos',
    { details: JSON.stringify({ filePath, fileName }) }
  );
}

// ✅ Scan completado
await this.logService.info(
  LogCategory.SCANNER,
  'Scan completado exitosamente',
  {
    entityId: scanId,
    details: JSON.stringify({
      totalFiles,
      tracksCreated,
      albumsCreated,
      errors
    })
  }
);
```

### 2. Consultar Logs desde el Panel de Admin

```typescript
// Frontend puede hacer queries a la API
const response = await fetch('/api/logs?category=scanner&level=error');
const { logs, total } = await response.json();

// Mostrar en tabla con filtros
logs.forEach(log => {
  console.log(`[${log.level}] ${log.message}`);
  console.log(`Detalles: ${log.details}`);
});
```

---

## 🔧 Próximos Pasos

### Para tener el sistema completo:

1. **✅ HECHO**: Migración de BD (`20251117000000_add_system_logs/migration.sql`)
2. **✅ HECHO**: LogService con niveles y categorías
3. **✅ HECHO**: Endpoint API REST para logs
4. **✅ HECHO**: Integración en Scanner

### Pendiente:

5. **Aplicar migración**: Ejecutar `npx prisma migrate deploy` cuando haya conectividad
6. **Panel de Admin**: Crear componente React para visualizar logs
7. **WebSocket (opcional)**: Logs en tiempo real durante scans
8. **Cron de limpieza**: Automatizar cleanup de logs antiguos

---

## 🎨 Panel de Admin (Mockup)

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Logs del Sistema                              [Actualizar]│
├─────────────────────────────────────────────────────────────┤
│ Filtros:                                                     │
│ Nivel: [Todos ▼] Categoría: [Todos ▼] Fecha: [Últimas 24h ▼]│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 🔴 CRÍTICO | Scanner | Scan falló completamente             │
│    2025-11-17 10:30:15 | scanId: abc-123                    │
│    Detalles: {"errorMessage": "ENOENT: no such file"}       │
│    [Ver stack trace]                                         │
│                                                              │
│ 🟠 ERROR | Metadata | Fallo al descargar imagen             │
│    2025-11-17 10:28:30 | artistId: xyz-789                  │
│    Detalles: {"url": "...", "statusCode": 404}              │
│                                                              │
│ 🟡 WARNING | Scanner | Track sin metadatos básicos          │
│    2025-11-17 10:25:00 | filePath: /music/song.mp3          │
│                                                              │
│ 🔵 INFO | Scanner | Scan iniciado exitosamente              │
│    2025-11-17 10:20:00 | scanId: abc-123                    │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ Mostrando 1-10 de 150        [< Anterior | Siguiente >]     │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Notas Importantes

1. **Solo logs importantes en BD**: Critical, Error y Warning se guardan en BD. Info y Debug solo van a consola.

2. **Performance**: El logging es asíncrono y no bloquea operaciones críticas.

3. **Seguridad**: Endpoint `/api/logs` requiere autenticación + rol de admin.

4. **Mantenimiento**: Ejecutar `cleanupOldLogs()` regularmente para evitar tabla gigante.

5. **Debugging**: Durante desarrollo, los logs de Debug son útiles. En producción, usar solo Warning+.

---

## 🐛 Debugging del Scanner

Para investigar el problema "539 archivos, 0 tracks, 0 albums":

1. Ejecutar un scan
2. Consultar los logs: `GET /api/logs?category=scanner&level=error`
3. Ver qué archivos están fallando en extracción de metadatos
4. Verificar si son problemas de:
   - Formatos no soportados
   - Tags ID3 corruptos
   - Permisos de lectura
   - Errores de encoding

---

¡Sistema de logging implementado! 🎉
