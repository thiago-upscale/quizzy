import { SkeletonBlock, SurfaceCard } from "@/components/phase-one-ui";

export default function Loading() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f7fafc_0%,_#eef7ff_100%)] px-6 py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <SurfaceCard className="space-y-4">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-10 w-72" />
          <SkeletonBlock className="h-5 w-full max-w-2xl" />
          <div className="grid gap-3 sm:grid-cols-3">
            <SkeletonBlock className="h-28 w-full" />
            <SkeletonBlock className="h-28 w-full" />
            <SkeletonBlock className="h-28 w-full" />
          </div>
        </SurfaceCard>
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <SurfaceCard className="space-y-4">
            <SkeletonBlock className="h-4 w-20" />
            <SkeletonBlock className="h-8 w-52" />
            <SkeletonBlock className="h-5 w-full max-w-xl" />
            <SkeletonBlock className="h-52 w-full" />
          </SurfaceCard>
          <div className="grid gap-4">
            <SurfaceCard className="space-y-4">
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="h-8 w-60" />
              <SkeletonBlock className="h-40 w-full" />
            </SurfaceCard>
            <SurfaceCard className="space-y-4">
              <SkeletonBlock className="h-4 w-24" />
              <SkeletonBlock className="h-8 w-36" />
              <SkeletonBlock className="h-24 w-full" />
            </SurfaceCard>
          </div>
        </div>
      </div>
    </main>
  );
}
