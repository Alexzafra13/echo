# 🚀 Scripts de Instalación y Configuración

Scripts automatizados para configurar el proyecto Echo en diferentes plataformas.

## 📋 Tabla de Contenidos

- [Setup Inicial](#setup-inicial)
- [Uso en Windows](#uso-en-windows)
- [Uso en Linux/macOS](#uso-en-linuxmacos)
- [Opciones Disponibles](#opciones-disponibles)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Setup Inicial

Scripts que automatizan el proceso de instalación inicial del proyecto:

1. ✅ Verificar requisitos (Node.js, pnpm, Docker)
2. ✅ Instalar dependencias del backend
3. ✅ Configurar variables de entorno (.env)
4. ✅ Levantar servicios Docker (PostgreSQL + Redis)
5. ✅ Generar cliente Prisma
6. ✅ Ejecutar migraciones de base de datos
7. ✅ Instalar dependencias del frontend (opcional)

---

## 💻 Uso en Windows

### Opción 1: Git Bash (Recomendado)

```bash
# Instalación completa
pnpm setup

# O directamente:
./scripts/setup.sh
```

### Opción 2: PowerShell

```powershell
# Instalación completa
.\scripts\setup.ps1

# Con opciones
.\scripts\setup.ps1 -SkipFrontend
```

### Opción 3: CMD (a través de pnpm)

```cmd
pnpm setup
```

---

## 🐧 Uso en Linux/macOS

### Instalación Completa

```bash
# Con pnpm (recomendado)
pnpm setup

# O directamente
./scripts/setup.sh

# Con permisos si es necesario
chmod +x scripts/setup.sh
./scripts/setup.sh
```

---

## ⚙️ Opciones Disponibles

### Bash Script (`setup.sh`)

```bash
./scripts/setup.sh [opciones]

Opciones:
  --skip-docker       No levantar Docker (si ya está corriendo)
  --skip-frontend     No instalar frontend
  --skip-backend      No instalar backend
  --help              Mostrar ayuda
```

### PowerShell Script (`setup.ps1`)

```powershell
.\scripts\setup.ps1 [opciones]

Opciones:
  -SkipDocker         No levantar Docker (si ya está corriendo)
  -SkipFrontend       No instalar frontend
  -SkipBackend        No instalar backend
  -Help               Mostrar ayuda
```

### Comandos pnpm (package.json)

```bash
pnpm setup                  # Instalación completa
pnpm setup:skip-frontend    # Solo backend
pnpm setup:skip-docker      # Sin Docker (si ya está corriendo)
```

---

## 📚 Ejemplos de Uso

### Caso 1: Primera Instalación (Completa)

```bash
# Windows (Git Bash) o Linux/macOS
pnpm setup

# Windows (PowerShell)
.\scripts\setup.ps1
```

**Incluye:** Backend + Docker + Migraciones + Frontend

---

### Caso 2: Solo Backend (Sin Frontend)

```bash
# Si solo trabajas en backend
pnpm setup:skip-frontend

# O con flags
./scripts/setup.sh --skip-frontend
.\scripts\setup.ps1 -SkipFrontend
```

**Incluye:** Backend + Docker + Migraciones
**Excluye:** Frontend

---

### Caso 3: Docker Ya Está Corriendo

```bash
# Si ya levantaste Docker manualmente
pnpm setup:skip-docker

# O con flags
./scripts/setup.sh --skip-docker
.\scripts\setup.ps1 -SkipDocker
```

**Incluye:** Backend + Migraciones + Frontend
**Excluye:** Levantar Docker

---

### Caso 4: Reinstalar Solo Dependencias

```bash
# Backend
pnpm install

# Frontend
cd frontend && pnpm install
```

---

## 🔍 Qué Hace Cada Paso

### 1️⃣ Verificar Requisitos

Comprueba que tengas instalado:
- ✅ **Node.js** >= 18
- ✅ **pnpm** >= 10
- ✅ **Docker** (y que esté corriendo)

Si falta algo, el script te avisa y te da enlaces de instalación.

---

### 2️⃣ Instalar Dependencias del Backend

```bash
pnpm install
```

Instala todas las dependencias de NestJS, Prisma, etc.

---

### 3️⃣ Configurar Variables de Entorno

Crea `.env` desde `.env.development.example` si no existe.

**Importante:** Verifica que tenga `localhost` (no `postgres`):

```env
DATABASE_URL=postgresql://music_user:music_password@localhost:5432/music_db
REDIS_HOST=localhost
```

---

### 4️⃣ Levantar Docker

```bash
docker-compose up -d
```

Levanta PostgreSQL y Redis. Espera 5 segundos para que estén listos.

---

### 5️⃣ Generar Cliente Prisma

```bash
pnpm db:generate
```

Genera el cliente de Prisma con los tipos de TypeScript.

---

### 6️⃣ Ejecutar Migraciones

```bash
pnpm db:migrate
```

Crea todas las tablas en PostgreSQL.

---

### 7️⃣ Instalar Frontend (Opcional)

```bash
cd frontend && pnpm install
```

Instala dependencias de React, Vite, etc.

---

## 🛠️ Troubleshooting

### Error: "command not found: pnpm"

**Solución:**
```bash
npm install -g pnpm
```

---

### Error: "Docker is not running"

**Solución en Windows:**
1. Abre Docker Desktop
2. Espera a que inicie completamente
3. Vuelve a ejecutar el script

**Solución en Linux:**
```bash
sudo systemctl start docker
```

---

### Error: "Can't reach database server at postgres:5432"

**Causa:** Tu `.env` tiene `postgres` en vez de `localhost`

**Solución:**
```bash
# Edita .env
# Cambia:
DATABASE_URL=postgresql://...@postgres:5432/...

# Por:
DATABASE_URL=postgresql://...@localhost:5432/...
```

---

### Error: "Port 3000 already in use"

**Solución:**

```bash
# Windows (PowerShell)
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process

# Linux/macOS
lsof -ti:3000 | xargs kill -9
```

---

### Error: "Permission denied: ./scripts/setup.sh"

**Solución:**
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

---

### El script se detiene en migraciones

**Soluciones:**
1. Verifica que Docker esté corriendo: `docker ps`
2. Verifica que PostgreSQL esté en la lista
3. Revisa tu `.env` (debe tener `localhost`)
4. Ejecuta manualmente: `pnpm db:migrate`

---

## 🔄 Ejecutar Setup Nuevamente

Si necesitas ejecutar el setup de nuevo:

```bash
# Detener Docker
pnpm docker:down

# Limpiar
rm -rf node_modules frontend/node_modules
rm .env

# Ejecutar setup nuevamente
pnpm setup
```

---

## 📖 Documentación Relacionada

- **[INSTALACION.md](../INSTALACION.md)** - Guía manual paso a paso
- **[README.md](../README.md)** - Documentación general
- **[DOCKER_COMPOSE_INFO.md](../DOCKER_COMPOSE_INFO.md)** - Guía de Docker

---

## 🎯 Después del Setup

Una vez completado el setup, puedes:

```bash
# Backend (desarrollo)
pnpm start:dev          # http://localhost:3000/api

# Frontend (desarrollo)
cd frontend
pnpm dev                # http://localhost:5173

# Base de datos
pnpm db:studio          # Prisma Studio

# Tests
pnpm test              # Ejecutar tests
```

---

## 💡 Tips

1. **Usa Git Bash en Windows** - Es más compatible que CMD/PowerShell
2. **Deja Docker corriendo** - Para el día a día
3. **Revisa siempre el `.env`** - Debe tener `localhost`
4. **Si cambias schema.prisma** - Ejecuta `pnpm db:migrate`

---

## 🆘 Ayuda Adicional

Si tienes problemas:

1. **Lee el output del script** - Te indica dónde falló
2. **Revisa los logs de Docker** - `docker-compose logs -f`
3. **Consulta INSTALACION.md** - Guía manual detallada
4. **Abre un issue** - En GitHub si el error persiste

---

**¡Happy coding! 🎵**
