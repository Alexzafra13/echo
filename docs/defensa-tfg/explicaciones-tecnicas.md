# Explicaciones técnicas profundas — "Cómo lo conseguí"

> Complemento del documento de defensa. Aquí se explican, con el **código real** y en
> un lenguaje listo para defender, las decisiones técnicas más interesantes de Echo.
> Pensado para que puedas **entenderlo de verdad** y responder con seguridad, sin
> memorizar de carrerilla.

## Índice

1. [Reproducción aleatoria (shuffle)](#1-reproducción-aleatoria-shuffle)
2. [Federación entre servidores](#2-federación-entre-servidores)
3. [Plantilla para explicar cualquier funcionalidad](#3-plantilla-para-explicar-cualquier-funcionalidad)

---

## 1. Reproducción aleatoria (shuffle)

### El problema que hay que resolver

Barajar canciones parece trivial (`Math.random()` y listo), pero en una biblioteca
con **miles de canciones** aparecen dos problemas reales:

1. **No puedes traerte todas las canciones a memoria** para barajarlas: sería lento y
   gastaría mucha RAM. Necesitas **paginación** (traer de 50 en 50).
2. Si barajas en cada petición con un random distinto, **al pedir la página 2 el orden
   ha cambiado** y saldrían canciones repetidas o saltadas. El shuffle tiene que ser
   **consistente entre páginas**.

Además, Echo tiene un segundo modo más avanzado: el **shuffle DJ**, que no baraja al
azar sino que **encadena canciones armónicamente compatibles**.

Por eso hay **dos implementaciones**:

- `GetShuffledTracksUseCase` → shuffle aleatorio (pero determinista y paginable).
- `GetDjShuffledTracksUseCase` → shuffle "inteligente" por compatibilidad musical.

### 1.1 Shuffle aleatorio: la idea clave (seed + hash en SQL)

La solución es un **shuffle determinista basado en una semilla (seed)**. En vez de
barajar en memoria, **se ordena en la base de datos** con una función que produce
siempre el mismo orden para la misma semilla.

El truco está en una línea de SQL (`track.repository.ts`):

```typescript
async findShuffledPaginated(seed: number, skip: number, take: number): Promise<Track[]> {
  // Usa md5(id || seed) para crear un orden determinístico y reproducible
  // Esto permite paginación consistente con el mismo seed
  const seedStr = seed.toString();

  const result = await this.drizzle.db
    .select()
    .from(tracks)
    .where(isNull(tracks.missingAt))          // excluye archivos que ya no existen
    .orderBy(sql`md5(${tracks.id} || ${seedStr})`)  // ← el truco
    .offset(skip)
    .limit(take);

  return TrackMapper.toDomainArray(result);
}
```

**Cómo funciona, explicado en palabras llanas:**

- A cada canción le concateno su `id` con la semilla y le aplico **`md5(...)`**. El
  resultado es un hash que parece aleatorio pero es **siempre el mismo** para el mismo
  `id` y la misma semilla.
- Ordeno las canciones por ese hash. Como el hash parece aleatorio, **el orden parece
  aleatorio**, pero es **estable**: si vuelvo a pedir con la misma semilla, el orden es
  idéntico.
- Eso me permite **paginar** (`OFFSET`/`LIMIT`) sin que se descoloque: la página 2 con
  la misma semilla continúa exactamente donde acabó la página 1.

El caso de uso genera una semilla una vez y la devuelve al cliente para que la reenvíe
en las siguientes páginas (`get-shuffled-tracks.use-case.ts`):

```typescript
async execute(input: GetShuffledTracksInput = {}): Promise<GetShuffledTracksOutput> {
  const seed = input.seed ?? Math.random();   // si no llega seed, se genera una nueva
  const skip = Math.max(0, input.skip ?? 0);
  const take = Math.min(MAX_TAKE, Math.max(1, input.take ?? DEFAULT_TAKE));

  const [tracks, total] = await Promise.all([
    this.trackRepository.findShuffledPaginated(seed, skip, take),
    this.trackRepository.count(),
  ]);
  // ... devuelve { data, total, seed, skip, take, hasMore }
}
```

Fíjate en dos detalles de calidad:

- **Validación de límites**: `take` está acotado a `MAX_TAKE = 100` para que nadie
  pida 1.000.000 de canciones de golpe (protección contra abuso).
- **`Promise.all`**: lanza la consulta de las canciones y el conteo total **en
  paralelo**, no una detrás de otra.

> **Frase para el tribunal:** *"El shuffle no se hace en memoria sino en la base de
> datos, ordenando por `md5(id || semilla)`. Eso me da un orden que parece aleatorio
> pero es determinista, así que puedo paginar miles de canciones sin que se repitan ni
> se salten, simplemente reenviando la misma semilla."*

### 1.2 Shuffle DJ: encadenar por compatibilidad armónica

El segundo modo (`GetDjShuffledTracksUseCase`) no baraja al azar: **ordena las
canciones como lo haría un DJ**, encadenando temas que combinan bien (tonalidad y
energía parecidas).

El algoritmo, paso a paso:

1. **Comprueba si hay datos suficientes.** Solo tiene sentido si al menos el **50%** de
   las canciones del lote tienen análisis de audio (`MIN_DJ_COVERAGE = 0.5`). Si no,
   **cae con elegancia** (*fallback*) al shuffle aleatorio normal.

   ```typescript
   const completedAnalyses = analyses.filter((a) => a.status === 'completed');
   if (completedAnalyses.length < trackPool.length * MIN_DJ_COVERAGE) {
     return null; // cobertura insuficiente → fallback al shuffle normal
   }
   ```

2. **Coge un lote más grande de lo necesario** (`poolSize = take * 3`) para tener
   margen donde elegir buenas combinaciones.

3. **Construye una cadena por compatibilidad** (algoritmo voraz / *greedy*): empieza
   por una canción (elegida con la semilla) y, para cada paso, busca entre las
   restantes la **más compatible** con la última añadida:

   ```typescript
   while (remaining.length > 0) {
     const lastDjData = djDataMap.get(ordered[ordered.length - 1].id);
     let bestIdx = 0, bestScore = -1;

     for (let i = 0; i < remaining.length; i++) {
       const compat = calculateCompatibility(lastDjData, djDataMap.get(remaining[i].id));
       // pequeño factor aleatorio para que no salga SIEMPRE lo mismo
       const score = compat.overall + ((seed * 1000 + i) % 10) / 100;
       if (score > bestScore) { bestScore = score; bestIdx = i; }
     }
     ordered.push(remaining.splice(bestIdx, 1)[0]);
   }
   ```

4. **Intercala** las canciones sin análisis en posiciones pseudoaleatorias (`interleave`)
   para no perderlas.

5. Si una canción tiene BPM del análisis de Essentia, **prioriza ese BPM** frente al
   del tag ID3 (más fiable):

   ```typescript
   bpm: djBpm ?? track.bpm ?? null,  // Essentia primero, tag como respaldo
   ```

**Decisiones de calidad que merece la pena destacar:**

- **Degradación elegante (graceful fallback):** si no hay análisis suficiente, no
  falla; usa el shuffle normal. El usuario siempre obtiene música.
- **Determinismo + variedad:** se basa en la semilla (reproducible) pero añade un
  pequeño factor aleatorio para no encadenar siempre la misma secuencia.
- **Solo en la primera página:** el ordenado armónico (que es O(n²)) solo se aplica en
  `skip = 0`; la paginación posterior usa el shuffle normal. Es un equilibrio
  consciente entre calidad y rendimiento.

> **Frase para el tribunal:** *"Tengo dos shuffles. El normal ordena por hash con
> semilla para ser determinista y paginable. El modo DJ, si hay suficiente análisis de
> audio, construye una cadena encadenando cada canción con la más compatible
> armónicamente, como un DJ; y si no hay datos, cae automáticamente al shuffle normal."*

---

## 2. Federación entre servidores

### El problema que hay que resolver

Quiero que **dos servidores Echo de personas distintas** puedan conectarse para que
una pueda navegar y reproducir la música de la otra. Eso plantea retos de seguridad:

- ¿Cómo se "presentan" dos servidores que no se conocen, sin compartir contraseñas?
- ¿Cómo evito que un token de invitación se reenvíe y lo use cualquiera?
- ¿Cómo limito qué puede hacer el otro servidor (navegar sí, descargar no)?
- ¿Cómo valido miles de peticiones del servidor remoto sin machacar la base de datos?

La solución es un sistema de **dos tipos de token** (`FederationTokenService`).

### 2.1 Los dos tipos de token

| Token                  | Para qué sirve                                        | Vida           |
| ---------------------- | ----------------------------------------------------- | -------------- |
| **Token de invitación** | Emparejar dos servidores la primera vez (como un código de invitación) | Caduca (7 días), **1 solo uso** |
| **Access token**        | Autenticar cada petición del servidor remoto ya emparejado | Persistente, revocable |

Es el mismo patrón conceptual que cuando invitas a alguien a un grupo: el **enlace de
invitación** se usa una vez para entrar; luego ya eres **miembro** (access token) y no
necesitas el enlace.

### 2.2 Generación del token de invitación

```typescript
async generateInvitationToken(userId, name?, expiresInDays = 7, maxUses = 1) {
  const rawToken = randomBytes(8).toString('hex').toUpperCase();
  // formato legible: XXXX-XXXX-XXXX-XXXX (fácil de dictar/copiar)
  const token = `${rawToken.slice(0,4)}-${rawToken.slice(4,8)}-${rawToken.slice(8,12)}-${rawToken.slice(12,16)}`;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  return this.repository.createFederationToken({ createdByUserId: userId, token, name, expiresAt, maxUses });
}
```

Detalles a defender:

- **`randomBytes(8)`** (de la librería `crypto` de Node): aleatoriedad
  **criptográficamente segura**, no `Math.random()`.
- **Formato `XXXX-XXXX-XXXX-XXXX`**: pensado para que un humano lo pueda copiar o
  dictar sin errores.
- **Caducidad + un solo uso** (`maxUses = 1`): aunque alguien intercepte el token, su
  ventana de utilidad es mínima.

### 2.3 Canje del token (el momento delicado: condición de carrera)

Cuando el servidor B canjea el token, hay que **descontar el uso de forma atómica**. Si
dos peticiones llegan a la vez con el mismo token de un solo uso, ambas podrían pasar
la comprobación "¿le quedan usos?" antes de descontarlo → se usaría dos veces. Por eso
se delega en una operación **atómica** en la base de datos:

```typescript
async useInvitationToken(token, serverName, serverUrl?, ip?, mutualInvitationToken?) {
  // Operación ATÓMICA: comprueba y descuenta el uso en una sola consulta,
  // evitando la condición de carrera de "doble uso".
  const federationToken = await this.repository.useInvitationTokenAtomic(token, serverName, ip);
  if (!federationToken) return null;

  // Se emite el ACCESS TOKEN (32 bytes → mucho más largo y secreto)
  const accessToken = randomBytes(32).toString('hex');
  const mutualStatus = mutualInvitationToken ? 'pending' : 'none';

  return this.repository.createFederationAccessToken({
    ownerId: federationToken.createdByUserId,
    token: accessToken,
    serverName,
    serverUrl,
    permissions: { canBrowse: true, canStream: true, canDownload: false }, // ← permisos granulares
    mutualInvitationToken: mutualInvitationToken ?? null,
    mutualStatus,
  });
}
```

Detalles a defender:

- **Atomicidad** (`useInvitationTokenAtomic`): la comprobación de usos y el descuento
  ocurren en una sola operación de BD, evitando que un token de un solo uso se canjee
  dos veces.
- **El access token es de 32 bytes** (frente a los 8 del de invitación): es el token
  "de verdad", que viajará en cada petición, así que se hace más largo y secreto.
- **Permisos granulares por defecto:** puede navegar y escuchar, pero **no descargar**.
  Esto se puede ajustar después por cada servidor conectado.
- **Federación mutua opcional:** si el servidor B aporta también su propio token de
  invitación, se marca `mutualStatus: 'pending'` para negociar confianza bidireccional
  (que el A pueda también acceder al B). Hay métodos para aprobar/rechazar esa solicitud.

### 2.4 Validación de cada petición (caché para no machacar la BD)

Una vez emparejados, **cada petición** del servidor remoto trae su access token y hay
que validarlo. Validar contra la base de datos en cada llamada sería costoso, así que
se cachea en memoria con TTL:

```typescript
async validateAccessToken(token: string): Promise<FederationAccessToken | null> {
  // 1) ¿está en la caché en memoria (TTL 5 min)?
  const cached = this.validatedTokens.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    // actualiza "última vez usado" sin esperar (fire-and-forget)
    this.repository.updateFederationAccessToken(cached.result.id, { lastUsedAt: new Date() }).catch(() => {});
    return cached.result;
  }

  // 2) cache miss → consulta a la BD
  const accessToken = await this.repository.findFederationAccessTokenByToken(token);
  if (!accessToken || !accessToken.isActive) return null;
  if (accessToken.expiresAt && accessToken.expiresAt < new Date()) return null;

  // 3) guarda en caché (si está llena, expulsa la entrada más antigua)
  if (this.validatedTokens.size >= this.MAX_CACHE_SIZE) {
    const firstKey = this.validatedTokens.keys().next().value;
    if (firstKey) this.validatedTokens.delete(firstKey);
  }
  this.validatedTokens.set(token, { result: accessToken, expiresAt: Date.now() + this.CACHE_TTL_MS });

  return accessToken;
}
```

Detalles a defender:

- **Caché en memoria en vez de Redis (a propósito):** el comentario del código lo dice
  —*"para respetar los límites de la capa de dominio"*. El dominio no debe depender de
  infraestructura como Redis, así que aquí se usa un `Map` con TTL y limpieza periódica.
- **Límite de tamaño (`MAX_CACHE_SIZE = 500`) con expulsión del más antiguo:** evita
  que la caché crezca sin control (fuga de memoria).
- **Limpieza periódica:** un `setInterval` cada 10 min va borrando entradas caducadas, y
  se cancela en `onModuleDestroy()` (no deja timers colgando al apagar el servidor).
- **`fire-and-forget` en `lastUsedAt`:** actualizar "última vez usado" no debe frenar la
  respuesta, así que se lanza sin `await` y se ignoran errores con `.catch(() => {})`.
- **Invalidación de caché tras cambiar permisos/revocar:** cuando cambian los permisos
  o se revoca un token, se borra de la caché para que una petición concurrente no siga
  usando el valor antiguo (`invalidateCacheByTokenId`).

> **Frase para el tribunal:** *"La federación usa dos tokens: uno de invitación, de un
> solo uso y caducidad corta, que se canjea de forma atómica para evitar el doble uso; y
> un access token largo que se valida en cada petición. Para no consultar la BD cada
> vez, cacheo los tokens validados en memoria con TTL y expulsión de los más antiguos,
> e invalido la caché cuando cambian permisos o se revoca."*

### 2.5 El flujo completo de un vistazo

```
1. Servidor A → genera token de invitación  (XXXX-XXXX-XXXX-XXXX, 1 uso, 7 días)
2. A comparte ese código con el dueño de B (por chat, email, etc.)
3. B canjea el token  →  A lo descuenta ATÓMICAMENTE (1 solo uso)
4. A emite un ACCESS TOKEN (32 bytes) con permisos: browse ✓ stream ✓ download ✗
5. B guarda el access token y lo envía en CADA petición posterior
6. A valida el access token (caché en memoria 5 min → BD si falla)
7. (Opcional) Federación mutua: B aporta su token → A aprueba → acceso bidireccional
```

---

## 3. Plantilla para explicar cualquier funcionalidad

Si en la defensa te preguntan por **otra** funcionalidad (escaneo, streaming, modo DJ,
recomendaciones…), usa siempre la **misma estructura de 4 pasos**. Transmite que
piensas como ingeniero, no que memorizaste:

1. **El problema:** *"El reto era X..."* (p. ej. "barajar miles de canciones sin
   repetir al paginar").
2. **La idea / decisión clave:** *"Lo resolví con Y..."* (p. ej. "ordenando por
   `md5(id||seed)` en SQL").
3. **Cómo lo implementé:** menciona el caso de uso / servicio concreto y 1-2 detalles
   técnicos (validación de límites, `Promise.all`, atomicidad, caché con TTL...).
4. **Por qué es buena solución / qué problema evita:** *"Esto me da consistencia /
   seguridad / rendimiento, y evita Z."*

> Tres "decisiones de calidad" que aparecen una y otra vez en Echo y siempre quedan bien
> mencionar: **(1)** validar y acotar la entrada (límites, defensa de rutas), **(2)**
> mover el trabajo pesado fuera de la petición (colas, paralelo, fire-and-forget) y
> **(3)** cachear con TTL e invalidar al escribir.
