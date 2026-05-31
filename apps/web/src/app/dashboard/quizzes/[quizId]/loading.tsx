import { SkeletonBlock, SurfaceCard } from "@/components/phase-one-ui";

export default function Loading() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f8fafc,_#eef5ff)] px-6 py-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="space-y-4">
          <SkeletonBlock className="h-4 w-40" />
          <SkeletonBlock className="h-10 w-72" />
          <SkeletonBlock className="h-5 w-32" />
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <SurfaceCard className="space-y-5">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="h-8 w-56" />
            <div className="grid gap-4 sm:grid-cols-3">
              <SkeletonBlock className="h-28 w-full" />
              <SkeletonBlock className="h-28 w-full" />
              <SkeletonBlock className="h-28 w-full" />
            </div>
            <SkeletonBlock className="h-36 w-full" />
          </SurfaceCard>
          <SkeletonBlock className="h-[32rem] w-full rounded-[1.75rem]" />
        </div>
        <SurfaceCard className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <SkeletonBlock className="h-56 w-full" />
            <SkeletonBlock className="h-80 w-full" />
          </div>
        </SurfaceCard>
        <SkeletonBlock className="h-[26rem] w-full rounded-[1.75rem]" />
      </div>
    </main>
  );
}
