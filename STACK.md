# Tech Stack — Polla Mundial 2026

Criterio: 10–15 usuarios, hay que salir a producción en días (el Mundial ya empezó), costo $0, y un solo desarrollador. Se prioriza lo aburrido y conocido por sobre lo interesante.

## Stack elegido

| Capa | Elección | Por qué |
|---|---|---|
| Framework | **Next.js 16 (App Router) + TypeScript** | Full-stack en un solo repo y deploy; stack que ya dominas |
| UI | **Tailwind CSS + shadcn/ui** | Mobile-first rápido sin diseñar desde cero |
| Auth | **Auth.js (NextAuth v5) con provider Google** | Resuelve sign-in con Google, sesiones con cookie httpOnly firmada y CSRF. El allowlist se valida en el callback `signIn` |
| Base de datos | **Postgres en Neon (free tier)** | Relacional (el modelo lo es), serverless, branching para probar |
| ORM | **Drizzle** | Tipado end-to-end, migraciones SQL versionadas, liviano |
| Validación | **Zod** | Toda entrada de usuario se valida en el servidor |
| Hosting | **Vercel (free tier)** | Deploy con `git push`, preview deployments, cron incluido |
| Cron | **Vercel Cron** | Sync de resultados y cambio de estado de partidos |
| Datos de fútbol | **football-data.org (free tier)** | Fixture y resultados del Mundial; detalle más abajo |
| Email (v1.1) | **Resend (free tier)** | Recordatorios de deadline; no se necesita en v1 |
| Tests | **Vitest** | El motor de puntaje son funciones puras: testearlas es barato y es donde un bug duele (hay plata en juego) |

## Datos del fixture y resultados: football-data.org

API elegida: **football-data.org**. Su free tier incluye el Mundial (competición `WC`), con límite de **10 requests/minuto** y API token gratuito (header `X-Auth-Token`). Verificado en junio 2026.

- **Fixture:** se importa una vez desde la API al hacer el seed; los cruces eliminatorios se actualizan vía sync a medida que se definen.
- **Resultados:** Vercel Cron consulta la API solo en ventanas de partidos (durante y tras cada kickoff) y actualiza estado, marcador a los 90' y clasificado. Con 10 req/min el límite nunca es problema: 1 request trae toda la jornada.
- **Respaldo manual:** el admin siempre puede corregir o cargar un resultado a mano (API caída, dato erróneo, marcador 90' vs alargue). Toda corrección manual queda en el audit log.

## Decisiones de seguridad (resumen — detalle en FEATURES.md)

- Deadlines y reglas de visibilidad se aplican **en el servidor** (Server Components / server actions); los pronósticos ajenos pre-kickoff jamás se serializan hacia el cliente.
- Sesiones via cookie httpOnly `Secure` `SameSite=Lax` (default de Auth.js). Sin tokens en localStorage.
- Mutaciones solo vía server actions con validación Zod + chequeo de sesión y rol.
- Audit log en tablas append-only para pronósticos y resultados.

## Por qué NO otras opciones

- **AWS + Terraform/K8s** (tu día a día): sobredimensionado para 15 usuarios y le agrega días de setup que no hay. Si después quieres usarlo como gimnasio de infra, la app se migra fácil (es un contenedor Next.js + Postgres).
- **Backend separado (Go/Java + React SPA):** dos deploys, CORS, duplicación de tipos. Next.js full-stack elimina todo eso a esta escala.
- **Supabase Auth en vez de Auth.js:** válido, pero acopla auth a la DB; Auth.js mantiene todo en el código de la app.

## Estructura del proyecto

```
polla/
├── app/                  # rutas (App Router)
│   ├── (auth)/login
│   ├── fixture/          # lista de partidos + pronósticos
│   ├── partido/[id]/
│   ├── tabla/            # posiciones
│   ├── bonus/
│   ├── pozo/
│   └── admin/            # resultados, allowlist, pagos, settings
├── lib/
│   ├── db/               # schema Drizzle + migraciones + seed fixture
│   ├── scoring/          # motor de puntaje (funciones puras, testeadas)
│   └── auth.ts
└── tests/
```

## Orden de construcción propuesto

1. **Día 1:** scaffold + Auth Google con allowlist + schema DB + seed del fixture desde football-data.org.
2. **Día 2:** pantalla de pronósticos (crear/editar con deadline server-side) + bonus picks.
3. **Día 3:** sync de resultados (cron + override manual del admin) + motor de puntaje con tests + tabla de posiciones.
4. **Día 4:** vista de partido, pozo/pagos, pulido mobile, deploy a Vercel y onboarding de los amigos.
