"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  match: (pathname: string) => boolean;
};

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Quizzes",
    match: (pathname) =>
      pathname === "/dashboard" || pathname.startsWith("/dashboard/quizzes"),
  },
  {
    href: "/dashboard/operacao",
    label: "Operação ao vivo",
    match: (pathname) =>
      pathname.startsWith("/dashboard/operacao") ||
      pathname.startsWith("/dashboard/sessions"),
  },
  {
    href: "/dashboard/resultados",
    label: "Resultados",
    match: (pathname) => pathname.startsWith("/dashboard/resultados"),
  },
  {
    href: "/dashboard/account",
    label: "Conta",
    match: (pathname) => pathname.startsWith("/dashboard/account"),
  },
];

export function DashboardNav({
  orientation,
}: {
  orientation: "vertical" | "horizontal";
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação do dashboard"
      className={
        orientation === "vertical"
          ? "flex flex-col gap-1"
          : "flex gap-1 overflow-x-auto"
      }
    >
      {navItems.map((item) => {
        const active = item.match(pathname);

        return (
          <Link
            key={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-[44px] items-center whitespace-nowrap rounded-full px-4 text-sm transition ${
              active
                ? "bg-[color:color-mix(in_srgb,var(--quizzy-teal)_10%,white)] font-semibold text-[var(--quizzy-teal)]"
                : "font-medium text-[var(--quizzy-muted)] hover:bg-[var(--quizzy-surface)] hover:text-[var(--quizzy-text)]"
            }`}
            href={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
