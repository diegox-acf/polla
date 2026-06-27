import Link from "next/link";
import { signIn, signOut } from "@/auth";
import { getAccess } from "@/lib/access";
import { WORLD_CUP_EMBLEM } from "@/lib/football-data";

export default async function Home() {
  const { session, isAdmin } = await getAccess();

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-16">
      {/* Resplandor de fondo */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 -z-10 size-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/15 blur-3xl"
      />

      <div className="flex flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element -- emblema remoto de football-data, tamaño fijo */}
        <img
          src={WORLD_CUP_EMBLEM}
          alt="Copa Mundial FIFA 2026"
          width={160}
          height={160}
          className="h-40 w-auto drop-shadow-md"
        />
        <h1 className="mt-6 bg-gradient-to-br from-emerald-600 to-teal-500 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl dark:from-emerald-400 dark:to-teal-300">
          Polla Mundial 2026
        </h1>
        <p className="mt-3 text-lg text-zinc-500 dark:text-zinc-400">
          Pronósticos entre amigos para la Copa del Mundo
        </p>
      </div>

      {session?.user ? (
        <div className="mt-10 flex w-full max-w-md flex-col items-center gap-8">
          <p className="text-lg">
            Hola,{" "}
            <span className="font-semibold">
              {session.user.name ?? session.user.email}
            </span>
            {isAdmin && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-sm font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                admin
              </span>
            )}
          </p>

          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
            <HomeCard
              href="/fixture"
              emoji="🗓️"
              title="Fixture"
              description="Los 104 partidos y tus pronósticos"
            />
            <HomeCard
              href="/tabla"
              emoji="📊"
              title="Tabla"
              description="Posiciones y desglose de puntos"
            />
            <HomeCard
              href="/bonus"
              emoji="🏆"
              title="Bonus"
              description="Campeón, goleador y finalistas"
            />
            <HomeCard
              href="/pozo"
              emoji="💰"
              title="Pozo"
              description="Premios proyectados y pagos"
            />
            <HomeCard
              href="/equipos"
              emoji="🌎"
              title="Equipos"
              description="Las 48 selecciones y sus planteles"
            />
            <HomeCard
              href="/reglas"
              emoji="📜"
              title="Reglas"
              description="Puntajes, desempates y premios"
            />
          </div>

          <form
            action={async () => {
              "use server";
              await signOut();
            }}
          >
            <button
              type="submit"
              className="text-sm text-zinc-500 underline-offset-4 transition-colors hover:text-zinc-800 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      ) : (
        <form
          className="mt-10"
          action={async () => {
            "use server";
            await signIn("google");
          }}
        >
          <button
            type="submit"
            className="h-12 rounded-full bg-emerald-600 px-8 font-semibold text-white shadow-lg shadow-emerald-600/25 transition-all hover:bg-emerald-500 hover:shadow-emerald-500/30 active:scale-[0.98]"
          >
            Entrar con Google
          </button>
        </form>
      )}
    </main>
  );
}

function HomeCard({
  href,
  emoji,
  title,
  description,
}: {
  href: string;
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-800"
    >
      <span className="text-2xl">{emoji}</span>
      <p className="mt-2 font-semibold group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
        {title}
      </p>
      <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
    </Link>
  );
}
