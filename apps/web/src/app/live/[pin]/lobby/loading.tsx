import { SkeletonBlock } from "@/components/phase-one-ui";

export default function Loading() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#10233f_0%,_#0f766e_100%)] px-6 py-10">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-6xl flex-col gap-6">
        <SkeletonBlock className="h-36 w-full rounded-[2rem]" />
        <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <SkeletonBlock className="h-[46rem] w-full rounded-[1.75rem]" />
          <SkeletonBlock className="h-[46rem] w-full rounded-[1.75rem]" />
        </div>
      </div>
    </main>
  );
}
