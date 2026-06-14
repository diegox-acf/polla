"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={
        active
          ? "border-b-2 border-emerald-600 px-1.5 py-1 font-medium text-emerald-700 dark:border-emerald-400 dark:text-emerald-300"
          : "border-b-2 border-transparent px-1.5 py-1 text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-100"
      }
    >
      {children}
    </Link>
  );
}
