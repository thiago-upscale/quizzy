import Link from "next/link";
import { requireAuthSession } from "@/auth/session";
import { DashboardNav } from "./dashboard-nav";
import { SignOutButton } from "./sign-out-button";

function QuizzyWordmark({ size }: { size: "sm" | "md" }) {
  return (
    <Link aria-label="Quizzy — ir para o dashboard" href="/dashboard">
      <span
        className={`uppercase tracking-[0.14em] text-[var(--quizzy-navy)] ${
          size === "md" ? "text-[1.6rem]" : "text-[1.3rem]"
        }`}
        style={{ fontFamily: "var(--quizzy-logo-font)" }}
      >
        Quizzy
      </span>
    </Link>
  );
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuthSession();
  const userName = session.user.name || "Conta";
  const userEmail = session.user.email ?? "";

  return (
    <div className="min-h-screen bg-[var(--quizzy-surface)] text-[var(--quizzy-text)] lg:flex">
      {/* Sidebar — desktop */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-[var(--quizzy-border)] bg-[var(--quizzy-surface-strong)] px-5 py-7 lg:flex xl:w-64">
        <QuizzyWordmark size="md" />

        <div className="mt-8 flex-1">
          <DashboardNav orientation="vertical" />
        </div>

        <div className="border-t border-[var(--quizzy-border)] pt-4">
          <p className="truncate text-sm font-semibold text-[var(--quizzy-text)]">
            {userName}
          </p>
          <p className="mt-0.5 truncate text-xs text-[var(--quizzy-muted)]">
            {userEmail}
          </p>
          <div className="mt-3">
            <SignOutButton />
          </div>
        </div>
      </aside>

      {/* Topbar — mobile/tablet */}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-[var(--quizzy-border)] bg-[var(--quizzy-surface-strong)]/90 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between px-4 pt-3">
            <QuizzyWordmark size="sm" />
            <SignOutButton />
          </div>
          <div className="px-2 pb-2 pt-1">
            <DashboardNav orientation="horizontal" />
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
