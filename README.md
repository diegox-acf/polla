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
| `npm run sync` | Fuerza un sync de resultados desde football-data.org |

## Cómo funciona el acceso

Login exclusivamente con Google (Auth.js). Solo entran emails que estén en la tabla `players` (allowlist): el seed agrega a `ADMIN_EMAIL` como admin, y el admin invita al resto desde `/admin`.

## Deploy a Vercel

1. **Base de datos**: crea un proyecto en [Neon](https://neon.tech) (free tier) y copia el connection string.
2. **Proyecto**: importa este repo en [Vercel](https://vercel.com/new). Framework: Next.js (autodetectado).
3. **Variables de entorno** (Settings → Environment Variables): todas las de `.env.example` —
   `DATABASE_URL` (Neon), `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`,
   `FOOTBALL_DATA_TOKEN`, `ADMIN_EMAIL` y `CRON_SECRET` (`openssl rand -hex 32`).
4. **Google OAuth**: en Google Cloud Console agrega el redirect URI de producción:
   `https://<tu-dominio>.vercel.app/api/auth/callback/google` (y el origin `https://<tu-dominio>.vercel.app`).
5. **Migrar y seedear producción** (desde tu máquina, apuntando a Neon):
   ```bash
   DATABASE_URL=<neon> npm run db:migrate
   DATABASE_URL=<neon> FOOTBALL_DATA_TOKEN=<token> ADMIN_EMAIL=<tu-email> npm run db:seed
   ```
6. **Cron**: el plan **Hobby solo permite crons diarios**, así que `vercel.json` programa
   `/api/cron/sync` una vez al día (06:00 UTC) como red de seguridad. Para resultados al día
   durante los partidos, el workflow `.github/workflows/sync-results.yml` pega al endpoint
   cada 10 min. Configúralo en GitHub → Settings → Secrets and variables → Actions con dos
   secrets: `APP_URL` (`https://<tu-dominio>.vercel.app`) y `CRON_SECRET` (el mismo valor que
   en Vercel). También puedes dispararlo a mano (pestaña Actions → Run workflow) o con el
   botón "Sincronizar ahora" de `/admin`.
7. **Onboarding**: entra con tu cuenta admin y agrega los emails de tus amigos en `/admin`.
