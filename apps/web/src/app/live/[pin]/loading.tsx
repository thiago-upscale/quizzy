import { SkeletonBlock } from "@/components/phase-one-ui";

export default function Loading() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#10233f_0%,_#0f766e_100%)] px-6 py-10">
      <div className="mx-auto flex min-h-[80vh] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full gap-6 rounded-[2rem] border border-white/10 bg-white/10 p-8 backdrop-blur lg:grid-cols-[1fr_0.92fr]">
          <div className="space-y-5">
            <SkeletonBlock className="h-14 w-32 rounded-xl" />
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="h-12 w-full max-w-xl" />
            <SkeletonBlock className="h-20 w-full max-w-2xl" />
            <div className="grid gap-3 sm:grid-cols-3">
              <SkeletonBlock className="h-24 w-full" />
              <SkeletonBlock className="h-24 w-full" />
              <SkeletonBlock className="h-24 w-full" />
            </div>
          </div>
          <div className="rounded-[1.85rem] bg-white p-6">
            <div className="space-y-4">
              <SkeletonBlock className="h-4 w-28" />
              <SkeletonBlock className="h-10 w-48" />
              <SkeletonBlock className="h-16 w-full" />
              <SkeletonBlock className="h-56 w-full" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
