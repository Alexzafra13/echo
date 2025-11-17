# 🚀 Quick Start: Sistema de Logs

## ⚡ Aplicar la Migración

```bash
cd /home/user/echo/server

# Generar cliente de Prisma
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma generate

# Aplicar migración
PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1 npx prisma migrate deploy
```

## 🔍 Ver Logs desde la API

```bash
# Ver logs de errores del scanner
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:4567/api/logs?category=scanner&level=error"

# Ver todos los logs críticos
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:4567/api/logs?level=critical"

# Ver estadísticas
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:4567/api/logs/stats"
```

## 🐛 Debuggear el Scanner

1. **Ejecutar un scan** desde el panel de admin
2. **Consultar los logs** de errores:
   ```bash
   GET /api/logs?category=scanner&level=error&limit=50
   ```
3. **Revisar los detalles** de cada log para ver:
   - Qué archivos están fallando
   - Por qué no se extraen metadatos
   - Si hay problemas de permisos

## 📊 Logs Clave del Scanner

- `🔵 INFO`: Scan iniciado / completado
- `🟡 WARNING`: Tracks sin metadatos básicos
- `🟠 ERROR`: Fallos al extraer metadatos de archivos
- `🔴 CRÍTICO`: Scan falló completamente

## 🎯 Próximos Pasos

1. Aplicar la migración (arriba)
2. Reiniciar el servidor
3. Ejecutar un scan
4. Ver logs en `/api/logs?category=scanner`
5. Identificar problemas en archivos específicos

---

📖 **Documentación completa**: Ver `LOGGING_SYSTEM.md`
