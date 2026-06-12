import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { auth } from "@/auth";
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
        <header className="border-b border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
            <Link href="/" className="font-bold tracking-tight">
              ⚽ Polla 2026
            </Link>
            {session?.user && (
              <nav className="flex items-center gap-5 text-sm font-medium">
                <Link href="/fixture" className="hover:underline">
                  Fixture
                </Link>
                <Link href="/bonus" className="hover:underline">
                  Bonus
                </Link>
              </nav>
            )}
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
