import { auth, signIn, signOut } from "@/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-16">
      <div className="text-center">
        <p className="text-6xl">⚽</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight">
          Polla Mundial 2026
        </h1>
        <p className="mt-3 text-lg text-zinc-500 dark:text-zinc-400">
          Pronósticos entre amigos para la Copa del Mundo
        </p>
      </div>

      {session?.user ? (
        <div className="flex flex-col items-center gap-5">
          <p className="text-lg">
            Hola,{" "}
            <span className="font-semibold">
              {session.user.name ?? session.user.email}
            </span>
            {session.user.role === "admin" && (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-sm font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                admin
              </span>
            )}
          </p>
          <form
            action={async () => {
              "use server";
              await signOut();
            }}
          >
            <button
              type="submit"
              className="h-11 rounded-full border border-zinc-300 px-6 font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      ) : (
        <form
          action={async () => {
            "use server";
            await signIn("google");
          }}
        >
          <button
            type="submit"
            className="h-12 rounded-full bg-foreground px-8 font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            Entrar con Google
          </button>
        </form>
      )}
    </main>
  );
}
