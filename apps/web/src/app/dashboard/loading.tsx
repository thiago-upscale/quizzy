import { SkeletonBlock, SurfaceCard } from "@/components/phase-one-ui";

export default function Loading() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f7fafc_0%,_#eef7ff_100%)] px-6 py-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <SurfaceCard className="space-y-4">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="h-10 w-full max-w-3xl" />
          <SkeletonBlock className="h-5 w-full max-w-2xl" />
        </SurfaceCard>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SkeletonBlock className="h-32 w-full" />
          <SkeletonBlock className="h-32 w-full" />
          <SkeletonBlock className="h-32 w-full" />
          <SkeletonBlock className="h-32 w-full" />
        </div>
        <SurfaceCard className="space-y-4">
          <SkeletonBlock className="h-4 w-36" />
          <SkeletonBlock className="h-8 w-64" />
          <SkeletonBlock className="h-16 w-full" />
        </SurfaceCard>
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <SkeletonBlock className="h-80 w-full rounded-[1.75rem]" />
          <SkeletonBlock className="h-80 w-full rounded-[1.75rem]" />
        </div>
        <SkeletonBlock className="h-64 w-full rounded-[1.75rem]" />
      </div>
    </main>
  );
}
