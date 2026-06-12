# ⚽ Polla Mundial 2026

App de pronósticos para el Mundial 2026 entre amigos.

- **Reglas del juego:** [REGLAS.md](REGLAS.md)
- **Features y modelo de datos:** [FEATURES.md](FEATURES.md)
- **Stack y arquitectura:** [STACK.md](STACK.md)

## Setup local

Requisitos: Node 20+, Docker (para Postgres local).

```bash
# 1. Dependencias
npm install

# 2. Variables de entorno
cp .env.example .env   # y completa los valores (ver comentarios en el archivo)
npx auth secret        # genera AUTH_SECRET y lo escribe en .env.local — muévelo a .env

# 3. Base de datos local
docker compose up -d
npm run db:generate    # genera migraciones SQL desde lib/db/schema.ts
npm run db:migrate     # las aplica

# 4. Seed: admin (allowlist) + fixture desde football-data.org
npm run db:seed

# 5. A jugar
npm run dev            # http://localhost:3000
```

### Credenciales que necesitas

| Variable | Dónde se consigue |
|---|---|
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → OAuth client ID (Web). Redirect URI: `http://localhost:3000/api/auth/callback/google` |
| `FOOTBALL_DATA_TOKEN` | [football-data.org](https://www.football-data.org/client/register) — registro gratis |

## Comandos útiles

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run typecheck` | Chequeo de tipos |
| `npm run test` | Tests (motor de puntaje) |
| `npm run db:generate` | Genera migraciones desde el schema |
| `npm run db:migrate` | Aplica migraciones |
| `npm run db:seed` | Siembra admin + fixture (idempotente, re-ejecutable) |
| `npm run db:studio` | UI para inspeccionar la base de datos |

## Cómo funciona el acceso

Login exclusivamente con Google (Auth.js). Solo entran emails que estén en la tabla `players` (allowlist): el seed agrega a `ADMIN_EMAIL` como admin, y el admin invita al resto agregando sus emails desde la app.
