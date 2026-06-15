import { signOutAction } from "@/app/actions";

export function PendingApproval({ email }: { email?: string | null }) {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 -z-10 size-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/15 blur-3xl"
      />
      <div className="flex max-w-md flex-col items-center text-center">
        <span className="text-5xl" aria-hidden>
          ⏳
        </span>
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight">Cuenta pendiente de aprobación</h1>
        <p className="mt-3 text-zinc-500 dark:text-zinc-400">
          Ya entraste{email ? <> con <span className="font-medium">{email}</span></> : null}. El
          admin tiene que aprobar tu cuenta antes de que puedas hacer pronósticos. Te avisará cuando
          esté lista.
        </p>
        <form action={signOutAction} className="mt-8">
          <button
            type="submit"
            className="text-sm text-zinc-500 underline-offset-4 transition-colors hover:text-zinc-800 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </main>
  );
}
