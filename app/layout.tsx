import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { auth } from "@/auth";
import { NavLink } from "@/components/nav-link";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-10 border-b border-zinc-200/70 bg-background/80 backdrop-blur dark:border-zinc-800/70">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-2.5">
            <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
              <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-lg shadow-sm">
                ⚽
              </span>
              Polla 2026
            </Link>
            {session?.user && (
              <div className="flex items-center gap-1 text-sm font-medium">
                <nav className="flex items-center gap-1">
                  <NavLink href="/fixture">Fixture</NavLink>
                  <NavLink href="/tabla">Tabla</NavLink>
                  <NavLink href="/bonus">Bonus</NavLink>
                  {session.user.role === "admin" && <NavLink href="/admin">Admin</NavLink>}
                </nav>
                {session.user.image && (
                  // eslint-disable-next-line @next/next/no-img-element -- avatar de Google, tamaño fijo
                  <img
                    src={session.user.image}
                    alt={session.user.name ?? "avatar"}
                    width={28}
                    height={28}
                    className="ml-2 rounded-full ring-2 ring-emerald-600/30"
                  />
                )}
              </div>
            )}
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
