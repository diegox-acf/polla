import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { and, eq, gte, inArray, lte, or } from "drizzle-orm";
import Link from "next/link";
import { signOutAction } from "@/app/actions";
import { LiveDot } from "@/components/live-dot";
import { LiveRefresher } from "@/components/live-refresher";
import { MobileNav } from "@/components/mobile-nav";
import { NavLink } from "@/components/nav-link";
import { PendingApproval } from "@/components/pending-approval";
import { UserMenu } from "@/components/user-menu";
import { getAccess } from "@/lib/access";
import { db } from "@/lib/db";
import { matches } from "@/lib/db/schema";
import { isLive, LIVE_WINDOW_MS } from "@/lib/match-state";
import { WORLD_CUP_EMBLEM } from "@/lib/football-data";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Polla Mundial 2026",
  description: "Pronósticos entre amigos para la Copa del Mundo 2026",
};

// Leer el reloj fuera del cuerpo del componente (regla react-hooks/purity).
const SOON_MS = 30 * 60 * 1000;
function liveWindow() {
  const now = new Date();
  return {
    now,
    soon: new Date(now.getTime() + SOON_MS),
    // Piso para "ya arrancó pero la API aún no confirma" (ver lib/match-state).
    liveFloor: new Date(now.getTime() - LIVE_WINDOW_MS),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { session, approved } = await getAccess();
  // Logueado pero sin aprobar: ve solo la pantalla de espera, nada de la app.
  const pending = !!session?.user && !approved;

  const { now, soon, liveFloor } = liveWindow();

  // Partidos en vivo para el indicador global del header. Incluye los que ya
  // arrancaron aunque la API siga diciendo "scheduled" (ver lib/match-state).
  const liveMatches = approved
    ? (
        await db.query.matches.findMany({
          where: or(
            inArray(matches.status, ["in_play", "paused"]),
            and(
              eq(matches.status, "scheduled"),
              gte(matches.kickoff, liveFloor),
              lte(matches.kickoff, now),
            ),
          ),
          columns: { id: true, status: true, kickoff: true },
        })
      ).filter((m) => isLive(m, now))
    : [];
  const liveHref = liveMatches.length === 1 ? `/partido/${liveMatches[0].id}` : "/fixture";

  // ¿Hay un partido por empezar pronto? Así la página empieza a autorrefrescarse
  // poco antes del pitazo y "descubre" el cambio a en vivo, no solo después.
  const imminent = approved
    ? await db.query.matches.findMany({
        where: and(
          eq(matches.status, "scheduled"),
          gte(matches.kickoff, now),
          lte(matches.kickoff, soon),
        ),
        columns: { id: true },
        limit: 1,
      })
    : [];
  const liveOrSoon = liveMatches.length > 0 || imminent.length > 0;

  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Script en línea síncrono: corre mientras el navegador parsea el HTML,
            antes del primer pintado, así no hay flash claro→oscuro. No usar
            next/script: su ejecución no bloquea el pintado (ver docs Next). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||((!t||t==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-10 border-b border-zinc-200/70 bg-background/80 backdrop-blur dark:border-zinc-800/70">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-2.5">
            <div className="flex min-w-0 items-center gap-1.5">
              {approved && <MobileNav isAdmin={session?.user.role === "admin"} />}
              <Link href="/" className="flex min-w-0 items-center gap-2 font-bold tracking-tight">
              {/* eslint-disable-next-line @next/next/no-img-element -- emblema remoto de football-data, tamaño fijo */}
              <img
                src={WORLD_CUP_EMBLEM}
                alt="Mundial 2026"
                width={32}
                height={32}
                className="h-8 w-auto shrink-0 drop-shadow-sm"
              />
              <span className="truncate">Polla 2026</span>
              </Link>
            </div>
            {session?.user && (
              <div className="flex min-w-0 items-center gap-1 text-sm font-medium">
                {liveMatches.length > 0 && (
                  <Link
                    href={liveHref}
                    title={
                      liveMatches.length === 1
                        ? "Hay un partido en vivo"
                        : `Hay ${liveMatches.length} partidos en vivo`
                    }
                    className="mr-1 flex shrink-0 items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700 transition-colors hover:bg-red-200 dark:bg-red-900/60 dark:text-red-300 dark:hover:bg-red-900"
                  >
                    <LiveDot />
                    EN VIVO
                    {liveMatches.length > 1 && <span>({liveMatches.length})</span>}
                  </Link>
                )}
                {/* Links solo en desktop; en móvil manda el menú hamburguesa */}
                {approved && (
                  <nav className="hidden items-center gap-2 sm:flex">
                    <NavLink href="/fixture">Fixture</NavLink>
                    <NavLink href="/grupos">Grupos</NavLink>
                    <NavLink href="/equipos">Equipos</NavLink>
                    <NavLink href="/tabla">Tabla</NavLink>
                    <NavLink href="/bonus">Bonus</NavLink>
                    <NavLink href="/pozo">Pozo</NavLink>
                    <NavLink href="/reglas">Reglas</NavLink>
                    {session.user.role === "admin" && <NavLink href="/admin">Admin</NavLink>}
                  </nav>
                )}
                <UserMenu
                  name={session.user.name}
                  email={session.user.email}
                  image={session.user.image}
                  signOutAction={signOutAction}
                />
              </div>
            )}
          </div>
        </header>
        <div className="flex flex-1 flex-col">
          {pending ? <PendingApproval email={session?.user.email} /> : children}
        </div>
        {approved && <LiveRefresher active={liveOrSoon} />}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
