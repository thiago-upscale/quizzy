import type { ReactNode } from "react";

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function SurfaceCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={joinClasses(
        "rounded-[1.75rem] border border-[var(--quizzy-border)] bg-[var(--quizzy-surface-strong)] p-6 shadow-[0_18px_70px_rgba(15,23,42,0.06)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function SectionHeading({
  align = "start",
  eyebrow,
  helper,
  title,
  trailing,
}: {
  align?: "center" | "start";
  eyebrow: string;
  helper?: string;
  title: string;
  trailing?: ReactNode;
}) {
  return (
    <div
      className={joinClasses(
        "flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between",
        align === "center" ? "text-center lg:text-left" : "",
      )}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-muted)]">
          {eyebrow}
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-[var(--quizzy-text)]">
          {title}
        </h2>
        {helper ? (
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--quizzy-muted)]">
            {helper}
          </p>
        ) : null}
      </div>
      {trailing ? <div className="flex flex-wrap gap-3">{trailing}</div> : null}
    </div>
  );
}

export function StatusAlert({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "error" | "info" | "success" | "warning";
}) {
  const tones = {
    error:
      "border-[#f4c7c3] bg-[#fff3f2] text-[#b42318]",
    info: "border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]",
    success: "border-[#b7e4c7] bg-[#ecfdf3] text-[#0f766e]",
    warning: "border-[#fed7aa] bg-[#fff7ed] text-[#9a3412]",
  } as const;

  return (
    <div
      className={joinClasses(
        "rounded-[1.25rem] border px-4 py-3 text-sm font-medium leading-6",
        tones[tone],
      )}
    >
      {children}
    </div>
  );
}

export function EmptyStateCard({
  action,
  description,
  title,
}: {
  action?: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-[var(--quizzy-border)] bg-[color:color-mix(in_srgb,var(--quizzy-surface)_70%,white)] p-6">
      <h3 className="text-lg font-semibold text-[var(--quizzy-text)]">
        {title}
      </h3>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--quizzy-muted)]">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function MetricCard({
  accent,
  helper,
  label,
  value,
}: {
  accent?: "amber" | "navy" | "teal";
  helper?: string;
  label: string;
  value: ReactNode;
}) {
  const accentClasses = {
    amber: "border-[#fed7aa] bg-[#fff7ed]",
    navy: "border-[var(--quizzy-border)] bg-[color:color-mix(in_srgb,var(--quizzy-surface)_65%,white)]",
    teal: "border-[#b7e4c7] bg-[#ecfdf3]",
  } as const;

  return (
    <article
      className={joinClasses(
        "rounded-[1.5rem] border p-5",
        accentClasses[accent ?? "navy"],
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--quizzy-muted)]">
        {label}
      </p>
      <div className="mt-3 text-3xl font-semibold text-[var(--quizzy-text)]">
        {value}
      </div>
      {helper ? (
        <p className="mt-3 text-sm leading-6 text-[var(--quizzy-muted)]">
          {helper}
        </p>
      ) : null}
    </article>
  );
}

export function FieldPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={joinClasses(
        "rounded-[1.5rem] border border-[var(--quizzy-border)] bg-[color:color-mix(in_srgb,var(--quizzy-surface)_68%,white)] p-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SkeletonBlock({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={joinClasses(
        "animate-pulse rounded-2xl bg-[linear-gradient(90deg,rgba(216,226,238,0.68),rgba(247,248,250,0.96),rgba(216,226,238,0.68))]",
        className,
      )}
    />
  );
}
