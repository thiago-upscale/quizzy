import { SkeletonBlock, SurfaceCard } from "@/components/phase-one-ui";

export default function Loading() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f7fafc_0%,_#eef7ff_100%)] px-6 py-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <SurfaceCard className="space-y-4">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-10 w-80" />
          <SkeletonBlock className="h-5 w-full max-w-3xl" />
        </SurfaceCard>
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <SkeletonBlock className="h-40 w-full rounded-[1.75rem]" />
          <SkeletonBlock className="h-40 w-full rounded-[1.75rem]" />
        </div>
        <SurfaceCard className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SkeletonBlock className="h-32 w-full" />
            <SkeletonBlock className="h-32 w-full" />
            <SkeletonBlock className="h-32 w-full" />
            <SkeletonBlock className="h-32 w-full" />
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <SkeletonBlock className="h-40 w-full" />
            <div className="grid gap-4">
              <SkeletonBlock className="h-28 w-full" />
              <SkeletonBlock className="h-28 w-full" />
            </div>
          </div>
          <SkeletonBlock className="h-96 w-full" />
        </SurfaceCard>
      </div>
    </main>
  );
}
